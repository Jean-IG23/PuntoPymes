#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Sucursal, Empresa

def setup_gps():
    empresa = Empresa.objects.first()
    if not empresa:
        print("No hay empresa configurada")
        return

    print(f"Configurando GPS para empresa: {empresa}")

    # Configurar GPS para todas las sucursales
    sucursales = Sucursal.objects.filter(empresa=empresa)

    gps_configs = {
        'Casa Matriz': {'lat': -0.1807, 'lng': -78.4678, 'radio': 100},
        'Sucursal Norte': {'lat': -0.1707, 'lng': -78.4578, 'radio': 50},
        'Sucursal Sur': {'lat': -0.1907, 'lng': -78.4778, 'radio': 50},
        'Sucursal Manta': {'lat': -0.9677, 'lng': -80.7127, 'radio': 75},
    }

    for sucursal in sucursales:
        if sucursal.nombre in gps_configs:
            config = gps_configs[sucursal.nombre]
            sucursal.latitud = config['lat']
            sucursal.longitud = config['lng']
            sucursal.radio_metros = config['radio']
            sucursal.save()
            print(f"OK {sucursal.nombre}: GPS configurado")
        else:
            print(f"WARN {sucursal.nombre}: Sin configuración GPS")

    # Verificar configuración final
    print("\n=== CONFIGURACIÓN FINAL ===")
    for s in sucursales:
        gps = f"GPS: ({s.latitud}, {s.longitud}) - Radio: {s.radio_metros}m" if s.latitud else "GPS: NO CONFIGURADO"
        print(f"{s.nombre}: {gps}")

if __name__ == "__main__":
    setup_gps()