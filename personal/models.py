from django.db import models
from django.contrib.auth.models import User
from jsonschema import ValidationError
from core.models import Empresa, Sucursal, Departamento, Puesto, Area, Turno
from core.utils import calcular_dias_habiles
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
    email = models.EmailField()
    telefono = models.CharField(max_length=100, blank=True)
    direccion = models.TextField(blank=True)
    foto = models.ImageField(upload_to='empleados/', null=True, blank=True, verbose_name="Foto de Perfil")
    documento = models.CharField(max_length=100, null=True, blank=True, verbose_name="Cédula/DNI")
    # --- VINCULACIÓN EMPRESARIAL ---
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='empleados')
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True, blank=True)
    # Estructura (Aquí se asigna el lugar y función)
    departamento = models.ForeignKey(
        'core.Departamento', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='empleados' # Esto ayuda a hacer consultas inversas más limpias
    )
    puesto = models.ForeignKey(Puesto, on_delete=models.SET_NULL, null=True, blank=True)
    
    # --- JERARQUÍA Y ACCESO ---
    rol = models.CharField(max_length=100, choices=ROLES, default='EMPLEADO')
    lider_area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, help_text="Solo para Gerentes: Define qué área supervisa globalmente")

    # Datos Laborales
    fecha_ingreso = models.DateField()
    sueldo = models.DecimalField(max_digits=10, decimal_places=2, default=460)
    es_mensualizado = models.BooleanField(default=True, help_text="True=Pago Mensual, False=Pago por Hora")
    saldo_vacaciones = models.IntegerField(default=15)
    turno_asignado = models.ForeignKey(Turno, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Turno Fijo")
    estado = models.CharField(max_length=100, default='ACTIVO', choices=[('ACTIVO', 'Activo'), ('INACTIVO', 'Inactivo')])
    class Meta:
        unique_together = [
            ('empresa', 'email'),
            ('empresa', 'documento')
        ]
    def clean(self):
        # 1. VALIDACIÓN DE CONSISTENCIA JERÁRQUICA
        if self.departamento and self.sucursal:
            if self.departamento.sucursal != self.sucursal:
                raise ValidationError({
                    'departamento': 'El departamento seleccionado no pertenece a la sucursal indicada.'
                })
        
        # 2. VALIDACIÓN DE JEFE DE ÁREA
        if self.rol == 'GERENTE' and not self.lider_area:
            raise ValidationError({'lider_area': 'Un Gerente debe tener un Área asignada.'})

    def save(self, *args, **kwargs):
        # Auto-llenado de sucursal si se elige departamento
        if self.departamento and not self.sucursal:
            self.sucursal = self.departamento.sucursal
        super().save(*args, **kwargs)
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
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE) 
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='contratos')
    tipo = models.CharField(max_length=50, choices=TIPOS, default='INDEFINIDO')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    salario_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    archivo_adjunto = models.FileField(upload_to='contratos/', null=True, blank=True)
    activo = models.BooleanField(default=True)
    def __str__(self): return f"Contrato - {self.empleado.nombres}"
    def save(self, *args, **kwargs):
        if self.activo:
            Contrato.objects.filter(empleado=self.empleado, activo=True).exclude(pk=self.pk).update(activo=False)
            self.empleado.sueldo = self.salario_mensual
            self.empleado.save()
        super().save(*args, **kwargs)
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
    dias_solicitados = models.IntegerField(default=0)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    motivo = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    
    fecha_resolucion = models.DateField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True)
    
    aprobado_por = models.ForeignKey(Empleado, related_name='ausencias_aprobadas', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self): return f"Solicitud {self.empleado} ({self.estado})"
class Tarea(models.Model):
    PRIORIDAD_CHOICES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente 🔥'),
    ]
    
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Por Hacer'),
        ('PROGRESO', 'En Curso'),
        ('REVISION', 'En Revisión'),
        ('COMPLETADA', 'Completada ✅'),
    ]

    empresa = models.ForeignKey('core.Empresa', on_delete=models.CASCADE)
    
    # Detalle
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    
    # Responsables
    asignado_a = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='tareas_asignadas')
    creado_por = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='tareas_creadas')
    
    # Gestión
    fecha_limite = models.DateTimeField(null=True, blank=True)
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default='MEDIA')
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    # Gamificación / Productividad
    puntos_valor = models.IntegerField(default=1, help_text="Puntos que gana el empleado al completar (1-10)")
    
    # Tiempos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completado_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.titulo} ({self.asignado_a})"