from rest_framework import viewsets
from .models import Empresa, Sucursal, Departamento, Puesto, Turno
from .serializers import (
    EmpresaSerializer, SucursalSerializer, DepartamentoSerializer, 
    PuestoSerializer, TurnoSerializer
)

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all(); serializer_class = EmpresaSerializer

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all(); serializer_class = SucursalSerializer

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all(); serializer_class = DepartamentoSerializer

class PuestoViewSet(viewsets.ModelViewSet):
    queryset = Puesto.objects.all(); serializer_class = PuestoSerializer

class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all(); serializer_class = TurnoSerializer