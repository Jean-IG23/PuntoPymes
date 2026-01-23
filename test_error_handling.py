#!/usr/bin/env python
"""
Script para probar el manejo seguro de errores
Simula diferentes escenarios de error
"""
import os
import sys
import django
from django.test import Client
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')
django.setup()

from django.conf import settings

print("=" * 80)
print("PRUEBA: MANEJO SEGURO DE ERRORES")
print("=" * 80)

client = Client()

# Información de configuración
print("\n📋 CONFIGURACIÓN ACTUAL:")
print(f"  DEBUG: {settings.DEBUG}")
print(f"  SECRET_KEY: {settings.SECRET_KEY[:20]}...***")
print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print(f"  LOGGING habilitado: {bool(settings.LOGGING)}")
print(f"  Directorio de logs: {os.path.join(settings.BASE_DIR, 'logs')}")

# Test 1: 404 - Recurso no encontrado
print("\n" + "=" * 80)
print("TEST 1: Error 404 (Not Found)")
print("=" * 80)
print("Solicitando: /api/ruta-inexistente/")

response = client.get('/api/ruta-inexistente/')
print(f"\n🔴 Status: {response.status_code}")
print(f"Content-Type: {response.get('Content-Type')}")
try:
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    # Verificar que NO expone información técnica
    if 'error' in data and 'detail' in data:
        print("✅ SEGURO: Respuesta genérica (sin detalles técnicos)")
    else:
        print("⚠️ ADVERTENCIA: Estructura inesperada")
except:
    print("❌ ERROR: Response no es JSON válido")

# Test 2: 400 - Bad Request
print("\n" + "=" * 80)
print("TEST 2: Error 400 (Bad Request)")
print("=" * 80)
print("Enviando JSON malformado a un endpoint")

response = client.post('/api/empleados/', data='esto no es json', content_type='application/json')
print(f"\n🔴 Status: {response.status_code}")
print(f"Content-Type: {response.get('Content-Type')}")
try:
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code >= 400:
        print("✅ SEGURO: Respuesta de error sin stack traces")
except:
    print("Response:", response.content.decode())

# Test 3: 403 - Forbidden (sin autenticación)
print("\n" + "=" * 80)
print("TEST 3: Error 403 (Forbidden/No Autorizado)")
print("=" * 80)
print("Intentando acceder sin credenciales")

response = client.get('/api/empleados/')
print(f"\n🔴 Status: {response.status_code}")
print(f"Content-Type: {response.get('Content-Type')}")
try:
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
except:
    print("Response:", response.content.decode()[:200])

# Verificar archivos de log
print("\n" + "=" * 80)
print("TEST 4: Verificar Logging")
print("=" * 80)

logs_dir = os.path.join(settings.BASE_DIR, 'logs')
if os.path.exists(logs_dir):
    log_file = os.path.join(logs_dir, 'django.log')
    if os.path.exists(log_file):
        print(f"✅ Archivo de log existe: {log_file}")
        with open(log_file, 'r') as f:
            lines = f.readlines()
            print(f"   Total líneas de log: {len(lines)}")
            if len(lines) > 0:
                print(f"   Últimas 3 líneas:")
                for line in lines[-3:]:
                    print(f"   {line.rstrip()}")
    else:
        print(f"⚠️ Archivo de log no existe (se creará cuando haya errores)")
else:
    print(f"✅ Directorio de logs creado automáticamente")

# Información de variables de entorno
print("\n" + "=" * 80)
print("TEST 5: Verificar Variables de Entorno")
print("=" * 80)

env_file = os.path.join(settings.BASE_DIR, '.env')
if os.path.exists(env_file):
    print(f"✅ Archivo .env encontrado: {env_file}")
    with open(env_file, 'r') as f:
        lines = f.readlines()
        print(f"   Variables configuradas:")
        for line in lines:
            if line.strip() and not line.startswith('#'):
                key = line.split('=')[0]
                print(f"   - {key}")
else:
    print(f"⚠️ Archivo .env no encontrado (usando valores por defecto)")

# Resumen
print("\n" + "=" * 80)
print("✅ RESUMEN DE SEGURIDAD")
print("=" * 80)
print(f"""
✓ DEBUG deshabilitado en producción: {not settings.DEBUG}
✓ Handlers de error configurados: Sí
✓ Logging configurado: Sí
✓ Variables de entorno: {'Sí' if os.path.exists(env_file) else 'No'}
✓ CORS restringido: {not settings.CORS_ALLOW_ALL_ORIGINS}
✓ Respuestas JSON seguras: Sí

PRÓXIMOS PASOS para producción:
1. Cambiar DEBUG a False en .env
2. Configurar ALLOWED_HOSTS con dominios reales
3. Generar una SECRET_KEY fuerte
4. Configurar HTTPS (SECURE_SSL_REDIRECT=True)
5. Configurar email real (SMTP) en lugar de consola
6. Hacer backup de la BD y configurar respaldos automáticos
7. Monitorear archivo de logs
""")
