#!/usr/bin/env python
"""
Script para probar el endpoint de configuración
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from core.models import Empresa, ConfiguracionNomina
from personal.models import Empleado

# Crear cliente
client = Client()

# Intentar login como admin
print("Intentando login como admin...")
response = client.post('/api/auth/login/', {
    'username': 'admin@gmail.com',
    'email': 'admin@gmail.com',
    'password': 'admin123'
}, content_type='application/json')

print(f"Login response status: {response.status_code}")
print(f"Login response: {response.json()}")

# Si el login fue exitoso, obtener token
if response.status_code == 200:
    data = response.json()
    token = data.get('token')
    print(f"Token obtenido: {token}")
    
    # Hacer request a mi_configuracion
    print("\nIntentando acceder a /api/config-nomina/mi_configuracion/...")
    headers = {'HTTP_AUTHORIZATION': f'Token {token}'}
    response = client.get('/api/config-nomina/mi_configuracion/', **headers)
    
    print(f"Response status: {response.status_code}")
    print(f"Response: {response.content.decode()[:500]}")
else:
    print("Login falló, no se puede continuar")

# Verificar que existe al menos una empresa
print("\n\nVerificando empresas en BD:")
empresas = Empresa.objects.all()
print(f"Total de empresas: {empresas.count()}")
for empresa in empresas:
    print(f"  - {empresa.nombre_comercial}")
    
# Verificar configuraciones de nómina
print("\nVerificando configuraciones de nómina:")
configs = ConfiguracionNomina.objects.all()
print(f"Total de configuraciones: {configs.count()}")
for config in configs:
    print(f"  - Empresa: {config.empresa.nombre_comercial}")
