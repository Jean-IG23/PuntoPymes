#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test simple de encoding
"""
import os
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')

import django
django.setup()

from core.models import Empresa

print("\n" + "="*60)
print("✅ TEST: Crear Empresa con Caracteres Especiales")
print("="*60)

# Datos de prueba con acentos y ñ
test_empresa = {
    "razon_social": "Pymes Innovación S.A.C.",
    "nombre_comercial": "Pymes Inteligente - Región Ñoño",
    "ruc": "20123456789_test",
    "direccion": "Calle Español Nº 123, Piso 2º",
}

print("\n📝 Datos de prueba:")
for key, value in test_empresa.items():
    print(f"  {key}: {value}")

print("\n✅ TEST 1: Creación directa (ORM)")
try:
    empresa = Empresa.objects.create(**test_empresa)
    print(f"✓ Empresa creada exitosamente")
    print(f"  ID: {empresa.id}")
    print(f"  Razón Social: {empresa.razon_social}")
    print(f"  Nombre Comercial: {empresa.nombre_comercial}")
    print(f"  Dirección: {empresa.direccion}")
    
    # Limpieza
    empresa.delete()
    print(f"\n✓ Test completado exitosamente")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
