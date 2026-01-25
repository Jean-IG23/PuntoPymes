from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import KPI, EvaluacionDesempeno, Objetivo
from .serializers import KPISerializer, EvaluacionSerializer, ObjetivoSerializer
from personal.models import Empleado
from .services import CalculadoraDesempeno
from core.views import get_empresa_usuario
from core.permissions import (
    get_queryset_filtrado_objetivos,
    get_empleado_o_none,
    puede_gestionar_empleado
)


class KPIViewSet(viewsets.ModelViewSet):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [IsAuthenticated]

# --- CAMBIO: Antes era ResultadoViewSet, ahora es EvaluacionViewSet ---
class EvaluacionViewSet(viewsets.ModelViewSet):
    queryset = EvaluacionDesempeno.objects.all()
    serializer_class = EvaluacionSerializer
    permission_classes = [IsAuthenticated]


class ObjetivoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de objetivos con Row-Level Security.
    
    REGLAS DE ACCESO:
    - SUPERADMIN: Ve todos los objetivos
    - ADMIN/RRHH: Ven todos los objetivos de su empresa
    - GERENTE: Solo ve objetivos de empleados de su sucursal
    - EMPLEADO: Solo ve sus propios objetivos (NO puede crear ni editar)
    """
    queryset = Objetivo.objects.all()
    serializer_class = ObjetivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Usar la función centralizada de Row-Level Security
        queryset = get_queryset_filtrado_objetivos(user, Objetivo.objects.all())
        return queryset.order_by('-fecha_limite')

    def perform_create(self, serializer):
        """
        Valida permisos y asigna la empresa automáticamente.
        
        REGLAS:
        - EMPLEADO: NO puede crear objetivos
        - GERENTE: Solo puede asignar objetivos a empleados de su sucursal
        - ADMIN/RRHH: Pueden asignar objetivos a cualquier empleado de su empresa
        """
        try:
            # Si es superuser, obtener empresa del contexto
            if self.request.user.is_superuser:
                empresa = get_empresa_usuario(self.request.user)
                if not empresa:
                    raise ValueError("Superuser sin empresa asignada.")
                serializer.save(empresa=empresa)
                return
            
            # Si es usuario normal, validar rol
            empleado = Empleado.objects.get(usuario=self.request.user)
            
            # Validar que solo ADMIN, RRHH, GERENTE pueden crear objetivos
            if empleado.rol not in ['ADMIN', 'RRHH', 'GERENTE', 'SUPERADMIN']:
                raise PermissionError(f"El rol '{empleado.rol}' no puede crear objetivos. Solo ADMIN, RRHH o GERENTE pueden.")
            
            # VALIDACIÓN ESPECIAL PARA GERENTE:
            # Solo puede asignar objetivos a empleados de su sucursal
            if empleado.rol == 'GERENTE':
                empleado_objetivo = serializer.validated_data.get('empleado')
                if empleado_objetivo:
                    # Verificar que el empleado asignado pertenece a la misma sucursal
                    if empleado_objetivo.sucursal_id != empleado.sucursal_id:
                        raise PermissionError(
                            f"Como Gerente, solo puedes asignar objetivos a empleados de tu sucursal. "
                            f"{empleado_objetivo.nombres} {empleado_objetivo.apellidos} pertenece a otra sucursal."
                        )
            
            # Asignar la empresa del usuario autenticado
            serializer.save(empresa=empleado.empresa)
        except Empleado.DoesNotExist:
            raise ValidationError("El usuario no tiene un perfil de empleado asociado.")
        

class EvaluacionViewSet(viewsets.ModelViewSet):
    queryset = EvaluacionDesempeno.objects.all()
    serializer_class = EvaluacionSerializer
    permission_classes = [IsAuthenticated]
    @action(detail=False, methods=['post'])
    def generar_cierre(self, request):
        """
        Endpoint para calcular la evaluación mensual de un empleado.
        Recibe JSON: { "empleado_id": 1, "mes": 10, "anio": 2024 }
        """
        empleado_id = request.data.get('empleado_id')
        mes = request.data.get('mes')
        anio = request.data.get('anio')

        if not empleado_id or not mes or not anio:
            return Response(
                {"error": "Faltan datos (empleado_id, mes, anio)"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Llamamos a nuestro "Cerebro"
            calculadora = CalculadoraDesempeno(empleado_id)
            evaluacion = calculadora.calcular_cierre_mensual(int(mes), int(anio))
            
            # Devolvemos la evaluación generada
            serializer = self.get_serializer(evaluacion)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)