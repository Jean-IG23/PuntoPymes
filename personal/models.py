from django.db import models
from django.contrib.auth.models import User
from core.models import Empresa, Sucursal, Departamento, Puesto, Area
# 1. FICHA DEL EMPLEADO
class Empleado(models.Model):
    # --- ROLES DEL SISTEMA (Simplificados y Jerárquicos) ---
    ROLES = [
        ('SUPERADMIN', 'Super Admin (SaaS)'),   # Tú (Acceso total técnico)
        ('ADMIN', 'Cliente / Dueño'),           # El Cliente (Configuración total de su empresa)
        ('RRHH', 'Recursos Humanos'),           # Gestión operativa (Permisos, Contratos)
        ('GERENTE', 'Gerente / Líder'),         # Visión de equipo (Asistencia, Aprobación básica)
        ('EMPLEADO', 'Colaborador'),            # Usuario final (Solo ve lo suyo)
    ]

    # Relación con el usuario de Django (Login)
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='empleado')
    
    # Datos Personales
    nombres = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    foto = models.ImageField(upload_to='fotos_perfil/', null=True, blank=True)

    # --- VINCULACIÓN EMPRESARIAL ---
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='empleados')
    
    # Estructura (Aquí se asigna el lugar y función)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True)
    puesto = models.ForeignKey(Puesto, on_delete=models.SET_NULL, null=True, blank=True)
    
    # --- JERARQUÍA Y ACCESO ---
    rol = models.CharField(max_length=20, choices=ROLES, default='EMPLEADO')
    
    # Campo opcional: Si es GERENTE, ¿de qué Área es responsable?
    # Esto permite que un Gerente vea a TODOS los empleados de "Ventas", 
    # sin importar si están en Quito o Guayaquil.
    lider_area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, help_text="Solo para Gerentes: Define qué área supervisa globalmente")

    # Datos Laborales
    fecha_ingreso = models.DateField()
    sueldo = models.DecimalField(max_digits=10, decimal_places=2, default=460)
    saldo_vacaciones = models.IntegerField(default=15)
    
    estado = models.CharField(max_length=20, default='ACTIVO', choices=[('ACTIVO', 'Activo'), ('INACTIVO', 'Inactivo')])

    def __str__(self):
        return f"{self.nombres} {self.apellidos} ({self.rol})"

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
    motivo = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    
    fecha_resolucion = models.DateField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True)
    
    aprobado_por = models.ForeignKey(Empleado, related_name='ausencias_aprobadas', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self): return f"Solicitud {self.empleado} ({self.estado})"