from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings
from django.conf.urls.static import static
from core.views import ConfiguracionNominaViewSet
from personal.views import TareaViewSet
from asistencia.views import CalculoNominaView
from django.conf import settings
from django.conf.urls.static import static

# IMPORTANTE: Importamos la función simple, no la clase inexistente
from core.views import (
    NotificacionViewSet,
    AreaViewSet, 
    EmpresaViewSet, 
    SucursalViewSet, 
    DepartamentoViewSet, 
    PuestoViewSet, 
    TurnoViewSet,
    dashboard_stats,
    CustomLoginView,
    DashboardChartsView,
    get_user_permissions  # API de permisos para el frontend
)

from personal.views import (
    EmpleadoViewSet, 
    ContratoViewSet, 
    DocumentoViewSet, 
    SolicitudViewSet, 
    TipoAusenciaViewSet,
)
from asistencia.views import EventoAsistenciaViewSet, JornadaViewSet, MarcarAsistenciaView, ReportesAsistenciaView


from kpi.views import (
    KPIViewSet, 
    EvaluacionViewSet, 
    ObjetivoViewSet
)

# Configuración Swagger
schema_view = get_schema_view(
   openapi.Info(
      title="API Talent Track V2",
      default_version='v1',
      description="Documentación técnica",
      contact=openapi.Contact(email="admin@talenttrack.com"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

# --- ROUTER PRINCIPAL ---
router = DefaultRouter()

# 1. CORE
router.register(r'empresas', EmpresaViewSet)
router.register(r'sucursales', SucursalViewSet)
router.register(r'departamentos', DepartamentoViewSet)
router.register(r'puestos', PuestoViewSet)
router.register(r'turnos', TurnoViewSet)
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'areas', AreaViewSet)

# 2. PERSONAL
router.register(r'empleados', EmpleadoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoViewSet)
router.register(r'tipos-ausencia', TipoAusenciaViewSet)
router.register(r'solicitudes', SolicitudViewSet)

# 3. ASISTENCIA
router.register(r'jornadas', JornadaViewSet)
router.register(r'bitacora-asistencia', EventoAsistenciaViewSet) # Puedes llamar a la ruta 'asistencia' si prefieres
# 4. KPI
router.register(r'kpis', KPIViewSet, basename='kpis')
router.register(r'evaluaciones', EvaluacionViewSet)
router.register(r'objetivos', ObjetivoViewSet)
router.register(r'config-nomina', ConfiguracionNominaViewSet, basename='config-nomina')
router.register(r'tareas', TareaViewSet, basename='tareas')


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Login Personalizado
    path('api/login/', CustomLoginView.as_view(), name='api_login'), 
    path('api/dashboard/stats/', dashboard_stats, name='dashboard_stats'),
    path('api/dashboard/charts/', DashboardChartsView.as_view(), name='dashboard-charts'),
    
    # API de Permisos (RBAC)
    path('api/permisos/', get_user_permissions, name='user_permissions'),
    # Rutas del Router (API)
    path('api/', include(router.urls)),
    path('api/nomina/calculo/', CalculoNominaView.as_view(), name='calculo-nomina'),
    path('api/reportes/asistencia/', ReportesAsistenciaView.as_view(), name='reportes-asistencia'),
    # Documentación
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    #asistencia
    path('api/', include(router.urls)),
    path('api/marcar/', MarcarAsistenciaView.as_view()), # Ruta especial para el botón
]

# ======================================================
# ERROR HANDLERS (Manejo Seguro de Errores)
# ======================================================
handler400 = 'PuntoPymes.error_handlers.handler400'
handler403 = 'PuntoPymes.error_handlers.handler403'
handler404 = 'PuntoPymes.error_handlers.handler404'
handler500 = 'PuntoPymes.error_handlers.handler500'
    
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)