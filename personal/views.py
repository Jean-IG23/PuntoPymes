import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User, Group
from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import F
from asistencia import serializers
from .utils import notificar_solicitud
import io
from django.http import HttpResponse
from core.models import Sucursal, Departamento, Puesto, Turno, Empresa
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    SolicitudSerializer, TipoAusenciaSerializer
)
# =========================================================================
# 1. VIEWSET DE EMPLEADOS
# =========================================================================
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Empleado.objects.all().order_by('-id')

        # 1. SUPERADMIN
        if user.is_superuser:
            empresa_id = self.request.query_params.get('empresa')
            if empresa_id:
                queryset = queryset.filter(empresa_id=empresa_id)
            return queryset

        # 2. STAFF EMPRESA
        try:
            perfil = Empleado.objects.get(usuario=user)
            
            # RRHH / DUEÑO: Ven todo
            if perfil.rol in ['ADMIN', 'CLIENTE', 'RRHH']:
                queryset = queryset.filter(empresa=perfil.empresa)

            # GERENTE: Solo su departamento
            elif perfil.rol == 'GERENTE':
                if perfil.departamento:
                    queryset = queryset.filter(
                        empresa=perfil.empresa,
                        departamento=perfil.departamento
                    )
                else:
                    return Empleado.objects.none()

            # EMPLEADO: Solo a sí mismo
            else:
                queryset = queryset.filter(id=perfil.id)

            # Filtros extra
            dept_id = self.request.query_params.get('departamento')
            if dept_id: 
                queryset = queryset.filter(departamento_id=dept_id)
                
            return queryset

        except Empleado.DoesNotExist:
            return Empleado.objects.none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            try:
                perfil = Empleado.objects.get(usuario=request.user)
                if perfil.rol in ['GERENTE', 'EMPLEADO']:
                    return Response({'error': 'No tienes permisos para contratar.'}, status=403)
            except:
                return Response({'error': 'Usuario no autorizado.'}, status=403)

        data = request.data.copy()
        email = data.get('email')
        documento = data.get('documento')
        
        if 'fecha_ingreso' not in data or not data['fecha_ingreso']:
            data['fecha_ingreso'] = timezone.now().date()

        try:
            with transaction.atomic():
                user = None
                if email:
                    if User.objects.filter(username=email).exists():
                        return Response({"error": f"El usuario {email} ya existe."}, status=400)
                    
                    password = documento if documento else "TalentTrack2026"
                    user = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        first_name=data.get('nombres', ''),
                        last_name=data.get('apellidos', '')
                    )

                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                serializer.save(usuario=user)

                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        # Columnas requeridas
        columns = [
            'CEDULA', 'NOMBRES', 'APELLIDOS', 'EMAIL', 'TELEFONO', 
            'SUCURSAL', 'DEPARTAMENTO', 'CARGO', 'TURNO', 
            'SUELDO', 'FECHA_INGRESO (AAAA-MM-DD)', 'ROL (EMPLEADO/GERENTE/RRHH)', 'ES_LIDER_DEPTO (SI/NO)'
        ]
        # Crear DataFrame vacío y convertir a Excel
        df = pd.DataFrame(columns=columns)
        buffer = io.BytesIO()
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Plantilla Empleados')
            
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename=plantilla_empleados.xlsx'
        return response

    # 2. CARGA MASIVA 
    @action(detail=False, methods=['POST'], url_path='importar_excel') 
    def upload_excel(self, request):
        print("--- CARGA MASIVA: VERSIÓN BLINDADA (SIN BASURA) ---")

        try:
            empleado_uploader = Empleado.objects.get(usuario=request.user)
            empresa_obj = empleado_uploader.empresa
        except Empleado.DoesNotExist:
            return Response({'error': 'Usuario sin perfil.'}, status=403)

        file = request.FILES.get('file')
        if not file: return Response({'error': 'Falta archivo.'}, 400)

        # Cargar catálogos
        sucursales = {s.nombre.strip().upper(): s for s in Sucursal.objects.filter(empresa=empresa_obj)}
        deptos = {d.nombre.strip().upper(): d for d in Departamento.objects.filter(sucursal__empresa=empresa_obj)}
        puestos = {p.nombre.strip().upper(): p for p in Puesto.objects.filter(empresa=empresa_obj)}
        turnos = {t.nombre.strip().upper(): t for t in Turno.objects.filter(empresa=empresa_obj)}
        matriz = Sucursal.objects.filter(empresa=empresa_obj, es_matriz=True).first()

        try:
            # --- 1. DETECCIÓN DE FORMATO ---
            sep = ',' 
            if file.name.endswith('.csv'):
                try:
                    df_test = pd.read_csv(file, header=None, nrows=5, sep=';')
                    if len(df_test.columns) > 1: sep = ';'
                except: pass
            
            # --- 2. LEER DATOS ---
            # Leemos TODO como string para evitar conversiones raras
            if file.name.endswith('.csv'):
                df_preview = pd.read_csv(file, header=None, nrows=10, sep=sep, dtype=str)
            else:
                df_preview = pd.read_excel(file, header=None, nrows=10, dtype=str)

            # Buscar cabecera
            keywords = ['CEDULA', 'CÉDULA', 'DNI', 'DOCUMENTO', 'NOMBRES', 'NOMBRE']
            header_idx = 0
            for i, row in df_preview.iterrows():
                row_str = str(row.values).upper()
                if any(k in row_str for k in keywords):
                    header_idx = i
                    break
            
            file.seek(0)
            if file.name.endswith('.csv'):
                df = pd.read_csv(file, header=header_idx, sep=sep, dtype=str)
            else:
                df = pd.read_excel(file, header=header_idx, dtype=str)

            df.dropna(how='all', inplace=True)
            # Limpiamos nombres de columnas
            df.columns = df.columns.astype(str).str.strip().str.upper()

            # --- 3. MAPEO INTELIGENTE (EVITANDO DUPLICADOS) ---
            mapa = {
                'CEDULA': ['CEDULA', 'CÉDULA', 'DNI', 'DOCUMENTO', 'ID', 'IDENTIFICACION', 'CED'],
                'NOMBRES': ['NOMBRES', 'NOMBRE', 'NAME'],
                'APELLIDOS': ['APELLIDOS', 'APELLIDO', 'LAST NAME'],
                'EMAIL': ['EMAIL', 'CORREO', 'MAIL'],
                'SUCURSAL': ['SUCURSAL', 'SEDE', 'OFICINA'],
                'DEPARTAMENTO': ['DEPARTAMENTO', 'DEPTO', 'AREA'],
                'CARGO': ['CARGO', 'PUESTO', 'ROL'],
                'TURNO': ['TURNO', 'HORARIO'],
                'SUELDO': ['SUELDO', 'SALARIO'],
                'ES_LIDER_DEPTO': ['ES_LIDER_DEPTO', 'LIDER', 'JEFE']
            }

            cols_found = {}
            used_standards = set() # <--- NUEVO: Para no repetir columnas destino

            for col in df.columns:
                clean_col = col.replace('"', '').replace(';', '').strip()
                match = None
                for std, variants in mapa.items():
                    # Si ya encontramos una columna para este campo, saltamos (Evita duplicados)
                    if std in used_standards: continue 
                    
                    if clean_col in variants or any(v in clean_col for v in variants):
                        match = std
                        break
                
                if match:
                    cols_found[col] = match
                    used_standards.add(match)
            
            df.rename(columns=cols_found, inplace=True)

            if 'CEDULA' not in df.columns or 'NOMBRES' not in df.columns:
                 return Response({'error': f'Columnas no reconocidas. Detectadas: {df.columns.tolist()}'}, status=400)

            # --- 4. PROCESAR FILAS (CON LIMPIEZA DE BASURA PANDAS) ---
            reporte = {'total': 0, 'creados': 0, 'errores': []}

            for index, row in df.iterrows():
                reporte['total'] += 1
                fila_num = index + header_idx + 2
                
                # --- FUNCIÓN DE EXTRACCIÓN SEGURA ---
                def get_val(col):
                    val = row.get(col, '')
                    
                    # 1. Si Pandas devuelve una Serie (duplicados), tomamos el primero
                    if isinstance(val, pd.Series):
                        val = val.iloc[0]
                    
                    val = str(val).strip()
                    
                    # 2. Limpieza de "Basura Pandas" (dtype: object...)
                    if 'dtype:' in val or 'Name:' in val:
                        # Intentamos recuperar el valor real si se mezcló
                        # Esto suele pasar si se convirtió a string una Serie completa
                        return '' 

                    return '' if val.lower() in ['nan', 'none', 'nat'] else val
                # ------------------------------------

                cedula = get_val('CEDULA')[:20] # Cortar por seguridad
                nombres = get_val('NOMBRES')

                if not cedula or not nombres:
                    continue # Saltar filas vacías sin reportar error masivo

                if Empleado.objects.filter(documento=cedula, empresa=empresa_obj).exists():
                    reporte['errores'].append(f"Fila {fila_num}: Cédula {cedula} ya existe.")
                    continue

                email = get_val('EMAIL')
                if not email:
                     clean_name = nombres.split()[0].lower()
                     clean_doc = cedula[-4:] if len(cedula)>4 else '0000'
                     email = f"{clean_name}.{clean_doc}@empresa.com"

                # Relaciones
                suc_obj = sucursales.get(get_val('SUCURSAL').upper(), matriz)
                
                dep_txt = get_val('DEPARTAMENTO').upper() or 'GENERAL'
                dep_obj = deptos.get(dep_txt)
                if not dep_obj:
                     dep_obj = Departamento.objects.create(
                         sucursal=suc_obj if suc_obj else matriz, 
                         nombre=dep_txt.title()
                     )
                     deptos[dep_txt] = dep_obj

                pto_txt = get_val('CARGO').upper() or 'OPERATIVO'
                pto_obj = puestos.get(pto_txt)
                if not pto_obj:
                     pto_obj = Puesto.objects.create(
                         empresa=empresa_obj, 
                         nombre=pto_txt.title()
                     )
                     puestos[pto_txt] = pto_obj

                tur_obj = turnos.get(get_val('TURNO').upper())
                es_lider = get_val('ES_LIDER_DEPTO').upper() in ['SI', 'S', 'TRUE', 'YES']
                
                sueldo = 460.0
                try: sueldo = float(get_val('SUELDO').replace(',', '.'))
                except: pass

                try:
                    with transaction.atomic():
                        if User.objects.filter(username=email).exists():
                             import random
                             email = f"{random.randint(10,99)}{email}"

                        user = User.objects.create_user(
                            username=email, 
                            email=email, 
                            password=cedula, 
                            first_name=nombres.split()[0]
                        )
                        
                        emp = Empleado.objects.create(
                            empresa=empresa_obj, 
                            usuario=user, 
                            nombres=nombres, 
                            apellidos=get_val('APELLIDOS'),
                            documento=cedula, 
                            email=email, 
                            telefono=get_val('TELEFONO')[:40], # Corte de seguridad
                            sucursal=suc_obj, 
                            departamento=dep_obj, 
                            puesto=pto_obj, 
                            turno_asignado=tur_obj,
                            rol='GERENTE' if es_lider else 'EMPLEADO', 
                            sueldo=sueldo, 
                            fecha_ingreso=timezone.now().date(), 
                            estado='ACTIVO', 
                            saldo_vacaciones=15
                        )
                        if es_lider:
                            dep_obj.jefe = emp
                            dep_obj.save()
                        
                        reporte['creados'] += 1
                except Exception as e:
                    reporte['errores'].append(f"Fila {fila_num}: Error BD {str(e)}")

            return Response(reporte)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error interno: {str(e)}'}, 400)

# =========================================================================
# 2. VIEWSET DE CONTRATOS
# =========================================================================
class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()  
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Contrato.objects.all()
        if user.is_superuser: return queryset
        
        try:
            perfil = Empleado.objects.get(usuario=user)
            if perfil.rol in ['ADMIN', 'RRHH']:
                return queryset.filter(empresa=perfil.empresa)
            return queryset.filter(empleado=perfil)
        except: return Contrato.objects.none()


# =========================================================================
# 3. VIEWSET DE SOLICITUDES 
# =========================================================================
class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all()
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 1. SuperAdmin Técnico (SaaS) -> Ve absolutamente todo
        if user.is_superuser:
            return SolicitudAusencia.objects.all().order_by('-fecha_inicio')

        try:
            perfil = Empleado.objects.get(usuario=user)
            
            # 2. RRHH / Dueño / Admin de Empresa -> Ve TODO de SU empresa
            if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
                return SolicitudAusencia.objects.filter(
                    empresa=perfil.empresa
                ).order_by('-fecha_inicio')

            # 3. Gerente -> Ve lo suyo + lo de su departamento
            elif perfil.rol == 'GERENTE':
                if perfil.departamento:
                    # Lógica: (Es mío) O (Es de alguien de mi depto Y de mi empresa)
                    return SolicitudAusencia.objects.filter(
                        Q(empleado=perfil) | 
                        Q(empleado__departamento=perfil.departamento)
                    ).filter(empresa=perfil.empresa).distinct().order_by('-fecha_inicio')
                
                # Si es Gerente pero no tiene depto asignado, solo ve lo suyo
                return SolicitudAusencia.objects.filter(empleado=perfil).order_by('-fecha_inicio')
            
            # 4. Empleado Normal -> Ve solo lo suyo
            return SolicitudAusencia.objects.filter(empleado=perfil).order_by('-fecha_inicio')

        except Empleado.DoesNotExist:
            return SolicitudAusencia.objects.none()
            
    def perform_create(self, serializer):
        user = self.request.user
        try:
            empleado = Empleado.objects.get(usuario=user)
            dias = serializer.context.get('dias_calculados', 0)
            serializer.save(
                empleado=empleado,
                empresa=empleado.empresa,
                dias_solicitados=dias
            )
        except Empleado.DoesNotExist:
            raise serializers.ValidationError("El usuario no tiene ficha de empleado.")

    # 3. GESTIÓN (APROBAR / RECHAZAR) - VERSIÓN ÚNICA Y CORRECTA
    @action(detail=True, methods=['post'])
    def gestionar(self, request, pk=None):
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        comentario = request.data.get('comentario_jefe', '')

        if nuevo_estado not in ['APROBADA', 'RECHAZADA']:
            return Response({'error': 'Estado inválido.'}, status=400)

        # --- A. VERIFICAR PERMISOS ---
        try:
            aprobador = Empleado.objects.get(usuario=request.user)
            es_rrhh = aprobador.rol in ['ADMIN', 'RRHH', 'CLIENTE']
            es_jefe_directo = (
                aprobador.rol == 'GERENTE' and 
                aprobador.departamento == solicitud.empleado.departamento and
                aprobador.id != solicitud.empleado.id
            )

            if not (es_rrhh or es_jefe_directo or request.user.is_superuser):
                return Response({'error': 'No tienes permisos para gestionar esta solicitud.'}, status=403)

        except Empleado.DoesNotExist:
            if not request.user.is_superuser:
                return Response({'error': 'Usuario no autorizado.'}, status=403)

        # --- B. LÓGICA DE SALDOS (ATÓMICA) ---
        # Detectamos si es vacaciones (singular o plural, mayúsculas o minúsculas)
        nombre_tipo = solicitud.tipo_ausencia.nombre.lower()
        es_vacaciones = 'vacacion' in nombre_tipo # Detecta "Vacaciones" y "Vacación"
        
        if nuevo_estado == 'APROBADA' and es_vacaciones:
            # 1. Asegurar que tenemos los días (Calculamos por si acaso es 0 en BD)
            from core.utils import calcular_dias_habiles
            dias_a_descontar = solicitud.dias_solicitados
            
            # Si por error vino 0, recalculamos usando las fechas
            if dias_a_descontar <= 0:
                dias_a_descontar = calcular_dias_habiles(solicitud.fecha_inicio, solicitud.fecha_fin)
                # Actualizamos el dato en la solicitud también
                solicitud.dias_solicitados = dias_a_descontar

            # 2. Validar Saldo Actual
            # Refrescamos el empleado desde la BD para tener el dato exacto
            solicitud.empleado.refresh_from_db()
            saldo_actual = solicitud.empleado.saldo_vacaciones or 0
            
            if saldo_actual < dias_a_descontar:
                return Response({
                    'error': f'Saldo insuficiente. Tiene {saldo_actual} días, la solicitud requiere {dias_a_descontar}.'
                }, status=400)
            
            # 3. RESTA ATÓMICA (La parte clave)
            # Esto le dice a la BD: "Toma el valor que tengas y réstale X"
            Empleado.objects.filter(pk=solicitud.empleado.id).update(
                saldo_vacaciones=F('saldo_vacaciones') - dias_a_descontar
            )

        # Guardar cambio de estado
        solicitud.estado = nuevo_estado
        solicitud.motivo_rechazo = comentario if nuevo_estado == 'RECHAZADA' else ''
        solicitud.aprobado_por = aprobador if not request.user.is_superuser else None
        solicitud.fecha_resolucion = timezone.now().date()
        solicitud.save()

        return Response({'status': f'Solicitud {nuevo_estado} correctamente. Se descontaron {dias_a_descontar if nuevo_estado=="APROBADA" and es_vacaciones else 0} días.'})


# =========================================================================
# 4. VIEWSET DE DOCUMENTOS
# =========================================================================
class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all()
    serializer_class = DocumentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = DocumentoEmpleado.objects.all()
        if user.is_superuser: return queryset
        
        try:
            perfil = Empleado.objects.get(usuario=user)
            if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
                return queryset.filter(empresa=perfil.empresa)
            return queryset.filter(empleado=perfil)
        except: return DocumentoEmpleado.objects.none()


# =========================================================================
# 5. VIEWSET DE TIPOS DE AUSENCIA
# =========================================================================
class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all()
    serializer_class = TipoAusenciaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return TipoAusencia.objects.all()
        
        try:
            empleado = Empleado.objects.get(usuario=user)
            return TipoAusencia.objects.filter(empresa=empleado.empresa)
        except Empleado.DoesNotExist:
            return TipoAusencia.objects.none()

    def perform_create(self, serializer):
        try:
            empleado = Empleado.objects.get(usuario=self.request.user)
            if empleado.rol not in ['ADMIN', 'RRHH', 'CLIENTE']:
                raise PermissionError("Solo los administradores pueden configurar tipos de ausencia.")
            serializer.save(empresa=empleado.empresa)
        except Empleado.DoesNotExist:
            raise ValueError("Usuario sin perfil de empleado.")
