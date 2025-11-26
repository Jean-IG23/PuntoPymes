from django.contrib import admin
from .models import Empleado, DocumentoEmpleado, Contrato, EventoAsistencia, Jornada, TipoAusencia, SolicitudAusencia

admin.site.register(Empleado)
admin.site.register(DocumentoEmpleado) # <--- ¡Nueva!
admin.site.register(Contrato)
admin.site.register(EventoAsistencia)
admin.site.register(Jornada)           # <--- ¡Nueva!
admin.site.register(TipoAusencia)      # <--- ¡Nueva!
admin.site.register(SolicitudAusencia)