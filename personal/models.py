from django.db import models
from core.models import Empresa, Turno, Sucursal, Puesto

class Empleado(models.Model):
    # Coincide con 'Empleado' de todos los docs
    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True) # Cédula
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    
    # Relaciones completas (UC-005 y Doc. Técnico)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True) # Unidad
    puesto = models.ForeignKey(Puesto, on_delete=models.SET_NULL, null=True)     # Cargo
    
    foto_url = models.URLField(blank=True, null=True)
    estado = models.CharField(max_length=20, default='ACTIVO')
    saldo_vacaciones = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"

class Contrato(models.Model):
    # Entidad 'Contrato' del documento técnico (Sección 2)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50, default='INDEFINIDO')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    salario_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    turno = models.ForeignKey(Turno, on_delete=models.SET_NULL, null=True)
    estado = models.CharField(max_length=20, default='VIGENTE')

    def __str__(self):
        return f"Contrato {self.empleado} - {self.tipo}"

class EventoAsistencia(models.Model):
    # Antes 'MarcaAsistencia'. Coincide con 'EventoAsistencia' (Sección 3)
    TIPO_CHOICES = [
        ('CHECK_IN', 'Entrada'),
        ('CHECK_OUT', 'Salida'),
    ]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    registrado_el = models.DateTimeField() # Fecha/Hora exacta
    
    # Datos técnicos exigidos por API y UC-002
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    foto_url = models.URLField(blank=True, null=True)
    observacion = models.CharField(max_length=200, blank=True)
    fuente = models.CharField(max_length=50, default='APP') # App, Web, Lector

    def __str__(self):
        return f"{self.empleado} - {self.tipo}"

class SolicitudAusencia(models.Model):
    # Coincide con 'SolicitudAusencia' (Sección 4)
    ESTADOS = [('PENDIENTE', 'Pendiente'), ('APROBADA', 'Aprobada'), ('RECHAZADA', 'Rechazada')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    motivo = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    
    def __str__(self):
        return f"Solicitud {self.empleado}"