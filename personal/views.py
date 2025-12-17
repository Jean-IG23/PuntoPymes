import pandas as pd
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from core.models import Empresa
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import (
    Empleado, Contrato, DocumentoEmpleado, 
    EventoAsistencia, SolicitudAusencia, TipoAusencia, Jornada
)
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    EventoAsistenciaSerializer, SolicitudSerializer, TipoAusenciaSerializer,
    JornadaSerializer
)
from core.models import Departamento, Puesto, Empresa
from rest_framework.decorators import action


# 1. VIEWSET DE EMPLEADOS (El más importante)
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()  # <--- ¡AGREGA ESTA LÍNEA!
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated] # Solo usuarios logueados

    def get_queryset(self):
        user = self.request.user
        queryset = Empleado.objects.all()

        # --- FILTROS DE URL (?departamento=1) ---
        dept_id = self.request.query_params.get('departamento')
        empresa_id = self.request.query_params.get('empresa')

        if dept_id:
            queryset = queryset.filter(departamento_id=dept_id)
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)

        # --- REGLAS DE SEGURIDAD (ROLES) ---
        
        # A. Si es Super Admin:
        # Por defecto no mostramos empleados operativos en la lista global para no saturar.
        # Solo si filtra explícitamente por empresa, se los mostramos.
        if user.is_superuser:
            if empresa_id: 
                return queryset # Si pidió una empresa específica, se la damos.
            return Empleado.objects.none() # Si no, lista vacía por seguridad.

        # B. Si es Admin de Empresa (Staff):
        # Solo puede ver empleados que pertenezcan a SU empresa.
        if user.is_staff:
            try:
                # Buscamos el perfil del usuario logueado para saber su empresa
                mi_perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=mi_perfil.empresa)
            except Empleado.DoesNotExist:
                return Empleado.objects.none() # Si no tiene perfil, no ve nada.

        # C. Si es Empleado Normal:
        # Solo puede verse a sí mismo.
        return queryset.filter(email=user.email)
    @action(detail=False, methods=['post'], url_path='upload')
    def upload_excel(self, request):
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No se envió ningún archivo.'}, status=400)

        # Validar extensión
        if not file.name.endswith(('.xlsx', '.csv')):
            return Response({'error': 'Formato no válido. Use .xlsx o .csv'}, status=400)

        try:
            # Leer el archivo con Pandas
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            
            # Limpiar nombres de columnas (quitar espacios y poner minúsculas)
            df.columns = df.columns.str.strip().str.lower()
            
            reporte = {
                'total_procesados': 0,
                'exitosos': 0,
                'errores': []
            }

            # Obtener la empresa del usuario que está subiendo (si es Staff)
            empresa_actual = None
            if request.user.is_staff and not request.user.is_superuser:
                try:
                    perfil = Empleado.objects.get(email=request.user.email)
                    empresa_actual = perfil.empresa
                except:
                    return Response({'error': 'No tienes una empresa asignada.'}, status=403)

            # Iterar filas
            for index, row in df.iterrows():
                reporte['total_procesados'] += 1
                fila_excel = index + 2 # Para que coincida con el Excel (Header es 1)
                
                # 1. Validar Datos Obligatorios
                cedula = str(row.get('cedula', '')).strip()
                nombres = str(row.get('nombres', '')).strip()
                email = str(row.get('email', '')).strip()
                
                # Validación básica
                if not cedula or not nombres or not email or email == 'nan':
                    reporte['errores'].append(f"Fila {fila_excel}: Faltan datos obligatorios (Cédula, Nombres o Email).")
                    continue

                # 2. Validar Duplicados (Cédula o Email)
                if Empleado.objects.filter(documento=cedula).exists():
                    reporte['errores'].append(f"Fila {fila_excel}: La cédula {cedula} ya existe.")
                    continue
                
                if User.objects.filter(email=email).exists():
                     reporte['errores'].append(f"Fila {fila_excel}: El usuario/email {email} ya existe.")
                     continue

                # 3. Lógica de Empresa/Departamento (Simplificada)
                # Si es SuperAdmin, el excel DEBE tener columna 'ruc_empresa'.
                # Si es Cliente, usamos su empresa.
                empresa_obj = empresa_actual
                
                # (Aquí podrías agregar lógica para buscar Departamento y Puesto por nombre si vienen en el Excel)
                
                try:
                    # A. Crear Usuario de Login
                    user = User.objects.create_user(
                        username=email,
                        email=email,
                        password=cedula, # Contraseña por defecto = Cédula
                        is_staff=False
                    )

                    # B. Crear Ficha de Empleado
                    Empleado.objects.create(
                        empresa=empresa_obj, # Ojo: Si es SuperAdmin y no asignó empresa, esto fallará. Asumimos Admin de Empresa por ahora.
                        nombres=nombres,
                        apellidos=str(row.get('apellidos', '')),
                        documento=cedula,
                        email=email,
                        telefono=str(row.get('telefono', '')),
                        direccion=str(row.get('direccion', '')),
                        estado='ACTIVO'
                        # departamento=... (Pendiente: Lógica para buscar ID de depto por nombre)
                    )
                    
                    reporte['exitosos'] += 1

                except Exception as e:
                    reporte['errores'].append(f"Fila {fila_excel}: Error interno ({str(e)})")

            return Response(reporte)

        except Exception as e:
            return Response({'error': f'Error al leer el archivo: {str(e)}'}, status=400)


# 2. VIEWSET DE CONTRATOS
class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()  
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Contrato.objects.all()

        # Misma lógica de seguridad
        if user.is_superuser:
            return queryset # El super admin puede auditar contratos
        
        if user.is_staff:
            try:
                mi_perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=mi_perfil.empresa)
            except:
                return Contrato.objects.none()
                
        # El empleado solo ve su propio contrato
        return queryset.filter(empleado__email=user.email)


# 3. VIEWSET DE ASISTENCIA (Marcaciones)
class EventoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EventoAsistencia.objects.all()
    serializer_class = EventoAsistenciaSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        try:
            # Buscamos al empleado asociado al usuario logueado
            empleado = Empleado.objects.get(email=user.email)
            serializer.save(empleado=empleado)
        except Empleado.DoesNotExist:
            raise serializers.ValidationError({"error": "No tienes un perfil de empleado asociado."})
            
    def get_queryset(self):
        # El empleado solo ve SUS marcas
        user = self.request.user
        if not user.is_superuser:
            try:
                empleado = Empleado.objects.get(email=user.email)
                return EventoAsistencia.objects.filter(empleado=empleado).order_by('-fecha_hora')
            except:
                return EventoAsistencia.objects.none()
        return EventoAsistencia.objects.all()


# 4. VIEWSET DE SOLICITUDES (Vacaciones)
class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all()  
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = SolicitudAusencia.objects.all()

        if user.is_superuser:
            return queryset
        
        if user.is_staff:
            try:
                mi_perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=mi_perfil.empresa)
            except:
                return SolicitudAusencia.objects.none()

        return queryset.filter(empleado__email=user.email)


# --- RESTO DE VIEWSETS (Estándar) ---

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all()
    serializer_class = DocumentoSerializer
    permission_classes = [IsAuthenticated]

class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all()
    serializer_class = TipoAusenciaSerializer
    permission_classes = [IsAuthenticated]

class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer
    permission_classes = [IsAuthenticated]