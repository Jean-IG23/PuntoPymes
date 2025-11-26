"""
URL configuration for PuntoPymes project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Importar vistas de CORE
from core.views import (
    EmpresaViewSet, SucursalViewSet, DepartamentoViewSet, 
    PuestoViewSet, TurnoViewSet
)
# Importar vistas de PERSONAL
from personal.views import (
    EmpleadoViewSet, ContratoViewSet, DocumentoViewSet, 
    EventoAsistenciaViewSet, SolicitudViewSet, TipoAusenciaViewSet
)

router = DefaultRouter()

# Rutas CORE
router.register(r'empresas', EmpresaViewSet)
router.register(r'sucursales', SucursalViewSet)
router.register(r'departamentos', DepartamentoViewSet)
router.register(r'puestos', PuestoViewSet)
router.register(r'turnos', TurnoViewSet)

# Rutas PERSONAL
router.register(r'empleados', EmpleadoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoViewSet)
router.register(r'marcas', EventoAsistenciaViewSet)
router.register(r'solicitudes', SolicitudViewSet)
router.register(r'tipos-ausencia', TipoAusenciaViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]