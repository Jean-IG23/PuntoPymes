from django.contrib import admin
from .models import Empresa, Sucursal, Departamento, Turno, Puesto, Area,   Notificacion

# Registramos los modelos nuevos
admin.site.register(Empresa)
admin.site.register(Sucursal)
admin.site.register(Turno)
admin.site.register(Area)          # <--- ¡ESTA ES LA QUE FALTABA!
admin.site.register(Puesto) 
admin.site.register(Departamento)
admin.site.register(Notificacion)  # <--- Aprovechamos para agregar Notificaciones también
