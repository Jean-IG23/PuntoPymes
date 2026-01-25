#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Empresa, Sucursal, Departamento
from personal.models import Empleado

def check_database():
    print("=== VERIFICACION DE BASE DE DATOS ===\n")

    # Empresa
    empresa = Empresa.objects.first()
    print(f"Empresa: {empresa}")
    if empresa:
        print(f"   RUC: {empresa.ruc}")
        print(f"   Estado: {empresa.estado}")

    # Sucursales
    sucursales = Sucursal.objects.filter(empresa=empresa) if empresa else []
    print(f"\nSucursales ({len(sucursales)}):")
    for s in sucursales:
        tipo = 'Matriz' if s.es_matriz else 'Sucursal'
        print(f"   - {s.nombre} ({tipo})")

    # Departamentos
    departamentos = Departamento.objects.filter(sucursal__empresa=empresa) if empresa else []
    print(f"\nDepartamentos ({len(departamentos)}):")
    for d in departamentos:
        print(f"   - {d.nombre} (Sucursal: {d.sucursal.nombre})")

    # Empleados
    empleados = Empleado.objects.filter(empresa=empresa) if empresa else []
    print(f"\nEmpleados ({len(empleados)}):")
    for e in empleados:
        print(f"   - {e.nombres} {e.apellidos} ({e.rol}) - {e.documento}")

    print("\n=== FIN VERIFICACION ===")

if __name__ == "__main__":
    check_database()