from django.contrib import admin
from .models import Empresa, Sucursal, Turno, Puesto

# Registramos los modelos nuevos
admin.site.register(Empresa)
admin.site.register(Sucursal)
admin.site.register(Turno)
admin.site.register(Puesto) # <-- Agregamos Puesto en lugar de Rol