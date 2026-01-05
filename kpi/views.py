from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import KPI, EvaluacionDesempeno, Objetivo
from .serializers import KPISerializer, EvaluacionSerializer, ObjetivoSerializer
from personal.models import Empleado
from .services import CalculadoraDesempeno
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

        if user.is_superuser:
            return queryset

        try:
            empleado = Empleado.objects.get(email=user.email)
            if user.is_staff: 
                return queryset.filter(empresa=empleado.empresa)
            return queryset.filter(empleado=empleado)

        except Empleado.DoesNotExist:
            return Objetivo.objects.none()
        
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