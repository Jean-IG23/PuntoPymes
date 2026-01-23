#!/usr/bin/env python
"""
Script para hacer una petición a la API como si fuera el frontend
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory
from rest_framework.authtoken.models import Token
from core.views import DepartamentoViewSet
from core.models import Empresa

# Crear factory
factory = APIRequestFactory()

# Obtener un usuario de prueba
user = User.objects.first()
if not user:
    print("❌ No hay usuarios en la BD")
    exit(1)

print(f"✅ Usuario encontrado: {user.username}")

# Obtener la empresa del usuario
from personal.models import Empleado
emp = Empleado.objects.filter(usuario=user).first()
empresa = emp.empresa if emp else Empresa.objects.first()
print(f"✅ Empresa: {empresa.nombre_comercial}")

# Hacer la petición como si fuera el frontend
request = factory.get('/api/departamentos/')
request.user = user

# Crear viewset e inyectar request
viewset = DepartamentoViewSet()
viewset.request = request
viewset.format_kwarg = None

# Obtener querySet
qs = viewset.get_queryset()
print(f"\n📊 Departamentos devueltos por el ViewSet: {qs.count()}")

# Serializar cada uno
from core.serializers import DepartamentoSerializer
serializer = DepartamentoSerializer(qs, many=True)
data = serializer.data

print(f"\n📋 DATOS SERIALIZADOS (primeros 5):")
for i, d in enumerate(data[:5]):
    print(f"\n  [{i}] {d.get('nombre')}")
    print(f"      id: {d.get('id')}")
    print(f"      sucursal: {d.get('sucursal')}")
    print(f"      sucursal_id: {d.get('sucursal_id')}")
    print(f"      nombre_sucursal: {d.get('nombre_sucursal')}")

print(f"\n✅ Total departamentos serializados: {len(data)}")

# Agrupar por sucursal
from collections import defaultdict
por_sucursal = defaultdict(list)
for d in data:
    sucursal_id = d.get('sucursal_id') or d.get('sucursal')
    por_sucursal[sucursal_id].append(d.get('nombre'))

print(f"\n📍 DISTRIBUCIÓN POR SUCURSAL (según API):")
for sucursal_id, deptos in sorted(por_sucursal.items()):
    print(f"  Sucursal {sucursal_id}: {len(deptos)} departamentos")
    for d in deptos[:3]:
        print(f"    - {d}")
    if len(deptos) > 3:
        print(f"    ... y {len(deptos)-3} más")
