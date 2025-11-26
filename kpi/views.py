from rest_framework import viewsets
from .models import KPI, ResultadoKPI
from .serializers import KPISerializer, ResultadoKPISerializer
class KPIViewSet(viewsets.ModelViewSet):
    queryset = KPI.objects.all(); serializer_class = KPISerializer
class ResultadoViewSet(viewsets.ModelViewSet):
    queryset = ResultadoKPI.objects.all(); serializer_class = ResultadoKPISerializer