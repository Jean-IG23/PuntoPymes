#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Sucursal, Empresa

# Verificar empresa
empresa = Empresa.objects.first()
print(f"Empresa: {empresa}")

if empresa:
    sucursales = Sucursal.objects.filter(empresa=empresa)
    print(f"\nSucursales ({len(sucursales)}):")

    for s in sucursales:
        gps_info = ""
        if s.latitud and s.longitud:
            gps_info = f"GPS: ({s.latitud}, {s.longitud}) - Radio: {s.radio_metros}m"
        else:
            gps_info = "GPS: NO CONFIGURADO"

        print(f"  - {s.nombre}: {gps_info}")

        # Verificar empleados asignados
        empleados = s.empleados.all()
        print(f"    Empleados asignados: {len(empleados)}")
        for emp in empleados[:3]:  # Mostrar máximo 3
            print(f"      * {emp.nombres} {emp.apellidos}")
        if len(empleados) > 3:
            print(f"      ... y {len(empleados) - 3} más")
else:
    print("No hay empresa configurada")