from django.db import models
from core.models import Empresa
from personal.models import Empleado

# 1. EVENTO CRUDO (Check-In / Check-Out)
class EventoAsistencia(models.Model):
    TIPO_CHOICES = [('CHECK_IN', 'Entrada'), ('CHECK_OUT', 'Salida')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    registrado_el = models.DateTimeField()
    
    # Georreferencia
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    
    foto_evidencia = models.ImageField(upload_to='asistencia_evidencia/', null=True, blank=True)
    observacion = models.CharField(max_length=200, blank=True)
    fuente = models.CharField(max_length=50, default='APP') # APP, WEB

    def __str__(self): return f"{self.empleado} - {self.tipo}"

# 2. JORNADA PROCESADA (Para Nómina y KPIs)
class Jornada(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    fecha = models.DateField()
    
    hora_entrada_real = models.TimeField(null=True)
    hora_salida_real = models.TimeField(null=True)
    
    minutos_trabajados = models.IntegerField(default=0)
    minutos_atraso = models.IntegerField(default=0)
    minutos_extras = models.IntegerField(default=0)
    
    es_ausencia = models.BooleanField(default=False)
    es_vacacion = models.BooleanField(default=False)

    class Meta:
        unique_together = ('empleado', 'fecha') # Evita duplicados por día

    def __str__(self): return f"Jornada {self.empleado} - {self.fecha}"