from django.db import models
from datetime import datetime, date, timedelta
from django.contrib.auth.models import User
class Empresa(models.Model):
    razon_social = models.CharField(max_length=150)
    nombre_comercial = models.CharField(max_length=150, blank=True)
    ruc = models.CharField(max_length=20, unique=True)
    pais = models.CharField(max_length=50, default='Ecuador')
    estado = models.CharField(max_length=20, default='ACTIVO')
    creada_el = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.razon_social

# 2. SUCURSAL
class Sucursal(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200, blank=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, default=0)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, default=0)
    radio_metros = models.IntegerField(default=50)

    def __str__(self):
        return f"{self.nombre} ({self.empresa.razon_social})"

# 3. ÁREA (Catálogo)
class Area(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('empresa', 'nombre')

    def __str__(self):
        return self.nombre

# 4. DEPARTAMENTO
class Departamento(models.Model):
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    # El departamento SÍ debe tener un área definida
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.nombre} - {self.sucursal.nombre}"

# 5. PUESTO (Con lógica Comodín)
class Puesto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    
    # CAMBIO CLAVE: null=True permite que sea "Universal" (sin área)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True)
    
    descripcion = models.TextField(blank=True)
    es_supervisor = models.BooleanField(default=False)
    salario_base_sugerido = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        area_nombre = self.area.nombre if self.area else "Universal"
        return f"{self.nombre} ({area_nombre})"

# 6. TURNO
class Turno(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField()
    minutos_descanso = models.IntegerField(default=60)
    min_tolerancia = models.IntegerField(default=10)
    
    def __str__(self):
        return self.nombre

# 7. NOTIFICACIÓN
class Notificacion(models.Model):
    TIPOS = [
        ('VACACION', 'Solicitud de Vacaciones'),
        ('SISTEMA', 'Mensaje del Sistema'),
        ('PERSONAL', 'Mensaje Personal'),
    ]
    usuario_destino = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    titulo = models.CharField(max_length=100)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPOS, default='SISTEMA')
    leida = models.BooleanField(default=False)
    creada_el = models.DateTimeField(auto_now_add=True)
    link_accion = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        ordering = ['-creada_el']

    def __str__(self):
        return f"{self.titulo} -> {self.usuario_destino.username}"