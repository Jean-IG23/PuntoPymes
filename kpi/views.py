from rest_framework import viewsets, permissions, serializers
from rest_framework.response import Response
from .models import KPI, ResultadoKPI
from .serializers import KPISerializer, ResultadoKPISerializer
from personal.models import Empleado

# 1. GESTIÓN DE INDICADORES (Definiciones: "Ventas", "Puntualidad", etc.)
class KPIViewSet(viewsets.ModelViewSet):
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # A. SuperAdmin ve todo
        if user.is_superuser:
            return KPI.objects.all()
        
        # B. Intentamos filtrar por la empresa del Empleado o del Usuario Admin
        empresa_id = None
        
        # 1. Buscamos en perfil de Empleado
        try:
            perfil = Empleado.objects.get(email=user.email)
            empresa_id = perfil.empresa.id
        except Empleado.DoesNotExist:
            # 2. Si no es empleado, ¿es un Admin con empresa asignada?
            if hasattr(user, 'empresa') and user.empresa:
                empresa_id = user.empresa.id
            elif hasattr(user, 'empresa_id') and user.empresa_id:
                empresa_id = user.empresa_id

        if empresa_id:
            return KPI.objects.filter(empresa_id=empresa_id)
            
        return KPI.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        empresa = None

        # Intento 1: Obtener empresa desde perfil de Empleado
        try:
            perfil = Empleado.objects.get(email=user.email)
            empresa = perfil.empresa
        except Empleado.DoesNotExist:
            # Intento 2: Obtener empresa desde el Usuario (Dueño/Admin)
            if hasattr(user, 'empresa') and user.empresa:
                empresa = user.empresa

        # Guardamos inyectando la empresa
        if empresa:
            serializer.save(empresa=empresa)
        elif user.is_superuser:
            # El superadmin puede enviar el ID manualmente en el JSON si quiere
            serializer.save()
        else:
            # Error claro si no se encuentra empresa (Evita el error 400 silencioso)
            raise serializers.ValidationError(
                {"detail": "No se pudo identificar tu empresa. Contacta a soporte."}
            )

# 2. RESULTADOS (Las notas: "Juan sacó 100 en Ventas")
class ResultadoViewSet(viewsets.ModelViewSet):
    serializer_class = ResultadoKPISerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # A. SuperAdmin
        if user.is_superuser:
            return ResultadoKPI.objects.all()
            
        try:
            perfil = Empleado.objects.get(email=user.email)
            
            # B. Si es Staff/Gerente: Ve los resultados de TODA su empresa
            if user.is_staff:
                return ResultadoKPI.objects.filter(empresa=perfil.empresa)
            
            # C. Empleado normal: Ve SOLO SUS PROPIAS notas
            return ResultadoKPI.objects.filter(empleado=perfil)
            
        except Empleado.DoesNotExist:
            # D. Caso especial: Admin/Dueño sin perfil de empleado
            if user.is_staff and hasattr(user, 'empresa') and user.empresa:
                return ResultadoKPI.objects.filter(empresa=user.empresa)
                
            return ResultadoKPI.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        empresa = None

        try:
            perfil = Empleado.objects.get(email=user.email)
            empresa = perfil.empresa
        except Empleado.DoesNotExist:
            if hasattr(user, 'empresa') and user.empresa:
                empresa = user.empresa
        
        if empresa:
            serializer.save(empresa=empresa)
        else:
            raise serializers.ValidationError(
                {"detail": "Error: No tienes una empresa asignada para registrar resultados."}
            )