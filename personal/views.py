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
# Imports de tus apps
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

    # 2. CARGA MASIVA (ROBUSTA)
    @action(detail=False, methods=['post'], url_path='upload')
    def upload_excel(self, request):
        file = request.FILES.get('file')
        if not file: return Response({'error': 'Falta archivo.'}, 400)

        # 1. Determinar Empresa (Igual que antes...)
        # ... (Tu código de validación de empresa aquí) ...
        # Supongamos que ya tenemos 'empresa_obj'

        # 2. Cargar Catálogos en Memoria (Optimización)
        sucursales = {s.nombre.strip().upper(): s for s in Sucursal.objects.filter(empresa=empresa_obj)}
        deptos = {d.nombre.strip().upper(): d for d in Departamento.objects.filter(sucursal__empresa=empresa_obj)}
        puestos = {p.nombre.strip().upper(): p for p in Puesto.objects.filter(empresa=empresa_obj)}
        turnos = {t.nombre.strip().upper(): t for t in Turno.objects.filter(empresa=empresa_obj)}
        matriz = Sucursal.objects.filter(empresa=empresa_obj, es_matriz=True).first()

        try:
            if file.name.endswith('.csv'): df = pd.read_csv(file)
            else: df = pd.read_excel(file)
            
            df.columns = df.columns.str.strip().str.upper() # Todo mayúsculas para estandarizar
            reporte = {'total': 0, 'creados': 0, 'errores': []}

            for index, row in df.iterrows():
                reporte['total'] += 1
                fila = index + 2
                
                # --- A. Extracción Segura de Datos ---
                cedula = str(row.get('CEDULA', '')).strip()
                email = str(row.get('EMAIL', '')).strip()
                nombres = str(row.get('NOMBRES', '')).strip()
                
                if not cedula or not email or not nombres:
                    reporte['errores'].append(f"Fila {fila}: Datos obligatorios incompletos.")
                    continue

                if User.objects.filter(username=email).exists():
                    reporte['errores'].append(f"Fila {fila}: Email {email} ya registrado.")
                    continue

                # --- B. Resolución de Relaciones (Inteligencia) ---
                suc_txt = str(row.get('SUCURSAL', '')).strip().upper()
                dep_txt = str(row.get('DEPARTAMENTO', '')).strip().upper()
                pto_txt = str(row.get('CARGO', '')).strip().upper()
                tur_txt = str(row.get('TURNO', '')).strip().upper()
                
                suc_obj = sucursales.get(suc_txt, matriz)
                dep_obj = deptos.get(dep_txt, None) # Si no existe, queda NULL (Empleado sin depto)
                pto_obj = puestos.get(pto_txt, None)
                
                # Lógica Turno: Si ponen algo raro, no asignamos turno (mejor que asignar uno mal)
                tur_obj = turnos.get(tur_txt, None) 

                # --- C. Datos Avanzados ---
                # Rol: Validamos que sea uno permitido
                rol_input = str(row.get('ROL (EMPLEADO/GERENTE/RRHH)', 'EMPLEADO')).strip().upper()
                # Limpiamos el texto por si el usuario puso "Rol: Gerente"
                rol_final = 'EMPLEADO'
                if 'GERENTE' in rol_input: rol_final = 'GERENTE'
                elif 'RRHH' in rol_input: rol_final = 'RRHH'
                elif 'ADMIN' in rol_input: rol_final = 'ADMIN'

                # Sueldo
                try: sueldo_final = float(str(row.get('SUELDO', '460')).replace(',', '.'))
                except: sueldo_final = 460.00

                # Fecha Ingreso
                fecha_ingreso = row.get('FECHA_INGRESO (AAAA-MM-DD)')
                if pd.isna(fecha_ingreso) or str(fecha_ingreso).strip() == '':
                    fecha_ingreso = timezone.now().date()
                
                # Es Líder?
                es_lider = str(row.get('ES_LIDER_DEPTO (SI/NO)', 'NO')).strip().upper() == 'SI'

                try:
                    with transaction.atomic():
                        # 1. Crear User
                        user = User.objects.create_user(
                            username=email, 
                            email=email, 
                            password=cedula, # Password inicial
                            first_name=nombres.split()[0]
                        )
                        
                        # 2. Crear Empleado
                        empleado = Empleado.objects.create(
                            empresa=empresa_obj,
                            usuario=user,
                            nombres=nombres,
                            apellidos=str(row.get('APELLIDOS', '')),
                            documento=cedula,
                            email=email,
                            telefono=str(row.get('TELEFONO', '')),
                            sucursal=suc_obj,
                            departamento=dep_obj,
                            puesto=pto_obj,
                            turno_asignado=tur_obj,
                            rol=rol_final,
                            sueldo=sueldo_final,
                            fecha_ingreso=fecha_ingreso,
                            saldo_vacaciones=15, # Default legal
                            estado='ACTIVO'
                        )

                        # 3. Lógica de Liderazgo (VINCULACIÓN AUTOMÁTICA)
                        # Si dice que es líder Y tiene departamento asignado
                        if es_lider and dep_obj:
                            if empleado.rol != 'GERENTE':
                                empleado.rol = 'GERENTE'
                                empleado.save()
                            dep_obj.jefe = empleado
                            dep_obj.save()

                        reporte['creados'] += 1

                except Exception as e:
                    reporte['errores'].append(f"Fila {fila}: {str(e)}")

            return Response(reporte)

        except Exception as e:
            return Response({'error': f'Error procesando archivo: {str(e)}'}, 400)

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
