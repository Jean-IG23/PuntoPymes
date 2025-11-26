from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Empresa, Sucursal, Departamento, Puesto, Turno
from .serializers import (
    EmpresaSerializer, SucursalSerializer, DepartamentoSerializer, 
    PuestoSerializer, TurnoSerializer
)
from personal.models import Empleado

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all() # <--- ESTO FALTABA
    serializer_class = SucursalSerializer
    
    def get_queryset(self):
        queryset = Sucursal.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        return queryset

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all() # <--- ESTO FALTABA
    serializer_class = DepartamentoSerializer
    
    def get_queryset(self):
        queryset = Departamento.objects.all()
        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            queryset = queryset.filter(sucursal_id=sucursal_id)
        return queryset

class PuestoViewSet(viewsets.ModelViewSet):
    queryset = Puesto.objects.all() # <--- ESTO FALTABA
    serializer_class = PuestoSerializer
    
    def get_queryset(self):
        queryset = Puesto.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        return queryset

class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer

