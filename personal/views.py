import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models.signals import post_save
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q, F, Sum, Count
from django.utils import timezone
import io
from django.http import HttpResponse

# Imports locales
from .utils import notificar_solicitud 
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia, Tarea   
from .serializers import (
    CargaMasivaEmpleadoSerializer, EmpleadoSerializer, ContratoSerializer, 
    DocumentoSerializer, SolicitudSerializer, TipoAusenciaSerializer, TareaSerializer
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

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me')
    def me(self, request):
        try:
            empleado = Empleado.objects.get(usuario=request.user)
            
            if request.method == 'GET':
                serializer = self.get_serializer(empleado)
                return Response(serializer.data)
            
            elif request.method in ['PUT', 'PATCH']:
                # Partial=True permite subir solo la foto sin enviar todo lo demás
                serializer = self.get_serializer(empleado, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=400)
                
        except Empleado.DoesNotExist:
            return Response({'error': 'Perfil no encontrado'}, status=404)

    # 👇 2. ACCIÓN: CAMBIAR CONTRASEÑA
    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            # Verificar contraseña anterior
            if not user.check_password(serializer.data['old_password']):
                return Response({'old_password': ['La contraseña actual es incorrecta.']}, status=400)
            
            # Guardar nueva contraseña
            user.set_password(serializer.data['new_password'])
            user.save()
            
            # Mantener sesión activa
            update_session_auth_hash(request, user)
            
            return Response({'message': 'Contraseña actualizada correctamente.'})
        
        return Response(serializer.errors, status=400)
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
            
            # 1. ADMIN / RRHH / CLIENTE (RRHH GLOBAL)
            if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
                return SolicitudAusencia.objects.filter(empresa=perfil.empresa).order_by('-fecha_inicio')

            # 2. GERENTE (LÍDER)
            if perfil.rol == 'GERENTE':
                sucursales = perfil.sucursales_a_cargo.all()
                
                # Construimos la query dinámica
                query = Q(empleado=perfil) # Siempre ver las suyas
                
                if sucursales.exists():
                    query |= Q(empleado__sucursal__in=sucursales)
                
                if perfil.departamento:
                    query |= Q(empleado__departamento=perfil.departamento)

                return SolicitudAusencia.objects.filter(query, empresa=perfil.empresa).distinct().order_by('-fecha_inicio')

            # 3. EMPLEADO NORMAL
            return SolicitudAusencia.objects.filter(empleado=perfil).order_by('-fecha_inicio')

        except Empleado.DoesNotExist:
            return SolicitudAusencia.objects.none()

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        try:
            empleado = Empleado.objects.select_related('empresa').get(usuario=user)
            data = serializer.validated_data
            
            inicio = data.get('fecha_inicio')
            fin = data.get('fecha_fin')
            tipo = data.get('tipo_ausencia')
            motivo = data.get('motivo', '').strip()
            hoy = timezone.now().date()

            # --- VALIDACIONES ---
            if inicio > fin:
                raise ValidationError({"error": "La fecha fin no puede ser anterior a la de inicio."})
            if inicio < hoy:
                 raise ValidationError({"error": "No puedes solicitar permisos para fechas pasadas."})

            # --- CÁLCULO DE DÍAS ---
            dias_calc = (fin - inicio).days + 1
            print(f"Calculando días para guardar: {dias_calc}") # DEBUG

            # --- VALIDACIÓN DE SALDO ---
            # Verificamos la bandera 'afecta_sueldo' del modelo
            if tipo.afecta_sueldo: 
                saldo_actual = empleado.saldo_vacaciones
                
                dias_pendientes = SolicitudAusencia.objects.filter(
                    empleado=empleado,
                    estado='PENDIENTE',
                    tipo_ausencia__afecta_sueldo=True
                ).aggregate(total=Sum('dias_solicitados'))['total'] or 0

                saldo_real = saldo_actual - dias_pendientes

                if dias_calc > saldo_real:
                    raise ValidationError({
                        "error": f"Saldo insuficiente. Tienes {saldo_actual}, pendientes {dias_pendientes}, solicitas {dias_calc}."
                    })

            # --- GUARDADO ---
            # 1. Guardamos la instancia normalmente
            instance = serializer.save(
                empleado=empleado,
                empresa=empleado.empresa,
                dias_solicitados=dias_calc # Ahora el serializer SÍ aceptará esto gracias al cambio en paso 1
            )
            
            # 2. DOBLE SEGURIDAD (Parche Nuclear)
            # Si por alguna razón el serializer falla, esto fuerza el valor en la BD directo.
            if instance.dias_solicitados != dias_calc:
                print(f"⚠️ CORRIGIENDO DÍAS EN BD: Era {instance.dias_solicitados}, forzando a {dias_calc}")
                instance.dias_solicitados = dias_calc
                instance.save(update_fields=['dias_solicitados'])

        except Empleado.DoesNotExist:
            raise ValidationError({"error": "No tienes perfil de empleado."})
    @action(detail=True, methods=['post'])
    def gestionar(self, request, pk=None):
        with transaction.atomic():
            try:
                solicitud = SolicitudAusencia.objects.select_for_update().get(pk=pk)
            except SolicitudAusencia.DoesNotExist:
                return Response({'error': 'Solicitud no encontrada.'}, status=404)

            nuevo_estado = request.data.get('estado')
            comentario = request.data.get('motivo_rechazo', request.data.get('comentario_jefe', ''))

            print(f"--- GESTIONANDO SOLICITUD #{pk} ---")
            print(f"Estado actual: {solicitud.estado}, Nuevo estado: {nuevo_estado}")

            if solicitud.estado != 'PENDIENTE':
                 return Response({'error': f'Esta solicitud ya fue procesada ({solicitud.estado}).'}, status=400)

            # --- PERMISOS (Simplificado para debug, pero mantenlo seguro) ---
            # ... (Tu lógica de permisos aquí está bien) ...

            # --- APROBACIÓN Y RESTA ---
            if nuevo_estado == 'APROBADA':
                nombre_tipo = solicitud.tipo_ausencia.nombre.lower()
                print(f"Tipo de ausencia: {nombre_tipo}")
                
                # VERIFICACIÓN ROBUSTA:
                # 1. Tiene flag afecta_sueldo? O
                # 2. El nombre contiene 'vacacion'?
                es_vacacion = solicitud.tipo_ausencia.afecta_sueldo or 'vacacion' in solicitud.tipo_ausencia.nombre.lower()
                
                print(f"¿Es vacación?: {es_vacacion}")

                if es_vacacion:
                    dias = solicitud.dias_solicitados
                    print(f"Días a descontar: {dias}")
                    
                    empleado_db = Empleado.objects.select_for_update().get(id=solicitud.empleado.id)
                    print(f"Saldo ANTES: {empleado_db.saldo_vacaciones}")

                    if empleado_db.saldo_vacaciones < dias:
                        return Response({'error': f'El empleado solo tiene {empleado_db.saldo_vacaciones} días.'}, status=400)

                    
                    empleado_db.saldo_vacaciones = F('saldo_vacaciones') - dias
                    empleado_db.save()
                    
                    # Confirmación en consola
                    empleado_db.refresh_from_db()
                    print(f"Saldo DESPUÉS: {empleado_db.saldo_vacaciones}")
                else:
                    print("NO SE RESTÓ SALDO: El tipo de ausencia no está marcado como vacación.")

            solicitud.estado = nuevo_estado
            solicitud.motivo_rechazo = comentario if nuevo_estado == 'RECHAZADA' else ''
            solicitud.aprobado_por = Empleado.objects.get(usuario=request.user) # Asegúrate que esto no falle
            solicitud.fecha_resolucion = timezone.now().date()
            solicitud.save()

            return Response({'status': f'Solicitud {nuevo_estado.lower()} correctamente.'})


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
class TareaViewSet(viewsets.ModelViewSet):
    serializer_class = TareaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Tarea.objects.all().select_related('asignado_a', 'creado_por')
        
        try:
            empleado = Empleado.objects.get(usuario=user)
            
            # FILTRO 1: Seguridad por Empresa (Siempre)
            queryset = queryset.filter(empresa=empleado.empresa)

            # FILTRO 2: Roles
            # Si es empleado normal, solo ve las que le asignaron a él
            if empleado.rol not in ['ADMIN', 'RRHH', 'GERENTE', 'SUPERADMIN']:
                queryset = queryset.filter(asignado_a=empleado)
            
            # FILTRO 3: Dashboard personal vs Gestión Global
            # Si el frontend manda ?mis_tareas=true, mostramos solo las mías (aunque sea jefe)
            if self.request.query_params.get('mis_tareas') == 'true':
                queryset = queryset.filter(asignado_a=empleado)

        except Empleado.DoesNotExist:
            return Tarea.objects.none()
            
        return queryset.order_by('-prioridad', 'fecha_limite')

    def perform_create(self, serializer):
        """Asigna automáticamente la empresa y el creador"""
        empleado = Empleado.objects.get(usuario=self.request.user)
        serializer.save(
            empresa=empleado.empresa,
            creado_por=self.request.user
        )

    def perform_update(self, serializer):
        """Si la tarea se marca como COMPLETADA, guardamos la fecha"""
        instance = serializer.save()
        if instance.estado == 'COMPLETADA' and not instance.completado_at:
            instance.completado_at = timezone.now()
            instance.save()
        elif instance.estado != 'COMPLETADA':
            instance.completado_at = None
            instance.save()
    @action(detail=False, methods=['get'])
    def ranking(self, request):
        """
        Devuelve el Top de empleados basado en puntos de tareas completadas.
        Filtro opcional: ?periodo=mes (por defecto histórico)
        """
        empleado_solicitante = Empleado.objects.get(usuario=request.user)
        empresa = empleado_solicitante.empresa

        # Base: Tareas completadas de la empresa
        queryset = Tarea.objects.filter(
            empresa=empresa, 
            estado='COMPLETADA'
        )

        # Filtro de fecha (Opcional: Implementar lógica de 'este mes')
        # ...

        # AGREGACIÓN (La magia de SQL)
        ranking = queryset.values(
            'asignado_a__id',
            'asignado_a__usuario__first_name',
            'asignado_a__usuario__last_name',
            'asignado_a__puesto__nombre'
        ).annotate(
            total_puntos=Sum('puntos_valor'),
            total_tareas=Count('id')
        ).order_by('-total_puntos') # Ordenar del más alto al más bajo

        return Response(ranking)