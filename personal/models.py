from django.db import models
from core.models import Empresa, Turno, Departamento, Puesto

# 1. FICHA DEL EMPLEADO
class Empleado(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    foto_url = models.URLField(blank=True, null=True)
    
    # Organización
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True)
    puesto = models.ForeignKey(Puesto, on_delete=models.SET_NULL, null=True, blank=True)
    turno = models.ForeignKey(Turno, on_delete=models.SET_NULL, null=True)
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    estado = models.CharField(max_length=20, default='ACTIVO')
    saldo_vacaciones = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def _str_(self):
        return f"{self.nombres} {self.apellidos}"

# 2. DOCUMENTOS DEL EMPLEADO (¡NUEVO! - Sección 2 del PDF)
class DocumentoEmpleado(models.Model):
    TIPO_DOC = [('CONTRATO', 'Contrato Firmado'), ('CEDULA', 'Cédula'), ('TITULO', 'Título'), ('OTRO', 'Otro')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_DOC)
    archivo_url = models.URLField(help_text="Link al archivo en S3 o local")
    observacion = models.TextField(blank=True)
    cargado_el = models.DateTimeField(auto_now_add=True)

    def _str_(self):
        return f"{self.empleado} - {self.tipo}"

# 3. CONTRATOS
class Contrato(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50, default='INDEFINIDO')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    salario_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    estado = models.CharField(max_length=20, default='VIGENTE')

    def _str_(self):
        return f"Contrato {self.empleado}"

# 4. CONTROL DE ASISTENCIA (Raw Data)
class EventoAsistencia(models.Model):
    TIPO_CHOICES = [('CHECK_IN', 'Entrada'), ('CHECK_OUT', 'Salida')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    registrado_el = models.DateTimeField()
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    foto_url = models.URLField(blank=True, null=True)
    observacion = models.CharField(max_length=200, blank=True)
    fuente = models.CharField(max_length=50, default='APP')

    def _str_(self):
        return f"{self.empleado} - {self.tipo}"

# 5. JORNADA CALCULADA (¡NUEVO! - Sección 3 del PDF - Vital para Backend)
class Jornada(models.Model):
    # Aquí se guarda el resumen diario procesado
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

    def _str_(self):
        return f"Jornada {self.empleado} - {self.fecha}"

# 6. GESTIÓN DE VACACIONES
class TipoAusencia(models.Model):
    # ¡NUEVO! Catálogo (Enfermedad, Vacaciones, Maternidad) - Sección 4
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: Vacaciones, Permiso Médico
    afecta_sueldo = models.BooleanField(default=False)
    
    def _str_(self):
        return self.nombre

class SolicitudAusencia(models.Model):
    ESTADOS = [('PENDIENTE', 'Pendiente'), ('APROBADA', 'Aprobada'), ('RECHAZADA', 'Rechazada')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    
    # Ahora se vincula al catálogo
    tipo_ausencia = models.ForeignKey(TipoAusencia, on_delete=models.PROTECT, null=True)
    
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    motivo = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    
    fecha_resolucion = models.DateField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True)

    def _str_(self):
        return f"Solicitud {self.empleado} ({self.estado})"