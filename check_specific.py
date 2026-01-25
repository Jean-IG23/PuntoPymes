#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from core.models import Sucursal, Departamento

# Verificar Casa Matriz
casa_matriz = Sucursal.objects.filter(nombre='Casa Matriz').first()
print('Casa Matriz:', casa_matriz)

if casa_matriz:
    depts_casa_matriz = list(Departamento.objects.filter(sucursal=casa_matriz).values_list('nombre', flat=True))
    print('Departamentos en Casa Matriz:', depts_casa_matriz)

# Verificar departamentos específicos del usuario
departamentos_usuario = ['Administración', 'Talento Humano', 'Ventas']

for dept_name in departamentos_usuario:
    dept = Departamento.objects.filter(nombre=dept_name).first()
    if dept:
        print(f'Departamento "{dept_name}" existe en sucursal: {dept.sucursal.nombre}')
    else:
        print(f'Departamento "{dept_name}" NO existe')