from django.db import models
from django.utils import timezone
from core.models import Empresa
from personal.models import Empleado

# 1. BITÁCORA DE EVENTOS (RAW DATA)
# Aquí guardamos TODO: intentos fallidos, fotos, IPs. Es la evidencia forense.
class EventoAsistencia(models.Model):
    TIPO_CHOICES = [('ENTRADA', 'Entrada'), ('SALIDA', 'Salida')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='eventos_asistencia')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now) # Usamos default para permitir ajuste si hay lag offline
    
    # Geolocalización
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True) # Más precisión (7 decimales)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    
    # Evidencia Anti-Fraude
    foto = models.ImageField(upload_to='evidencia_asistencia/%Y/%m/', null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255, blank=True, help_text="User Agent o ID del App")
    
    # Estado del intento
    exitoso = models.BooleanField(default=True)
    error_motivo = models.CharField(max_length=255, blank=True, help_text="Ej: Fuera de rango")

    class Meta:
        indexes = [models.Index(fields=['empleado', 'timestamp'])]

    def __str__(self): return f"{self.empleado} - {self.tipo} ({self.timestamp.strftime('%H:%M')})"


# 2. JORNADA CONSOLIDADA (DATOS DE NÓMINA)
# Esta tabla es la que consulta RRHH para pagar.
class Jornada(models.Model):
    ESTADOS = [
        ('ABIERTA', 'En curso'),
        ('CERRADA', 'Finalizada'),
        ('AUSENTE', 'Ausencia Injustificada'),
        ('JUSTIFICADA', 'Falta Justificada/Permiso'),
        ('ERROR', 'Error de Marcaje (Sin salida)')
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='jornadas')
    fecha = models.DateField(help_text="Fecha contable de la jornada (independiente de si cruza medianoche)")
    
    # --- TIEMPOS (Usamos DateTimeField para soportar turnos nocturnos) ---
    entrada = models.DateTimeField(null=True, blank=True)
    salida = models.DateTimeField(null=True, blank=True)
    
    # --- CÁLCULOS FINANCIEROS ---
    # Guardamos Decimal para precisión (Ej: 8.5 horas)
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    horas_extras = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    minutos_atraso = models.IntegerField(default=0)
    
    # --- ESTADO Y CONTROL ---
    es_atraso = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ABIERTA')
    
    # --- AUDITORÍA DE MODIFICACIÓN MANUAL ---
    es_manual = models.BooleanField(default=False, help_text="¿Fue creado/editado manualmente por un supervisor?")
    observacion = models.TextField(blank=True)
    editado_por = models.ForeignKey(
        'personal.Empleado', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='jornadas_editadas'
    )

    class Meta:
        # Un empleado solo debería tener una jornada principal por fecha contable
        unique_together = ('empleado', 'fecha') 
        ordering = ['-fecha']

    def __str__(self): 
        return f"{self.empleado} - {self.fecha} [{self.estado}]"

    # Método profesional para calcular duración
    def calcular_duracion(self):
        if self.entrada and self.salida:
            diferencia = self.salida - self.entrada
            # Convertir a horas decimales (Ej: 2h 30m = 2.5)
            self.horas_trabajadas = round(diferencia.total_seconds() / 3600, 2)