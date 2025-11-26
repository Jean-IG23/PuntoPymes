from django.contrib import admin
from .models import Empleado, EventoAsistencia, SolicitudAusencia, Contrato

admin.site.register(Empleado)
admin.site.register(Contrato)
admin.site.register(EventoAsistencia) 
admin.site.register(SolicitudAusencia)