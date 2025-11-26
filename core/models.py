from django.db import models

class Empresa(models.Model):
    razon_social = models.CharField(max_length=150)
    nombre_comercial = models.CharField(max_length=150, blank=True)
    ruc = models.CharField(max_length=20, unique=True)
    pais = models.CharField(max_length=50, default='Ecuador')
    estado = models.CharField(max_length=20, default='ACTIVO')
    creada_el = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.razon_social

class Sucursal(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50, default='SEDE')
    ubicacion = models.CharField(max_length=200, blank=True)
    
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    radio_metros = models.IntegerField(default=50)

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"

class Puesto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    
    def __str__(self):
        return self.nombre

class Turno(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField()
    min_tolerancia = models.IntegerField(default=10)
    
    def __str__(self):
        return self.nombre