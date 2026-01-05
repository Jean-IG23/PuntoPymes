import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User, Group

# Importamos Modelos y Serializers SOLO de Personal
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    SolicitudSerializer, TipoAusenciaSerializer
)

# 1. VIEWSET DE EMPLEADOS
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Empleado.objects.all()

        # Filtro opcional por departamento en la URL
        dept_id = self.request.query_params.get('departamento')
        if dept_id: queryset = queryset.filter(departamento_id=dept_id)

        # CASO 1: SUPER ADMIN (SaaS)
        # Solo ve a los CLIENTES (Dueños), no la nómina interna
        if user.is_superuser: 
            return queryset.filter(rol='CLIENTE')

        # CASO 2: ADMIN EMPRESA / RRHH / GERENTE (Staff)
        if user.is_staff:
            try:
                perfil = Empleado.objects.get(email=user.email)
                # Ve a todos los de SU empresa
                return queryset.filter(empresa=perfil.empresa)
            except Empleado.DoesNotExist:
                return Empleado.objects.none()

        # CASO 3: EMPLEADO NORMAL
        # Solo se ve a sí mismo
        return queryset.filter(email=user.email)

    # --- CARGA MASIVA DE EMPLEADOS (Lógica Completa) ---
    @action(detail=False, methods=['post'], url_path='upload')
    def upload_excel(self, request):
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No se envió ningún archivo.'}, status=400)

        # 1. Validar extensión
        if not file.name.endswith(('.xlsx', '.csv')):
            return Response({'error': 'Formato no válido. Use .xlsx o .csv'}, status=400)

        try:
            # 2. Identificar Empresa del Usuario
            empresa_obj = None
            if request.user.is_staff and not request.user.is_superuser:
                try:
                    perfil = Empleado.objects.get(email=request.user.email)
                    empresa_obj = perfil.empresa
                except Empleado.DoesNotExist:
                    return Response({'error': 'Tu usuario no tiene ficha de empleado.'}, status=403)
            else:
                return Response({'error': 'Solo Admin de Empresa o RRHH pueden subir masivos.'}, status=403)

            # 3. Leer archivo
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            
            df.columns = df.columns.str.strip().str.lower()
            
            reporte = {'total_procesados': 0, 'exitosos': 0, 'errores': []}

            # 4. Iterar filas
            for index, row in df.iterrows():
                reporte['total_procesados'] += 1
                fila_excel = index + 2
                
                cedula = str(row.get('cedula', '')).strip()
                nombres = str(row.get('nombres', '')).strip()
                email = str(row.get('email', '')).strip()
                
                # Validaciones
                if not cedula or not nombres or not email or email == 'nan':
                    reporte['errores'].append(f"Fila {fila_excel}: Datos incompletos.")
                    continue

                if Empleado.objects.filter(documento=cedula).exists():
                    reporte['errores'].append(f"Fila {fila_excel}: Cédula {cedula} repetida.")
                    continue
                
                if User.objects.filter(email=email).exists():
                     reporte['errores'].append(f"Fila {fila_excel}: Email {email} repetido.")
                     continue

                try:
                    # A. Crear Usuario Django
                    user = User.objects.create_user(
                        username=email, 
                        email=email,
                        password=cedula, 
                        is_staff=False
                    )
                    # Asignar grupo Empleado por defecto
                    g, _ = Group.objects.get_or_create(name='EMPLEADO')
                    user.groups.add(g)

                    # B. Crear Ficha Empleado
                    Empleado.objects.create(
                        empresa=empresa_obj,
                        nombres=nombres,
                        apellidos=str(row.get('apellidos', '')),
                        documento=cedula,
                        email=email,
                        telefono=str(row.get('telefono', '')),
                        direccion=str(row.get('direccion', '')),
                        rol='EMPLEADO',
                        estado='ACTIVO',
                        usuario=user # Vinculamos al usuario creado
                    )
                    reporte['exitosos'] += 1

                except Exception as e:
                    reporte['errores'].append(f"Fila {fila_excel}: Error interno ({str(e)})")

            return Response(reporte)

        except Exception as e:
            return Response({'error': f'Error al procesar: {str(e)}'}, status=400)


# 2. VIEWSET DE CONTRATOS
class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()  
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Contrato.objects.all()
        if user.is_superuser: return queryset
        if user.is_staff:
            try:
                perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=perfil.empresa)
            except: return Contrato.objects.none()
        # El empleado solo ve su contrato
        return queryset.filter(empleado__email=user.email)


# 3. VIEWSET DE VACACIONES (Solicitudes)
class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all()  
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = SolicitudAusencia.objects.all()
        if user.is_superuser: return queryset
        if user.is_staff:
            try:
                perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=perfil.empresa)
            except: return SolicitudAusencia.objects.none()
        return queryset.filter(empleado__email=user.email)


# 4. VIEWSET DE DOCUMENTOS (Con seguridad agregada)
class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all()
    serializer_class = DocumentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = DocumentoEmpleado.objects.all()
        if user.is_superuser: return queryset
        if user.is_staff:
            try:
                perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=perfil.empresa)
            except: return DocumentoEmpleado.objects.none()
        return queryset.filter(empleado__email=user.email)


# 5. VIEWSET DE TIPOS DE AUSENCIA (Catálogo)
class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all()
    serializer_class = TipoAusenciaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TipoAusencia.objects.all()
        if user.is_superuser: return queryset
        # Todos ven los tipos de ausencia de SU empresa para poder solicitarlas
        if user.is_authenticated:
            try:
                perfil = Empleado.objects.get(email=user.email)
                return queryset.filter(empresa=perfil.empresa)
            except: return TipoAusencia.objects.none()
        return queryset.none()