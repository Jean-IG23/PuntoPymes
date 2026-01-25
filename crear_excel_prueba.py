#!/usr/bin/env python
"""
CREA ARCHIVO EXCEL DE PRUEBA PARA CARGA MASIVA
"""

import pandas as pd

# Datos de prueba realistas
empleados_data = [
    {
        'DOCUMENTO': '1234567890',
        'NOMBRES': 'Maria Jose',
        'APELLIDOS': 'Gonzalez Rodriguez',
        'EMAIL': 'maria.gonzalez@empresa.com',
        'TELEFONO': '+593987654321',
        'SUCURSAL': 'Casa Matriz',
        'AREA': 'Recursos Humanos',
        'DEPARTAMENTO': 'Administracion',
        'PUESTO': 'Gerente de RRHH',
        'TURNO': 'Manana',
        'SUELDO': 1200.00,
        'FECHA_INGRESO': '2024-01-15',
        'ROL': 'RRHH',
        'ES_SUPERVISOR': 'SI'
    },
    {
        'DOCUMENTO': '0987654321',
        'NOMBRES': 'Carlos Alberto',
        'APELLIDOS': 'Perez Lopez',
        'EMAIL': 'carlos.perez@empresa.com',
        'TELEFONO': '+593987654322',
        'SUCURSAL': 'Sucursal Norte',
        'AREA': 'Ventas',
        'DEPARTAMENTO': 'Comercial',
        'PUESTO': 'Vendedor Senior',
        'TURNO': 'Tarde',
        'SUELDO': 800.00,
        'FECHA_INGRESO': '2024-02-01',
        'ROL': 'EMPLEADO',
        'ES_SUPERVISOR': 'NO'
    },
    {
        'DOCUMENTO': '1122334455',
        'NOMBRES': 'Ana Gabriela',
        'APELLIDOS': 'Martinez Silva',
        'EMAIL': 'ana.martinez@empresa.com',
        'TELEFONO': '+593987654323',
        'SUCURSAL': 'Sucursal Norte',
        'AREA': 'Operaciones',
        'DEPARTAMENTO': 'Logistica',
        'PUESTO': 'Coordinador de Logistica',
        'TURNO': 'Manana',
        'SUELDO': 950.00,
        'FECHA_INGRESO': '2024-01-20',
        'ROL': 'GERENTE',
        'ES_SUPERVISOR': 'SI'
    },
    {
        'DOCUMENTO': '5566778899',
        'NOMBRES': 'Roberto Carlos',
        'APELLIDOS': 'Sanchez Morales',
        'EMAIL': 'roberto.sanchez@empresa.com',
        'TELEFONO': '+593987654324',
        'SUCURSAL': 'Sucursal Sur',
        'AREA': 'Tecnologia',
        'DEPARTAMENTO': 'Desarrollo',
        'PUESTO': 'Desarrollador Senior',
        'TURNO': 'Manana',
        'SUELDO': 1100.00,
        'FECHA_INGRESO': '2024-03-01',
        'ROL': 'EMPLEADO',
        'ES_SUPERVISOR': 'NO'
    },
    {
        'DOCUMENTO': '4433221100',
        'NOMBRES': 'Luisa Fernanda',
        'APELLIDOS': 'Torres Ramirez',
        'EMAIL': 'luisa.torres@empresa.com',
        'TELEFONO': '+593987654325',
        'SUCURSAL': 'Sucursal Sur',
        'AREA': 'Finanzas',
        'DEPARTAMENTO': 'Contabilidad',
        'PUESTO': 'Contador Senior',
        'TURNO': 'Manana',
        'SUELDO': 900.00,
        'FECHA_INGRESO': '2024-02-15',
        'ROL': 'GERENTE',
        'ES_SUPERVISOR': 'SI'
    }
]

# Crear DataFrame
df = pd.DataFrame(empleados_data)

# Guardar archivo Excel
filename = 'empleados_prueba.xlsx'
df.to_excel(filename, index=False, engine='openpyxl')

print(f"EXITO: Archivo '{filename}' creado con {len(empleados_data)} empleados de prueba")
print("\nEMPLEADOS INCLUIDOS:")
for emp in empleados_data:
    print(f"- {emp['NOMBRES']} {emp['APELLIDOS']} ({emp['ROL']}) en {emp['SUCURSAL']}")

print("\nCREDENCIALES DE ACCESO:")
print("- Username: email del empleado")
print("- Password: numero de documento (cedula)")

print("\nINSTRUCCIONES:")
print("1. Ve a la aplicacion -> Empleados -> Carga Masiva")
print("2. Sube el archivo empleados_prueba.xlsx")
print("3. Verifica que se creen sucursales, areas, departamentos, etc.")
print("4. Revisa que los gerentes se asignen correctamente")
print("5. Prueba login con las credenciales mostradas")