#!/usr/bin/env python
"""
Script to simulate the frontend filtering logic and verify it works correctly
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Sucursal, Departamento
from core.serializers import DepartamentoSerializer

print("=" * 70)
print("SIMULANDO LÓGICA DE FILTRADO FRONTEND")
print("=" * 70)

# Cargar todas las sucursales
sucursales = Sucursal.objects.all()
print(f"\n📍 Sucursales disponibles: {sucursales.count()}")
for s in sucursales:
    print(f"  ✓ ID {s.id}: {s.nombre}")

# Obtener todos los departamentos (como lo haría el frontend)
todos_deptos = Departamento.objects.all()
deptos_serializados = DepartamentoSerializer(todos_deptos, many=True).data

print(f"\n📦 Total de departamentos cargados: {len(deptos_serializados)}")

# Simulación 1: Sucursal 2 (Matriz)
print("\n" + "=" * 70)
print("SIMULACIÓN 1: Filtrado para SUCURSAL 2 (Matriz)")
print("=" * 70)

sucursal_id = 2
deptos_filtrados = [d for d in deptos_serializados if d['sucursal_id'] == sucursal_id]

print(f"\n🔍 Filtrando departamentos con sucursal_id = {sucursal_id}")
print(f"✅ Departamentos encontrados: {len(deptos_filtrados)}")

if deptos_filtrados:
    print("\n📋 Detalle de departamentos filtrados:")
    for i, d in enumerate(deptos_filtrados):
        print(f"  [{i}] {d['nombre']}")
        print(f"      ID: {d['id']}, sucursal_id: {d['sucursal_id']}, nombre_sucursal: {d.get('nombre_sucursal', 'N/A')}")
else:
    print("❌ NO SE ENCONTRARON DEPARTAMENTOS")
    print("\n🔎 Verificando estructura de datos:")
    if deptos_serializados:
        print(f"  Primer departamento: {deptos_serializados[0]}")

# Simulación 2: Sucursal 3 (Sucursal Norte)
print("\n" + "=" * 70)
print("SIMULACIÓN 2: Filtrado para SUCURSAL 3 (Sucursal Norte)")
print("=" * 70)

sucursal_id = 3
deptos_filtrados = [d for d in deptos_serializados if d['sucursal_id'] == sucursal_id]

print(f"\n🔍 Filtrando departamentos con sucursal_id = {sucursal_id}")
print(f"✅ Departamentos encontrados: {len(deptos_filtrados)}")

if deptos_filtrados:
    print("\n📋 Detalle de departamentos filtrados:")
    for i, d in enumerate(deptos_filtrados):
        print(f"  [{i}] {d['nombre']} (ID: {d['id']})")

# Simulación 3: Verificar tipos de datos
print("\n" + "=" * 70)
print("VERIFICACIÓN DE TIPOS DE DATOS")
print("=" * 70)

if deptos_serializados:
    d = deptos_serializados[0]
    print(f"\nPrimer departamento:")
    print(f"  sucursal_id type: {type(d['sucursal_id'])} = {d['sucursal_id']}")
    print(f"  sucursal type: {type(d['sucursal'])} = {d['sucursal']}")
    
    print(f"\nComparación de tipos para sucursal_id=2:")
    print(f"  d['sucursal_id'] == 2: {d['sucursal_id'] == 2}")
    print(f"  d['sucursal_id'] == '2': {d['sucursal_id'] == '2'}")
    print(f"  int(d['sucursal']) == 2: {int(d['sucursal']) == 2}")

# Estadísticas finales
print("\n" + "=" * 70)
print("ESTADÍSTICAS FINALES")
print("=" * 70)

distribution = {}
for d in deptos_serializados:
    sucursal_id = d['sucursal_id']
    if sucursal_id not in distribution:
        distribution[sucursal_id] = []
    distribution[sucursal_id].append(d['nombre'])

print(f"\n📊 Distribución por sucursal:")
for sucursal_id in sorted(distribution.keys()):
    nombres = distribution[sucursal_id]
    print(f"  Sucursal {sucursal_id}: {len(nombres)} departamentos")
    for nombre in nombres[:3]:
        print(f"    • {nombre}")
    if len(nombres) > 3:
        print(f"    ... y {len(nombres) - 3} más")

print("\n✅ PRUEBA COMPLETADA")
