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
    queryset = Objetivo.objects.all()
    serializer_class = ObjetivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Objetivo.objects.all()

        try:
            empleado = Empleado.objects.get(usuario=user)
            # SuperUser, staff y todos ven objetivos de su empresa
            if user.is_superuser or user.is_staff: 
                return queryset.filter(empresa=empleado.empresa)
            # Empleados normales ven solo sus objetivos
            return queryset.filter(empleado=empleado)

        except Empleado.DoesNotExist:
            return Objetivo.objects.none()

    def perform_create(self, serializer):
        """Valida permisos y asigna la empresa automáticamente"""
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