from django.db import models
from core.models import Empresa
from personal.models import Empleado

# 1. EVENTO CRUDO (Bitácora de Auditoría)
# Útil si quieres permitir múltiples intentos o guardar historial de "fuera de rango"
class EventoAsistencia(models.Model):
    TIPO_CHOICES = [('CHECK_IN', 'Entrada'), ('CHECK_OUT', 'Salida')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True) # Nombre estándar
    
    # Georreferencia
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    
    foto_evidencia = models.ImageField(upload_to='asistencia_evidencia/', null=True, blank=True)
    observacion = models.CharField(max_length=200, blank=True)
    fuente = models.CharField(max_length=50, default='APP') # APP, WEB

    def __str__(self): return f"{self.empleado} - {self.tipo} ({self.timestamp})"

# 2. JORNADA PROCESADA (La "Verdad" para la Nómina)
class Jornada(models.Model):
    ESTADOS = [
        ('NORMAL', 'Asistencia Normal'),
        ('ATRASO', 'Atraso'),
        ('FALTA', 'Falta Injustificada'),
        ('PERMISO', 'Permiso / Vacación'),
        ('INCOMPLETA', 'Sin marcar salida')
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    fecha = models.DateField()
    
    # --- TIEMPOS ---
    hora_entrada = models.TimeField(null=True, blank=True)
    hora_salida = models.TimeField(null=True, blank=True)
    
    # --- GEOLOCALIZACIÓN (CRÍTICO PARA TU MAPA) ---
    # Guardamos la ubicación EXACTA aceptada para la entrada y la salida
    lat_entrada = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng_entrada = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    lat_salida = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng_salida = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # --- CÁLCULOS ---
    minutos_trabajados = models.IntegerField(default=0)
    minutos_atraso = models.IntegerField(default=0)
    minutos_extras = models.IntegerField(default=0)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='INCOMPLETA')
    
    observacion = models.TextField(blank=True, help_text="Notas del supervisor o justificación")

    class Meta:
        unique_together = ('empleado', 'fecha') # Regla de oro: 1 Jornada por día
        ordering = ['-fecha']

    def __str__(self): return f"{self.empleado} - {self.fecha} [{self.estado}]"
    
    # Helper para calcular estado automáticamente antes de guardar
    def save(self, *args, **kwargs):
        # Lógica simple de estado (puedes expandirla)
        if self.hora_entrada and self.hora_salida:
            self.estado = 'NORMAL'
            if self.minutos_atraso > 0:
                self.estado = 'ATRASO'
        super().save(*args, **kwargs)