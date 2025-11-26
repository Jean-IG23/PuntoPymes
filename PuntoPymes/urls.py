from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Vistas
from core.views import EmpresaViewSet, SucursalViewSet, DepartamentoViewSet, PuestoViewSet, TurnoViewSet
from personal.views import EmpleadoViewSet, ContratoViewSet, DocumentoViewSet, EventoAsistenciaViewSet, SolicitudViewSet, TipoAusenciaViewSet, JornadaViewSet
#from kpi.views import KPIViewSet, ResultadoViewSet

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

router = DefaultRouter()
# CORE
router.register(r'empresas', EmpresaViewSet)
router.register(r'sucursales', SucursalViewSet)
router.register(r'departamentos', DepartamentoViewSet)
router.register(r'puestos', PuestoViewSet)
router.register(r'turnos', TurnoViewSet)
# PERSONAL
router.register(r'empleados', EmpleadoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoViewSet)
router.register(r'marcas', EventoAsistenciaViewSet)
router.register(r'jornadas', JornadaViewSet)
router.register(r'tipos-ausencia', TipoAusenciaViewSet)
router.register(r'solicitudes', SolicitudViewSet)
# KPI
#router.register(r'kpis', KPIViewSet)
#router.register(r'resultados-kpi', ResultadoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # Rutas de Documentación
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]