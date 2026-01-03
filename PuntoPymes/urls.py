from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Vistas de Core
from core.views import (
    NotificacionViewSet, 
    CustomAuthToken, 
    AreaViewSet, 
    EmpresaViewSet, 
    SucursalViewSet, 
    DepartamentoViewSet, 
    PuestoViewSet, 
    TurnoViewSet,
    DashboardStatsView  # <--- ¡IMPORTANTE! Agregamos esta vista
)

# Vistas de KPI
from kpi.views import KPIViewSet, ResultadoViewSet

# Vistas de Personal
from personal.views import (
    EmpleadoViewSet, 
    ContratoViewSet, 
    DocumentoViewSet, 
    EventoAsistenciaViewSet, 
    SolicitudViewSet, 
    TipoAusenciaViewSet, 
    JornadaViewSet
)

# Configuración de la Documentación (Swagger)
schema_view = get_schema_view(
   openapi.Info(
      title="API Talent Track V2",
      default_version='v1',
      description="Documentación técnica para el equipo de Desarrollo (Frontend & Móvil)",
      contact=openapi.Contact(email="jean@talenttrack.com"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

# ... (Configuración del router) ...
router = DefaultRouter()

# CORE
router.register(r'empresas', EmpresaViewSet)
router.register(r'sucursales', SucursalViewSet)
router.register(r'departamentos', DepartamentoViewSet)
router.register(r'puestos', PuestoViewSet)
router.register(r'turnos', TurnoViewSet)
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'areas', AreaViewSet)

# KPI (SOLUCIÓN DEL ERROR: Agregamos basename)
router.register(r'kpis', KPIViewSet, basename='kpis')
router.register(r'resultados-kpi', ResultadoViewSet, basename='resultados-kpi')

# PERSONAL
router.register(r'empleados', EmpleadoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoViewSet)
router.register(r'jornadas', JornadaViewSet)
router.register(r'tipos-ausencia', TipoAusenciaViewSet)
router.register(r'solicitudes', SolicitudViewSet)
router.register(r'marcas', EventoAsistenciaViewSet, basename='marcas')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Login
    path('api/login/', CustomAuthToken.as_view()), 
    
    # Dashboard (SOLUCIÓN ERROR FRONTEND 404)
    path('api/dashboard/stats/', DashboardStatsView.as_view()),

    # Rutas del Router
    path('api/', include(router.urls)),
    
    # Documentación
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]