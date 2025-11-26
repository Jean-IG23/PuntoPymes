from django.db import models

class Empresa(models.Model):
    razon_social = models.CharField(max_length=150)
    ruc = models.CharField(max_length=20, unique=True)
    # ... otros campos ...
    creada_el = models.DateTimeField(auto_now_add=True)

    def _str_(self):
        return self.razon_social

class Sucursal(models.Model):
    # LUGAR FÍSICO (Tiene GPS)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100) # Ej: Matriz Loja
    direccion = models.CharField(max_length=200)
    
    # Datos GPS (Geocerca)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    radio_metros = models.IntegerField(default=50)

    def _str_(self):
        return self.nombre

class Departamento(models.Model):
    # UNIDAD FUNCIONAL (Pertenece a una Sucursal)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100) # Ej: Sistemas, RRHH
    
    def _str_(self):
        return f"{self.nombre} - {self.sucursal.nombre}"

class Puesto(models.Model):
    # CARGO (Pertenece a un Departamento o a la Empresa en general)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100) # Ej: Jefe de Proyectos
    
    def _str_(self):
        return self.nombre

class Turno(models.Model):
    # ... (Igual que antes) ...
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField()
    min_tolerancia = models.IntegerField(default=10)
    
    def _str_(self):
        return self.nombre