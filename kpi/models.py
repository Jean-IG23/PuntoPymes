from django.db import models
# Asegúrate de que estos imports apunten a donde tienes tus modelos de Empresa y Empleado
from core.models import Empresa
from personal.models import Empleado

class KPI(models.Model):
    # Opciones EXACTAS que pusimos en el Select de Angular
    OPCIONES_UNIDAD = [
        ('%', 'Porcentaje (%)'),
        ('USD', 'Moneda ($)'),
        ('NUM', 'Cantidad (#)'),
        ('PTS', 'Puntos (1-10)')
    ]

    # Relación con la Empresa (Obligatorio para que no se mezclen datos entre clientes)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)

    nombre = models.CharField(max_length=100)
    
    # Campo corregido: max_length=5 para que quepa 'PTS', 'USD', etc.
    unidad = models.CharField(max_length=5, choices=OPCIONES_UNIDAD, default='%')
    
    # Campo renombrado: De 'meta_objetivo' a 'meta' (Así lo llama Angular)
    meta = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} - Meta: {self.meta} {self.unidad}"

class ResultadoKPI(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE)
    
    periodo = models.CharField(max_length=50) # Ej: "Enero 2026"
    valor_obtenido = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_evaluacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.empleado} - {self.kpi.nombre}: {self.valor_obtenido}"