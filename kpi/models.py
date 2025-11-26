from django.db import models
from core.models import Empresa
from personal.models import Empleado

class KPI(models.Model):
    UNIDAD_CHOICES = [('PORCENTAJE', '%'), ('PUNTOS', 'Puntos')]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    unidad = models.CharField(max_length=20, choices=UNIDAD_CHOICES)
    meta_objetivo = models.DecimalField(max_digits=5, decimal_places=2)
    def __str__(self): return self.nombre

class ResultadoKPI(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE)
    periodo = models.CharField(max_length=20)
    valor_obtenido = models.DecimalField(max_digits=5, decimal_places=2)