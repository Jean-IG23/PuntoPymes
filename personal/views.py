import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User, Group
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .utils import notificar_solicitud
# Imports de tus apps
from core.models import Sucursal, Departamento, Puesto, Turno, Empresa
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    SolicitudSerializer, TipoAusenciaSerializer
)

# =========================================================================
# 1. VIEWSET DE EMPLEADOS (El Maestro)
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
                    return Empleado.objects.none() # Gerente sin depto no ve nada

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
        # BLOQUEO A GERENTES/EMPLEADOS
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
                    # Asignar grupo si existe
                    # g = Group.objects.get(name='EMPLEADO')
                    # user.groups.add(g)

                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                serializer.save(usuario=user)

                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_excel(self, request):
        file = request.FILES.get('file')
        if not file: return Response({'error': 'No file.'}, 400)

        # Validar Permisos
        empresa_obj = None
        if request.user.is_superuser:
            emp_id = request.data.get('empresa_id')
            if not emp_id: return Response({'error': 'Falta empresa_id'}, 400)
            empresa_obj = get_object_or_404(Empresa, pk=emp_id)
        else:
            try:
                perfil = Empleado.objects.get(usuario=request.user)
                if perfil.rol in ['GERENTE', 'EMPLEADO']:
                    return Response({'error': 'Sin permisos.'}, 403)
                empresa_obj = perfil.empresa
            except:
                return Response({'error': 'Unauthorized'}, 403)

        # Cargar Catálogos
        sucursales_map = {s.nombre.upper().strip(): s for s in Sucursal.objects.filter(empresa=empresa_obj)}
        deptos_map = {d.nombre.upper().strip(): d for d in Departamento.objects.filter(sucursal__empresa=empresa_obj)}
        puestos_map = {p.nombre.upper().strip(): p for p in Puesto.objects.filter(empresa=empresa_obj)}
        turnos_map = {t.nombre.upper().strip(): t for t in Turno.objects.filter(empresa=empresa_obj)}
        matriz = Sucursal.objects.filter(empresa=empresa_obj, es_matriz=True).first()

        try:
            if file.name.endswith('.csv'): df = pd.read_csv(file)
            else: df = pd.read_excel(file)
            
            df.columns = df.columns.str.strip().str.lower()
            reporte = {'total': 0, 'exitosos': 0, 'errores': []}

            for index, row in df.iterrows():
                reporte['total'] += 1
                fila = index + 2
                
                # Datos
                cedula = str(row.get('cedula', '')).strip()
                nombres = str(row.get('nombres', '')).strip()
                email = str(row.get('email', '')).strip()
                
                if not cedula or not nombres or not email or email == 'nan':
                    reporte['errores'].append(f"Fila {fila}: Faltan datos.")
                    continue

                if User.objects.filter(username=email).exists():
                    reporte['errores'].append(f"Fila {fila}: Email existe.")
                    continue

                # Mapeo
                suc_obj = sucursales_map.get(str(row.get('sucursal', '')).upper().strip(), matriz)
                dep_obj = deptos_map.get(str(row.get('departamento', '')).upper().strip())
                pto_obj = puestos_map.get(str(row.get('cargo', '')).upper().strip())
                tur_obj = turnos_map.get(str(row.get('turno', '')).upper().strip())

                try:
                    with transaction.atomic():
                        user = User.objects.create_user(username=email, email=email, password=cedula, first_name=nombres.split()[0])
                        Empleado.objects.create(
                            empresa=empresa_obj, usuario=user, nombres=nombres, 
                            apellidos=str(row.get('apellidos', '')), documento=cedula, email=email,
                            telefono=str(row.get('telefono', '')), fecha_ingreso=timezone.now().date(),
                            sucursal=suc_obj, departamento=dep_obj, puesto=pto_obj, turno_asignado=tur_obj,
                            rol='EMPLEADO', estado='ACTIVO'
                        )
                        reporte['exitosos'] += 1
                except Exception as e:
                    reporte['errores'].append(f"Fila {fila}: {str(e)}")

            return Response(reporte)
        except Exception as e:
            return Response({'error': str(e)}, 400)


# =========================================================================
# 2. VIEWSET DE CONTRATOS (Faltaba este)
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
            # RRHH ve contratos de la empresa
            if perfil.rol in ['ADMIN', 'RRHH']:
                return queryset.filter(empresa=perfil.empresa)
            # El resto solo ve el suyo
            return queryset.filter(empleado=perfil)
        except: return Contrato.objects.none()


# =========================================================================
# 3. VIEWSET DE SOLICITUDES (Vacaciones - Corregido con Gerentes)
# =========================================================================
class SolicitudViewSet(viewsets.ModelViewSet):
    """
    Gestión de Vacaciones y Permisos.
    - Empleados: Crean y ven sus propias solicitudes.
    - Gerentes: Ven y aprueban las de su equipo (pero no las suyas propias).
    - RRHH: Ve y gestiona todo.
    """
    queryset = SolicitudAusencia.objects.all()
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]

    # =========================================================================
    # 1. FILTRADO (¿QUÉ PUEDO VER?)
    # =========================================================================
    def get_queryset(self):
        user = self.request.user
        
        # SuperAdmin ve todo
        if user.is_superuser:
            return SolicitudAusencia.objects.all()

        try:
            empleado = Empleado.objects.get(usuario=user)
            
            # A. RRHH / DUEÑO: Ven todas las solicitudes de su empresa
            if empleado.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
                return SolicitudAusencia.objects.filter(empleado__empresa=empleado.empresa)
            
            # B. GERENTE: Ve las suyas PROPIAS + las de SU DEPARTAMENTO
            # (Usamos Q objects si quieres combinar, o lógica simple)
            if empleado.rol == 'GERENTE' and empleado.departamento:
                return SolicitudAusencia.objects.filter(
                    empleado__empresa=empleado.empresa,
                    empleado__departamento=empleado.departamento
                )
            
            # C. EMPLEADO: Solo ve las suyas
            return SolicitudAusencia.objects.filter(empleado=empleado)

        except Empleado.DoesNotExist:
            return SolicitudAusencia.objects.none()

    # =========================================================================
    # 2. CREACIÓN (SOLICITAR VACACIONES)
    # =========================================================================
    def perform_create(self, serializer):
        try:
            empleado = Empleado.objects.get(usuario=self.request.user)
            
            # Validación básica de fechas
            inicio = serializer.validated_data.get('fecha_inicio')
            fin = serializer.validated_data.get('fecha_fin')
            if inicio and fin and inicio > fin:
                raise ValueError("La fecha de inicio no puede ser posterior a la fecha fin.")

            # Guardamos y listo. La "notificación" es que aparecerá en la lista del jefe.
            serializer.save(
                empleado=empleado, 
                empresa=empleado.empresa, 
                estado='PENDIENTE'
            )
            
        except Empleado.DoesNotExist:
            raise ValueError("El usuario actual no tiene ficha de empleado.")

    # 2. GESTIÓN (SIN CORREOS)
    @action(detail=True, methods=['post'])
    def gestionar(self, request, pk=None):
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        comentario = request.data.get('comentario_jefe', '')

        if nuevo_estado not in ['APROBADA', 'RECHAZADA']:
            return Response({'error': 'Estado inválido.'}, status=400)

        # ... (Mantén aquí tu bloque de validación de permisos de Jefe/RRHH) ...
        # ... (Copia el bloque 'try/except' de validación de permisos del chat anterior) ...

        # Lógica de Saldos (Solo si aprueba Vacaciones)
        es_vacaciones = 'vacaciones' in solicitud.tipo_ausencia.nombre.lower()
        if nuevo_estado == 'APROBADA' and es_vacaciones:
            dias_solicitados = (solicitud.fecha_fin - solicitud.fecha_inicio).days + 1
            if solicitud.empleado.saldo_vacaciones < dias_solicitados:
                return Response({'error': 'Saldo insuficiente.'}, 400)
            solicitud.empleado.saldo_vacaciones -= dias_solicitados
            solicitud.empleado.save()

        # Guardar cambios
        solicitud.estado = nuevo_estado
        solicitud.comentario_jefe = comentario
        solicitud.save()

        return Response({'status': f'Solicitud {nuevo_estado} correctamente.'})

    # =========================================================================
    # 3. GESTIÓN (APROBAR / RECHAZAR)
    # =========================================================================
    @action(detail=True, methods=['post'])
    def gestionar(self, request, pk=None):
        """
        Endpoint personalizado para aprobar/rechazar.
        URL: /api/solicitudes/{id}/gestionar/
        Body: { "estado": "APROBADA", "comentario_jefe": "Disfruta!" }
        """
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        comentario = request.data.get('comentario_jefe', '')

        if nuevo_estado not in ['APROBADA', 'RECHAZADA']:
            return Response({'error': 'Estado inválido. Use APROBADA o RECHAZADA.'}, status=400)

        # --- A. VERIFICAR PERMISOS DE APROBACIÓN ---
        try:
            aprobador = Empleado.objects.get(usuario=request.user)
            
            # Reglas:
            # 1. RRHH/Admin siempre puede.
            es_rrhh = aprobador.rol in ['ADMIN', 'RRHH', 'CLIENTE']
            
            # 2. Gerente puede SI es del mismo depto Y NO es su propia solicitud.
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

        # --- B. LÓGICA DE SALDOS (Solo para Vacaciones Aprobadas) ---
        # Asumiendo que el TipoAusencia tiene un campo nombre o código
        es_vacaciones = 'vacaciones' in solicitud.tipo_ausencia.nombre.lower()
        
        if nuevo_estado == 'APROBADA' and es_vacaciones:
            dias_solicitados = (solicitud.fecha_fin - solicitud.fecha_inicio).days + 1
            
            # Validar saldo positivo
            if solicitud.empleado.saldo_vacaciones < dias_solicitados:
                return Response({
                    'error': f'Saldo insuficiente. El colaborador tiene {solicitud.empleado.saldo_vacaciones} días disponibles.'
                }, status=400)
            
            # Descontar
            solicitud.empleado.saldo_vacaciones -= dias_solicitados
            solicitud.empleado.save()

        # --- C. GUARDAR Y NOTIFICAR ---
        solicitud.estado = nuevo_estado
        solicitud.comentario_jefe = comentario
        solicitud.save()

        # Enviar correo de respuesta al empleado
        notificar_solicitud(solicitud, tipo='RESPUESTA')

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
            # HR sees all documents
            if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
                return queryset.filter(empresa=perfil.empresa)
            # Employees see only their own
            return queryset.filter(empleado=perfil)
        except: return DocumentoEmpleado.objects.none()


# =========================================================================
# 5. VIEWSET DE TIPOS DE AUSENCIA (Catalog)
# =========================================================================
class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all()
    serializer_class = TipoAusenciaSerializer
    permission_classes = [IsAuthenticated]

    # 1. FILTRAR: Cada empresa ve solo lo suyo
    def get_queryset(self):
        user = self.request.user
        
        # SuperAdmin ve todo (para soporte)
        if user.is_superuser:
            return TipoAusencia.objects.all()
        
        try:
            empleado = Empleado.objects.get(usuario=user)
            # Retornamos solo los tipos asociados a la empresa del usuario
            return TipoAusencia.objects.filter(empresa=empleado.empresa)
        except Empleado.DoesNotExist:
            return TipoAusencia.objects.none()

    # 2. CREAR: Asignar empresa automáticamente
    def perform_create(self, serializer):
        try:
            empleado = Empleado.objects.get(usuario=self.request.user)
            
            # Validamos que solo RRHH o ADMIN puedan crear tipos
            if empleado.rol not in ['ADMIN', 'RRHH', 'CLIENTE']:
                raise PermissionError("Solo los administradores pueden configurar tipos de ausencia.")

            # Guardamos inyectando la empresa del creador
            serializer.save(empresa=empleado.empresa)
            
        except Empleado.DoesNotExist:
            raise ValueError("Usuario sin perfil de empleado.")