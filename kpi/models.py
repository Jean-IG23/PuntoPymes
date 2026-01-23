from django.db import models
from core.models import Empresa
from personal.models import Empleado

# 1. CATÁLOGO DE KPIs (El "Qué vamos a medir")
class KPI(models.Model):
    # El cliente dijo que pueden ser por Competencia, Puntualidad o Desempeño
    CATEGORIAS = [
        ('ASISTENCIA', 'Puntualidad y Asistencia'),
        ('DESEMPENO', 'Desempeño y Objetivos'),
        ('COMPETENCIA', 'Competencias y Títulos'), # Títulos académicos que mencionaron
        ('OTRO', 'Otro')
    ]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100) # Ej: "Cumplimiento de Ventas"
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS, default='DESEMPENO')
    
    # PONDERACIÓN: ¿Qué tanto influye esto en la nota final? (0 a 100%)
    peso_porcentaje = models.IntegerField(default=0, help_text="Peso de este KPI en la nota final (0-100)")
    
    # Meta base para calcular el cumplimiento
    meta_objetivo = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    
    def __str__(self): return f"{self.nombre} ({self.peso_porcentaje}%)"

# 2. EVALUACIÓN MENSUAL (La "Libreta de Notas")
class EvaluacionDesempeno(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    
    fecha_evaluacion = models.DateField(auto_now_add=True)
    periodo = models.CharField(max_length=20) # Ej: "Octubre-2024"
    
    # Calificación Final Calculada (Ej: 95.50)
    puntaje_total = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Estado (Para que el empleado la firme o acepte)
    estado = models.CharField(max_length=20, default='BORRADOR') # BORRADOR, FINALIZADA
    observaciones = models.TextField(blank=True)

    def __str__(self):
        return f"Evaluación {self.empleado.nombres} - {self.periodo}"

# 3. DETALLE DE LA NOTA (Cada renglón de la libreta)
class DetalleEvaluacion(models.Model):
    evaluacion = models.ForeignKey(EvaluacionDesempeno, on_delete=models.CASCADE, related_name='detalles')
    kpi = models.ForeignKey(KPI, on_delete=models.PROTECT)
    
    # Valores reales obtenidos
    valor_obtenido = models.DecimalField(max_digits=10, decimal_places=2) # Ej: Vendió 80
    
    # Nota calculada para este punto (Ej: 8/10)
    calificacion = models.DecimalField(max_digits=5, decimal_places=2) 
    
    comentario = models.CharField(max_length=200, blank=True)

# 4. OBJETIVOS (Tareas específicas que alimentan los KPIs de Desempeño)
class Objetivo(models.Model):
    # ... (Mantenemos el modelo de Objetivos que te pasé antes aquí mismo)
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('COMPLETADO', 'Completado'),
        ('CANCELADO', 'Cancelado')
    ]
    PRIORIDADES = [('ALTA', 'Alta'), ('MEDIA', 'Media'), ('BAJA', 'Baja')]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='objetivos')
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    meta_numerica = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    avance_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    fecha_limite = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default='MEDIA')
    
    def __str__(self): return self.titulo