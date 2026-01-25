#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para testear la creación de empresa con caracteres especiales
"""

import os
import sys
import django
import json
import requests

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Empresa

# Test 1: Crear empresa con caracteres especiales
print("\n" + "="*60)
print("TEST: Crear Empresa con Caracteres Especiales")
print("="*60)

# Datos de prueba con acentos y ñ
test_empresa = {
    "razon_social": "Pymes Innovación S.A.C.",
    "nombre_comercial": "Pymes Inteligente - Región Ñoño",
    "ruc": "20123456789",
    "direccion": "Calle Español Nº 123, Piso 2º",
    "admin_email": "admin@pymestest.com",
    "admin_password": "TestPass123!",
    "admin_nombre": "José García"
}

print("\n📝 Datos de prueba:")
for key, value in test_empresa.items():
    print(f"  {key}: {value}")

# Test directo en base de datos
print("\n✅ TEST 1: Creación directa (ORM)")
try:
    empresa = Empresa.objects.create(
        razon_social=test_empresa['razon_social'],
        nombre_comercial=test_empresa['nombre_comercial'],
        ruc=test_empresa['ruc'] + "_test1",
        direccion=test_empresa['direccion']
    )
    print(f"✓ Empresa creada: {empresa}")
    empresa.delete()
except Exception as e:
    print(f"✗ Error: {e}")

# Test 2: Validar encoding
print("\n✅ TEST 2: Validación de Encoding")
test_strings = [
    "Pymes Innovación S.A.C.",
    "José García",
    "Región Ñoño",
    "Calle Español Nº 123, Piso 2º",
]

for s in test_strings:
    try:
        encoded = s.encode('utf-8')
        decoded = encoded.decode('utf-8')
        print(f"✓ '{s}' → UTF-8 válido")
    except Exception as e:
        print(f"✗ '{s}' → Error: {e}")

# Test 3: API Test (si el servidor está corriendo)
print("\n✅ TEST 3: Test API (si servidor está disponible)")
try:
    # Primero login
    response = requests.post(
        'http://localhost:8000/api/token/',
        json={'username': 'admin', 'password': 'admin'},
        timeout=5
    )
    
    if response.status_code == 200:
        token = response.json()['access']
        print(f"✓ Login exitoso")
        
        # Intentar crear empresa
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(
            'http://localhost:8000/api/empresas/',
            json=test_empresa,
            headers=headers,
            timeout=5
        )
        
        print(f"✓ Status: {response.status_code}")
        if response.status_code in [201, 200]:
            print(f"✓ Empresa creada vía API!")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(f"✗ Error en API: {response.text}")
    else:
        print(f"⚠ No se pudo hacer login (servidor no disponible)")
        
except requests.exceptions.ConnectionError:
    print("⚠ Servidor no disponible (http://localhost:8000)")
except Exception as e:
    print(f"✗ Error en API test: {e}")

print("\n" + "="*60)
print("✅ Test completado")
print("="*60)
