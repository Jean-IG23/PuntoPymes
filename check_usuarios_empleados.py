#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.contrib.auth.models import User
from personal.models import Empleado

print("🔍 VERIFICANDO USUARIOS Y SUS EMPLEADOS:\n")

usuarios = User.objects.all()
for u in usuarios:
    emp = Empleado.objects.filter(usuario=u).first()
    if emp:
        print(f"✅ {u.username} → Empleado en empresa: {emp.empresa.nombre_comercial}")
    else:
        print(f"❌ {u.username} → NO tiene Empleado asociado")

print("\n" + "="*60)
print("ESTO EXPLICA POR QUÉ NO HAY DEPARTAMENTOS")
print("="*60)
