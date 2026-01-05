from django.contrib import admin
from .models import Empleado, DocumentoEmpleado, Contrato, TipoAusencia, SolicitudAusencia

admin.site.register(Empleado)
admin.site.register(DocumentoEmpleado) # <--- ¡Nueva!
admin.site.register(Contrato)           # <--- ¡Nueva!
admin.site.register(TipoAusencia)      # <--- ¡Nueva!
admin.site.register(SolicitudAusencia)