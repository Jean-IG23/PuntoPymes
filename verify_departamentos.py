#!/usr/bin/env python
"""
Script para verificar departamentos en la base de datos
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Departamento, Sucursal

print("\n" + "="*80)
print("VERIFICACIÓN DE DEPARTAMENTOS EN LA BD")
print("="*80 + "\n")

# Mostrar todas las sucursales
print("📍 SUCURSALES:")
sucursales = Sucursal.objects.all()
for s in sucursales:
    print(f"  [{s.id}] {s.nombre} (Empresa: {s.empresa.nombre_comercial if s.empresa else 'N/A'})")

print("\n📂 DEPARTAMENTOS:")
departamentos = Departamento.objects.all().select_related('sucursal', 'area')
if not departamentos:
    print("  ⚠️  NO HAY DEPARTAMENTOS EN LA BD")
else:
    for d in departamentos:
        area_name = d.area.nombre if d.area else "Sin área"
        empresa_name = d.sucursal.empresa.nombre_comercial if d.sucursal and d.sucursal.empresa else "N/A"
        print(f"  [{d.id}] {d.nombre}")
        print(f"       └─ Sucursal: {d.sucursal.nombre} (ID: {d.sucursal.id})")
        print(f"       └─ Área: {area_name}")
        print(f"       └─ Empresa: {empresa_name}")

print("\n📊 RESUMEN:")
print(f"  Total Sucursales: {sucursales.count()}")
print(f"  Total Departamentos: {departamentos.count()}")

# Análisis de distribución
print("\n🔍 DEPARTAMENTOS POR SUCURSAL:")
for s in sucursales:
    count = departamentos.filter(sucursal_id=s.id).count()
    deptos = departamentos.filter(sucursal_id=s.id)
    print(f"  Sucursal {s.id} ({s.nombre}): {count} departamentos")
    for d in deptos:
        print(f"    - {d.nombre}")

print("\n" + "="*80)
