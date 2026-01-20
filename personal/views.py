import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models.signals import post_save
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q, F, Sum
from django.utils import timezone
import io
from django.http import HttpResponse

# Imports locales
from .utils import notificar_solicitud 
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia
from .serializers import (
    CargaMasivaEmpleadoSerializer, EmpleadoSerializer, ContratoSerializer, 
    DocumentoSerializer, SolicitudSerializer, TipoAusenciaSerializer
)

# =========================================================================
# 1. VIEWSET DE EMPLEADOS
# =========================================================================
# En src/personal/views.py

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all().order_by('-id')
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 1. BASE: Empezamos con NADA (Seguridad por defecto)
        queryset = Empleado.objects.none()

        # 2. IDENTIFICAR EMPRESA
        mi_empresa = None
        
        if user.is_superuser:
            # Caso A: SuperUser.
            # Intentamos ver si tiene perfil de empleado (para ver SU propia empresa)
            try:
                perfil = Empleado.objects.get(usuario=user)
                mi_empresa = perfil.empresa
            except Empleado.DoesNotExist:
                # Si es SuperUser puro sin perfil, NO ve nada en esta vista.
                return Empleado.objects.none()
        else:
            # Caso B: Usuario Normal.
            try:
                perfil = Empleado.objects.get(usuario=user)
                mi_empresa = perfil.empresa
            except Empleado.DoesNotExist:
                return Empleado.objects.none()

        # 3. APLICAR FILTRO MAESTRO (Si encontramos empresa)
        if mi_empresa:
            queryset = Empleado.objects.filter(empresa=mi_empresa).order_by('-id')
        else:
            return Empleado.objects.none()

        # -------------------------------------------------------------
        # 🔍 FILTROS ADICIONALES (Solo aplican sobre el queryset ya filtrado)
        # -------------------------------------------------------------
        
        # Filtro por Departamento
        depto_id = self.request.query_params.get('departamento')
        if depto_id:
            queryset = queryset.filter(departamento_id=depto_id)

        # Filtro por Sucursal
        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            queryset = queryset.filter(sucursal_id=sucursal_id)

        # Búsqueda por texto
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(nombres__icontains=search) | 
                Q(apellidos__icontains=search) |
                Q(documento__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset

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
        columns = [
            'CEDULA', 'NOMBRES', 'APELLIDOS', 'EMAIL', 'TELEFONO', 
            'SUCURSAL', 'DEPARTAMENTO', 'CARGO', 'TURNO', 
            'SUELDO', 'FECHA_INGRESO (AAAA-MM-DD)', 'ROL (EMPLEADO/GERENTE/RRHH)', 'ES_LIDER_DEPTO (SI/NO)'
        ]
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
        print("--- CARGA MASIVA: INICIANDO ---")
        
        file = request.FILES.get('file')
        if not file: return Response({'error': 'Falta archivo.'}, 400)

        # 1. DETERMINAR EMPRESA DESTINO (Contexto de Seguridad)
        empresa_destino = None
        
        if request.user.is_superuser:
            # Si soy Superadmin, DEBO decir para qué empresa es este Excel
            empresa_id = request.data.get('empresa_id')
            if not empresa_id:
                return Response({'error': 'Superadmin debe enviar "empresa_id"'}, 400)
            try:
                empresa_destino = Empresa.objects.get(pk=empresa_id)
            except Empresa.DoesNotExist:
                return Response({'error': 'Empresa no encontrada'}, 404)
        else:
            # Si soy cliente, uso MI empresa
            try:
                perfil = Empleado.objects.get(usuario=request.user)
                empresa_destino = perfil.empresa
            except Empleado.DoesNotExist:
                return Response({'error': 'Usuario sin perfil de empleado.'}, 403)

        try:
            # 2. Lectura del Archivo
            if file.name.endswith('.csv'):
                df = pd.read_csv(file, dtype=str)
            else:
                df = pd.read_excel(file, dtype=str)

            # Limpieza básica de cabeceras
            df.columns = df.columns.str.lower().str.strip()
            df.dropna(how='all', inplace=True)

            # Mapa de Columnas (Igual que tenías)
            mapa_traduccion = {
                'documento': ['cedula', 'cédula', 'dni', 'identificacion', 'id', 'documento'],
                'nombres': ['nombres', 'nombre', 'name'],
                'apellidos': ['apellidos', 'apellido', 'last name'],
                'email': ['email', 'correo', 'mail'],
                'nombre_sucursal': ['sucursal', 'sede', 'oficina'],
                'nombre_area': ['area', 'área', 'zona'],
                'nombre_departamento': ['departamento', 'depto'],
                'nombre_puesto': ['cargo', 'puesto', 'rol'],
                'es_supervisor_puesto': ['es_supervisor', 'supervisor', 'jefe'],
                'nombre_turno': ['turno', 'horario', 'jornada'],
                'rol': ['rol', 'perfil'],
                'fecha_ingreso': ['fecha_ingreso', 'ingreso', 'fecha inicio'],
                'sueldo': ['sueldo', 'salario']
            }

            cols_renombradas = {}
            usadas = set()
            for col_real in df.columns:
                for col_destino, variantes in mapa_traduccion.items():
                    if col_real in variantes and col_destino not in usadas:
                        cols_renombradas[col_real] = col_destino
                        usadas.add(col_destino)
                        break
            
            df.rename(columns=cols_renombradas, inplace=True)

            errores = []
            creados = 0

            # Desconectar Signals para evitar spam de correos al crear usuarios
            receivers = post_save._live_receivers(User)
            for receiver in receivers:
                post_save.disconnect(receiver, sender=User)

            with transaction.atomic():
                for index, row in df.iterrows():
                    fila_num = index + 2
                    sid = transaction.savepoint() 
                    
                    try:
                        # Helpers de limpieza de celdas
                        def clean_str(val):
                            s = str(val).strip()
                            return '' if s.lower() in ['nan', 'nat', 'none', 'null'] else s

                        def clean_date(val):
                            s = clean_str(val)
                            if not s: return timezone.now().date()
                            try: return pd.to_datetime(s).date() 
                            except: return timezone.now().date()

                        def clean_decimal(val):
                            s = clean_str(val).replace('$','').replace(' ','')
                            if not s: return 0
                            if ',' in s and '.' in s: s = s.replace('.','').replace(',','.')
                            elif ',' in s: s = s.replace(',','.')
                            try: return float(s)
                            except: return 0

                        # Extracción de Datos Crudos
                        data_row = {
                            'documento': clean_str(row.get('documento')),
                            'nombres': clean_str(row.get('nombres')),
                            'apellidos': clean_str(row.get('apellidos')),
                            'email': clean_str(row.get('email')),
                            'nombre_sucursal': clean_str(row.get('nombre_sucursal')),
                            'nombre_area': clean_str(row.get('nombre_area')),
                            'nombre_departamento': clean_str(row.get('nombre_departamento')),
                            'nombre_puesto': clean_str(row.get('nombre_puesto')),
                            'es_supervisor_puesto': clean_str(row.get('es_supervisor_puesto')).upper() in ['SI','S','TRUE','1'],
                            'nombre_turno': clean_str(row.get('nombre_turno')),
                            'rol': clean_str(row.get('rol')),
                            'fecha_ingreso': clean_date(row.get('fecha_ingreso')),
                            'sueldo': clean_decimal(row.get('sueldo'))
                        }

                        if not data_row['nombres'] or not data_row['documento']: continue 

                        # 👇 INYECTAMOS LA EMPRESA AL SERIALIZER
                        serializer = CargaMasivaEmpleadoSerializer(
                            data=data_row, 
                            context={'empresa_destino': empresa_destino} 
                        )
                        
                        if serializer.is_valid():
                            serializer.save()
                            creados += 1
                            transaction.savepoint_commit(sid)
                        else:
                            transaction.savepoint_rollback(sid)
                            errs = [f"{k}: {v[0]}" for k,v in serializer.errors.items()]
                            errores.append(f"Fila {fila_num}: {', '.join(errs)}")

                    except Exception as e:
                        transaction.savepoint_rollback(sid)
                        errores.append(f"Fila {fila_num}: Error interno - {str(e)}")

            return Response({"creados": creados, "errores": errores}, status=200)

        except Exception as e:
            return Response({"error": f"Error procesando archivo: {str(e)}"}, status=400)


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
        if user.is_superuser:
            return SolicitudAusencia.objects.all().order_by('-fecha_inicio')

        try:
            perfil = Empleado.objects.get(usuario=user)
            
            # 1. ADMIN / RRHH
            if perfil.rol in ['ADMIN', 'RRHH']:
                return SolicitudAusencia.objects.filter(empresa=perfil.empresa).order_by('-fecha_inicio')

            # 2. GERENTE
            if perfil.rol == 'GERENTE':
                # A. Jefe de Sucursal
                sucursales = perfil.sucursales_a_cargo.all()
                if sucursales.exists():
                    return SolicitudAusencia.objects.filter(
                        Q(empleado=perfil) | 
                        Q(empleado__sucursal__in=sucursales)
                    ).filter(empresa=perfil.empresa).distinct().order_by('-fecha_inicio')
                
                # B. Jefe de Departamento
                elif perfil.departamento:
                    return SolicitudAusencia.objects.filter(
                        Q(empleado=perfil) |
                        Q(empleado__departamento=perfil.departamento)
                    ).filter(empresa=perfil.empresa).distinct().order_by('-fecha_inicio')

            # 3. EMPLEADO NORMAL
            return SolicitudAusencia.objects.filter(empleado=perfil).order_by('-fecha_inicio')

        except Empleado.DoesNotExist:
            return SolicitudAusencia.objects.none()
            
    def perform_create(self, serializer):
        user = self.request.user
        try:
            empleado = Empleado.objects.get(usuario=user)
            data = serializer.validated_data
            
            inicio = data.get('fecha_inicio')
            fin = data.get('fecha_fin')
            tipo = data.get('tipo_ausencia')
            motivo = data.get('motivo', '').strip()
            
            hoy = timezone.now().date()

            # ==================================================================
            # 🛡️ NIVEL 1: VALIDACIONES DE SENTIDO COMÚN (Lógica Pura)
            # ==================================================================
            
            # 1. Fecha Fin menor a Fecha Inicio
            if inicio > fin:
                raise ValidationError({"error": "⛔ Error de Lógica: La fecha de finalización no puede ser antes que la de inicio."})

            # 2. Fechas Pasadas (Retroactividad)
            # Nota: Si permites justificar faltas pasadas, comenta este bloque.
            if inicio < hoy:
                 raise ValidationError({"error": "⏳ Error Temporal: No puedes solicitar permisos para fechas que ya pasaron."})

            # 3. Motivo muy corto
            if len(motivo) < 10:
                raise ValidationError({"error": "📝 Detalle Insuficiente: Por favor explica el motivo con al menos 10 caracteres."})

            # ==================================================================
            # 🛡️ NIVEL 2: VALIDACIONES DE DISPONIBILIDAD (Agenda)
            # ==================================================================

            # 4. Traslapes (Overlaps)
            # Verifica si YA existe una solicitud (Pendiente o Aprobada) que choque con estas fechas
            # Fórmula: (StartA <= EndB) and (EndA >= StartB)
            choque = SolicitudAusencia.objects.filter(
                empleado=empleado,
                estado__in=['PENDIENTE', 'APROBADA']
            ).filter(
                fecha_inicio__lte=fin,
                fecha_fin__gte=inicio
            )

            if choque.exists():
                conflicto = choque.first()
                rango = f"{conflicto.fecha_inicio.strftime('%d/%m')} al {conflicto.fecha_fin.strftime('%d/%m')}"
                raise ValidationError({
                    "error": f"📅 Agenda Ocupada: Ya tienes una solicitud registrada en el rango del {rango}."
                })

            # ==================================================================
            # 🛡️ NIVEL 3: VALIDACIONES FINANCIERAS (Saldo de Vacaciones)
            # ==================================================================

            # Calculamos días calendario (simple)
            # OJO: Si quieres excluir sábados/domingos, aquí iría una función compleja.
            dias_solicitados = (fin - inicio).days + 1
            
            # Solo si el tipo de permiso es "Vacaciones"
            if 'vacacion' in tipo.nombre.lower():
                
                saldo_actual = empleado.saldo_vacaciones or 0
                
                # 5. Cálculo de "Saldo Comprometido"
                # Sumamos los días de todas las solicitudes que están PENDIENTES de aprobar
                # Esto evita que el empleado pida 5 días dos veces rápidas teniendo solo 5 de saldo.
                dias_pendientes = SolicitudAusencia.objects.filter(
                    empleado=empleado,
                    estado='PENDIENTE',
                    tipo_ausencia__nombre__icontains='vacacion'
                ).aggregate(total=Sum('dias_solicitados'))['total'] or 0

                saldo_real_disponible = saldo_actual - dias_pendientes

                # 6. Validación Final de Saldo
                if dias_solicitados > saldo_real_disponible:
                    raise ValidationError({
                        "error": (
                            f"💰 Saldo Insuficiente.\n"
                            f"- Tienes en sistema: {saldo_actual} días.\n"
                            f"- Menos pendientes de aprobar: {dias_pendientes} días.\n"
                            f"- Disponible real: {saldo_real_disponible} días.\n"
                            f"Estás intentando pedir: {dias_solicitados} días."
                        )
                    })

            # ==================================================================
            # ✅ ÉXITO: GUARDAMOS
            # ==================================================================
            instance = serializer.save(
                empleado=empleado,
                empresa=empleado.empresa,
                dias_solicitados=dias_solicitados
            )
            
            notificar_solicitud(instance)

        except Empleado.DoesNotExist:
            raise ValidationError({"error": "Error Crítico: Tu usuario no tiene un perfil de empleado asociado."})

    # 3. GESTIÓN (APROBAR / RECHAZAR)
    @action(detail=True, methods=['post'])
    def gestionar(self, request, pk=None):
        with transaction.atomic(): # Transacción para evitar errores de concurrencia
            try:
                solicitud = SolicitudAusencia.objects.select_for_update().get(pk=pk)
            except SolicitudAusencia.DoesNotExist:
                return Response({'error': 'Solicitud no encontrada.'}, status=404)

            nuevo_estado = request.data.get('estado')
            comentario = request.data.get('comentario_jefe', '')

            if solicitud.estado != 'PENDIENTE':
                 return Response({'error': f'Esta solicitud ya fue {solicitud.estado} previamente.'}, status=400)

            # --- VERIFICAR PERMISOS (Igual que antes) ---
            aprobador = Empleado.objects.get(usuario=request.user)
            es_rrhh = aprobador.rol in ['ADMIN', 'RRHH', 'CLIENTE']
            es_jefe_directo = (aprobador.rol == 'GERENTE' and aprobador.departamento == solicitud.empleado.departamento and aprobador.id != solicitud.empleado.id)
            es_jefe_sucursal = aprobador.sucursales_a_cargo.filter(id=solicitud.empleado.sucursal.id).exists()

            if not (es_rrhh or es_jefe_directo or es_jefe_sucursal or request.user.is_superuser):
                return Response({'error': 'No tienes permisos.'}, status=403)

            # --- LÓGICA DE DESCUENTO DE SALDO AL APROBAR ---
            if nuevo_estado == 'APROBADA':
                nombre_tipo = solicitud.tipo_ausencia.nombre.lower()
                
                # Solo descontamos si es Vacación
                if 'vacacion' in nombre_tipo:
                    dias_a_descontar = solicitud.dias_solicitados
                    
                    # Verificación final de saldo (por si acaso)
                    solicitud.empleado.refresh_from_db()
                    if solicitud.empleado.saldo_vacaciones < dias_a_descontar:
                        return Response({'error': 'El empleado ya no tiene saldo suficiente.'}, status=400)

                    # Resta efectiva
                    Empleado.objects.filter(pk=solicitud.empleado.id).update(
                        saldo_vacaciones=F('saldo_vacaciones') - dias_a_descontar
                    )

            solicitud.estado = nuevo_estado
            solicitud.motivo_rechazo = comentario if nuevo_estado == 'RECHAZADA' else ''
            solicitud.aprobado_por = aprobador
            solicitud.fecha_resolucion = timezone.now().date()
            solicitud.save()

            return Response({'status': f'Solicitud {nuevo_estado} correctamente.'})


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