from django.db import models
from django.contrib.auth.models import User

# 1. EMPRESA (El Cliente del SaaS)
class Empresa(models.Model):
    razon_social = models.CharField(max_length=150)
    nombre_comercial = models.CharField(max_length=150, blank=True)
    ruc = models.CharField(max_length=20, unique=True)
    direccion = models.TextField(blank=True)
    logo = models.ImageField(upload_to='logos_empresas/', null=True, blank=True)
    estado = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.nombre_comercial or self.razon_social

# 2. SUCURSAL (Ubicación Física)
class Sucursal(models.Model):
    nombre = models.CharField(max_length=255)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='sucursales')
    direccion = models.TextField(blank=True)
    es_matriz = models.BooleanField(default=False)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radio_metros = models.IntegerField(default=50, help_text="Radio en metros para permitir marcaje")

    responsable = models.ForeignKey(
        'personal.Empleado', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='sucursales_a_cargo'
    )

    def __str__(self):
        return f"{self.nombre} - {self.empresa.nombre_comercial}"

# 3. ÁREA (Unidad Funcional Global)
class Area(models.Model):
    nombre = models.CharField(max_length=100) # Ej: Comercial, RRHH, Tecnología
    descripcion = models.TextField(blank=True, null=True)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='areas')
    
    class Meta:
        unique_together = ('empresa', 'nombre') # No repetir nombres en la misma empresa

    def __str__(self):
        return f"{self.nombre} - {self.empresa.razon_social}"

# 4. DEPARTAMENTO (Unidad Operativa Local)
class Departamento(models.Model):
    nombre = models.CharField(max_length=100) 
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, related_name='departamentos')
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name='departamentos')
    class Meta:
        unique_together = ('sucursal', 'nombre')

    def __str__(self):
        return f"{self.nombre} ({self.sucursal.nombre})"

# 5. PUESTO (El Cargo)
class Puesto(models.Model):
    nombre = models.CharField(max_length=100)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True)
    es_supervisor = models.BooleanField(default=False)
    class Meta:
        unique_together = ('empresa', 'nombre')
    def __str__(self):
        return self.nombre

# 6. TURNO (Reglas de Asistencia)
class Turno(models.Model):
    TIPOS_JORNADA = [
        ('RIGIDO', 'Horario Fijo (Entrada/Salida estricta)'),
        ('FLEXIBLE', 'Bolsa de Horas (Meta semanal)'),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: "Administrativo L-V"
    
    # Configuración Híbrida
    tipo_jornada = models.CharField(max_length=50, choices=TIPOS_JORNADA, default='RIGIDO')
    
    # Para horario RIGIDO
    hora_entrada = models.TimeField(null=True, blank=True)
    hora_salida = models.TimeField(null=True, blank=True)
    min_tolerancia = models.IntegerField(default=10, help_text="Minutos de gracia antes de marcar atraso")
    
    # Para horario FLEXIBLE
    horas_semanales_meta = models.IntegerField(default=40, help_text="Total de horas a cumplir (Ej: 40)")
    
    # Días laborables: Guardaremos una lista de ints [0,1,2,3,4] (0=Lunes)
    dias_laborables = models.JSONField(default=list) 

    def __str__(self):
        return f"{self.nombre} ({self.tipo_jornada})"

# 7. NOTIFICACIÓN
class Notificacion(models.Model):
    TIPOS = [
        ('VACACION', 'Solicitud de Vacaciones'),
        ('OBJETIVO', 'Asignación de Objetivo'), 
        ('SISTEMA', 'Mensaje del Sistema'),
    ]
    usuario_destino = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    titulo = models.CharField(max_length=100)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=50, choices=TIPOS, default='SISTEMA')
    leida = models.BooleanField(default=False)
    creada_el = models.DateTimeField(auto_now_add=True)
    link_accion = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        ordering = ['-creada_el']

    def __str__(self):
        return f"{self.tipo}: {self.titulo}"
# --- AGREGAR AL FINAL DE src/core/models.py ---

class ConfiguracionNomina(models.Model):
    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name='config_nomina')
    
    # 1. Configuración General
    moneda = models.CharField(max_length=5, default='USD', help_text="Ej: USD, EUR, MXN")
    
    # 2. Valor del Tiempo
    divisor_hora_mensual = models.IntegerField(default=240, 
        help_text="Divisor para calcular valor hora. Ej: 240 (30 días * 8h) o 160 (20 días * 8h)")
    
    # 3. Horas Extras (Multiplicadores)
    # 1.0 = Valor normal, 1.5 = 50% recargo, 2.0 = 100% recargo
    factor_he_diurna = models.DecimalField(max_digits=4, decimal_places=2, default=1.50) 
    factor_he_nocturna = models.DecimalField(max_digits=4, decimal_places=2, default=2.00)
    
    # ¿A qué hora empieza la noche para el sistema?
    hora_inicio_nocturna = models.TimeField(default='19:00:00')
    
    # 4. Políticas de Castigo
    descontar_atrasos = models.BooleanField(default=True, 
        help_text="Si es True, se resta del sueldo el tiempo de atraso.")
    
    tolerancia_remunerada = models.BooleanField(default=True, 
        help_text="Si llega tarde dentro de la tolerancia, ¿se le paga ese tiempo?")

    def __str__(self):
        return f"Configuración Nómina - {self.empresa.nombre_comercial}"