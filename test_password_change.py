#!/usr/bin/env python
"""
Script para probar el endpoint de cambio de contraseña
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.contrib.auth.models import User
from personal.serializers import PasswordChangeSerializer
from rest_framework.test import APIRequestFactory
from personal.views import EmpleadoViewSet
from personal.models import Empleado
from core.models import Empresa

# Crear usuario de prueba
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={'email': 'test@example.com', 'first_name': 'Test'}
)
if created:
    user.set_password('oldpass123')
    user.save()
    print(f"✓ Usuario creado: {user.username}")
else:
    print(f"✓ Usuario existe: {user.username}")

# Crear empleado vinculado
try:
    empresa = Empresa.objects.first()
    if not empresa:
        print("⚠ No hay empresa, creando una...")
        empresa = Empresa.objects.create(
            nombre_comercial="Test Empresa",
            razon_social="Test Empresa SAS",
            ruc="9999999999"
        )
    
    empleado, created = Empleado.objects.get_or_create(
        usuario=user,
        empresa=empresa,
        defaults={
            'documento': '123456789',
            'nombres': 'Test',
            'apellidos': 'User',
            'email': 'test@example.com',
            'rol': 'EMPLEADO',
            'estado': 'ACTIVO'
        }
    )
    if created:
        print(f"✓ Empleado creado: {empleado.nombres}")
    else:
        print(f"✓ Empleado existe: {empleado.nombres}")
except Exception as e:
    print(f"✗ Error creando empleado: {e}")

# Probar el serializer
print("\n" + "="*50)
print("PRUEBA DEL SERIALIZER")
print("="*50)

data = {
    'old_password': 'oldpass123',
    'new_password': 'newpass456',
    'confirm_password': 'newpass456'
}

serializer = PasswordChangeSerializer(data=data)
print(f"\nDatos de entrada: {data}")
print(f"¿Es válido? {serializer.is_valid()}")

if serializer.is_valid():
    print(f"✓ Datos validados correctamente")
    print(f"  validated_data keys: {list(serializer.validated_data.keys())}")
    print(f"  validated_data: {serializer.validated_data}")
else:
    print(f"✗ Errores en serializer:")
    for field, errors in serializer.errors.items():
        print(f"  {field}: {errors}")

# Probar la vista
print("\n" + "="*50)
print("PRUEBA DE LA VISTA (cambio de contraseña)")
print("="*50)

factory = APIRequestFactory()
request = factory.post(
    '/api/empleados/change-password/',
    data,
    format='json'
)
request.user = user

viewset = EmpleadoViewSet()
viewset.request = request
viewset.format_kwarg = None

try:
    response = viewset.change_password(request)
    print(f"\n✓ Respuesta exitosa: {response.status_code}")
    print(f"  Data: {response.data}")
except Exception as e:
    print(f"\n✗ Error en la vista:")
    print(f"  {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
