from django.db import models
from django.contrib.auth.models import User
# Importamos los modelos base desde la APP CORE
from core.models import Empresa, Sucursal, Departamento, Puesto, Turno

# 1. FICHA DEL EMPLEADO
class Empleado(models.Model):
    ROLES = [
        ('CLIENTE', 'Admin de Empresa (Dueño)'), 
        ('RRHH', 'Gestor de RRHH'),
        ('GERENTE', 'Líder de Área (Manager)'),
        ('EMPLEADO', 'Colaborador')
    ]
    
    # Vinculación con Usuario de Login
    usuario = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    
    # Datos Biográficos
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True) # Cédula
    email = models.EmailField(unique=True) 
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    foto = models.ImageField(upload_to='empleados_fotos/', null=True, blank=True)
    
    # Ubicación Organizacional
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True)
    puesto = models.ForeignKey(Puesto, on_delete=models.SET_NULL, null=True)
    
    # Reglas Operativas
    # OJO: Aquí usamos el Turno que importamos de CORE
    turno = models.ForeignKey(Turno, on_delete=models.SET_NULL, null=True)
    jefe_inmediato = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinados')
    
    # Estado y Rol
    rol = models.CharField(max_length=20, choices=ROLES, default='EMPLEADO')
    estado = models.CharField(max_length=20, default='ACTIVO') 
    
    fecha_ingreso = models.DateField(null=True, blank=True)
    saldo_vacaciones = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self): return f"{self.nombres} {self.apellidos}"

# 2. DOCUMENTOS DEL EMPLEADO
class DocumentoEmpleado(models.Model):
    TIPO_DOC = [('CONTRATO', 'Contrato Firmado'), ('CEDULA', 'Cédula'), ('TITULO', 'Título'), ('OTRO', 'Otro')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_DOC)
    archivo = models.FileField(upload_to='documentos_empleados/', null=True, blank=True) 
    observacion = models.TextField(blank=True)
    cargado_el = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.empleado} - {self.tipo}"

# 3. CONTRATOS
class Contrato(models.Model):
    TIPOS = [('INDEFINIDO', 'Indefinido'), ('PLAZO_FIJO', 'Plazo Fijo'), ('PASANTIA', 'Pasantía')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE) # Agregado para integridad
    empleado = models.OneToOneField(Empleado, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50, choices=TIPOS, default='INDEFINIDO')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    salario_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    archivo_adjunto = models.FileField(upload_to='contratos/', null=True, blank=True)
    
    def __str__(self): return f"Contrato - {self.empleado.nombres}"

# 4. GESTIÓN DE VACACIONES (Se mantiene aquí por ser parte del perfil)
class TipoAusencia(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) 
    afecta_sueldo = models.BooleanField(default=False)
    
    def __str__(self): return self.nombre

class SolicitudAusencia(models.Model):
    ESTADOS = [('PENDIENTE', 'Pendiente'), ('APROBADA', 'Aprobada'), ('RECHAZADA', 'Rechazada')]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    tipo_ausencia = models.ForeignKey(TipoAusencia, on_delete=models.PROTECT, null=True)
    
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    motivo = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    
    fecha_resolucion = models.DateField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True)
    
    aprobado_por = models.ForeignKey(Empleado, related_name='ausencias_aprobadas', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self): return f"Solicitud {self.empleado} ({self.estado})"