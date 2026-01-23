"""
VALIDACIÓN DE SEGURIDAD BACKEND
Talent Track V2.0 - Django REST Framework

Este archivo contiene validaciones que deben estar implementadas
en el backend para garantizar seguridad.
"""

# ============================================
# VALIDACIÓN 1: AUTENTICACIÓN
# ============================================

# settings.py debe tener:
"""
INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    ...
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,  # De .env
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "https://tudominio.com",
]

CORS_ALLOW_CREDENTIALS = True
"""

# ============================================
# VALIDACIÓN 2: AISLAMIENTO MULTI-INQUILINO
# ============================================

"""
En views.py o mixins.py debe existir:

class EmpresaFilterMixin:
    '''Filtra queryset por empresa actual del usuario'''
    
    def get_queryset(self):
        empresa_id = self.request.user.empresa_id
        base_queryset = super().get_queryset()
        return base_queryset.filter(empresa_id=empresa_id)

# En cada ViewSet:
class EmpleadoViewSet(viewsets.ModelViewSet, EmpresaFilterMixin):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    
    # ✅ get_queryset() se sobrescribe con el mixin
    # ✅ Todos los requests filtrados por empresa_id del user
"""

# ============================================
# VALIDACIÓN 3: PREVENCIÓN SQL INJECTION
# ============================================

"""
❌ NUNCA usar raw SQL:

# MALO:
empleados = Empleado.objects.raw(f"SELECT * FROM empleados WHERE nombre LIKE '{search_term}'")

✅ SIEMPRE usar ORM:

# BUENO:
empleados = Empleado.objects.filter(nombres__icontains=search_term)

# MEJOR:
from django.db.models import Q
empleados = Empleado.objects.filter(
    Q(nombres__icontains=search_term) |
    Q(apellidos__icontains=search_term) |
    Q(email__icontains=search_term)
)
"""

# ============================================
# VALIDACIÓN 4: HASHING DE PASSWORDS
# ============================================

"""
En models.py:

from django.contrib.auth.hashers import make_password

class Empleado(models.Model):
    ...
    password = models.CharField(max_length=255)  # Nunca CharField para passwords
    
    def set_password(self, raw_password):
        '''Hashear password con PBKDF2 o Argon2'''
        self.password = make_password(raw_password)
        self.save()

# Mejor: Usar Django's User model:
from django.contrib.auth.models import User

class EmpleadoProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    # User model ya incluye hashing automático
"""

# ============================================
# VALIDACIÓN 5: VALIDACIÓN DE ARCHIVOS
# ============================================

"""
En serializers.py o views.py:

import mimetypes
from django.core.exceptions import ValidationError

EXTENSIONES_PERMITIDAS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
TAMAÑO_MAXIMO_MB = 10

def validar_archivo(file):
    # 1. Validar extensión
    nombre, ext = os.path.splitext(file.name)
    if ext.lower() not in EXTENSIONES_PERMITIDAS:
        raise ValidationError(f"Extensión {ext} no permitida")
    
    # 2. Validar tamaño
    if file.size > TAMAÑO_MAXIMO_MB * 1024 * 1024:
        raise ValidationError(f"Archivo mayor a {TAMAÑO_MAXIMO_MB}MB")
    
    # 3. Validar MIME type (double-check)
    tipo_mime, _ = mimetypes.guess_type(file.name)
    tipos_permitidos = {'application/pdf', 'image/jpeg', 'image/png', 'application/msword'}
    if tipo_mime not in tipos_permitidos:
        raise ValidationError("Tipo de archivo no válido")
    
    return True

class DocumentoSerializer(serializers.ModelSerializer):
    archivo = serializers.FileField(validators=[validar_archivo])
    
    def create(self, validated_data):
        file = validated_data['archivo']
        
        # Renombrar con UUID
        import uuid
        nombre_original = file.name
        ext = os.path.splitext(nombre_original)[1]
        file.name = f"{uuid.uuid4()}{ext}"
        
        return super().create(validated_data)
"""

# ============================================
# VALIDACIÓN 6: RATE LIMITING
# ============================================

"""
En settings.py:

INSTALLED_APPS = [
    ...
    'django_ratelimit',  # pip install django-ratelimit
    ...
]

En views.py:

from django_ratelimit.decorators import ratelimit

@ratelimit(key='user', rate='60/m', method='GET')
class EmpleadoViewSet(viewsets.ModelViewSet):
    '''Máximo 60 GETs por minuto por usuario'''
    pass

# O con DRF Throttling:
from rest_framework.throttling import UserRateThrottle

class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'  # 60 requests/minuto

class SustainedRateThrottle(UserRateThrottle):
    scope = 'sustained'  # 1000 requests/hora

class EmpleadoViewSet(viewsets.ModelViewSet):
    throttle_classes = [BurstRateThrottle, SustainedRateThrottle]
    queryset = Empleado.objects.all()

# En settings.py:
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'burst': '60/minute',
        'sustained': '1000/hour'
    }
}
"""

# ============================================
# VALIDACIÓN 7: MANEJO SEGURO DE ERRORES
# ============================================

"""
En settings.py (DEBUG según entorno):

import os
from dotenv import load_dotenv

load_dotenv()

DEBUG = os.getenv('DEBUG', 'False') == 'True'  # False en producción

# Si DEBUG=False, los errores no muestran stack traces

En views.py:

from rest_framework.response import Response
from rest_framework.status import HTTP_500_INTERNAL_SERVER_ERROR

def exception_handler(exc, context):
    '''Handler personalizado para no exponer detalles técnicos'''
    
    if DEBUG:
        # En desarrollo, mostrar detalles completos
        return exception_handler_original(exc, context)
    else:
        # En producción, mensaje genérico
        return Response(
            {"error": "Error interno del servidor"},
            status=HTTP_500_INTERNAL_SERVER_ERROR
        )

# Los errores se registran en logs, no en respuesta HTTP:
import logging
logger = logging.getLogger(__name__)

try:
    resultado = some_operation()
except Exception as e:
    logger.error(f"Error crítico: {str(e)}", exc_info=True)
    return Response({"error": "Error interno"}, status=500)
"""

# ============================================
# VALIDACIÓN 8: GESTIÓN DE SECRETOS
# ============================================

"""
En raíz del proyecto, archivo .env (NO commitear):

DEBUG=False
SECRET_KEY=tu-clave-secreta-de-64-caracteres-aqui
DATABASE_URL=postgresql://user:pass@localhost:5432/talenttrack
ALLOWED_HOSTS=localhost,127.0.0.1,tudominio.com
CORS_ALLOWED_ORIGINS=http://localhost:4200,https://tudominio.com
JWT_SECRET=tu-jwt-secret-aqui

En settings.py:

import os
from dotenv import load_dotenv

load_dotenv()  # Cargar .env

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')

if not SECRET_KEY:
    raise ValueError("SECRET_KEY no configurado en .env")

En .gitignore:

.env
.env.local
.env.*.local
*.pyc
__pycache__/
*.db
migrations/
"""

# ============================================
# VALIDACIÓN 9: AUDITORÍA
# ============================================

"""
En models.py:

from django.db import models
from django.contrib.auth.models import User

class AuditLog(models.Model):
    ACCIONES = [
        ('CREATE', 'Crear'),
        ('READ', 'Leer'),
        ('UPDATE', 'Actualizar'),
        ('DELETE', 'Eliminar'),
    ]
    
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    tabla = models.CharField(max_length=100)
    accion = models.CharField(max_length=10, choices=ACCIONES)
    id_registro = models.IntegerField()
    valor_anterior = models.JSONField(null=True, blank=True)
    valor_nuevo = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['usuario', 'timestamp']),
            models.Index(fields=['empresa', 'tabla']),
        ]

# Signal para auditar cambios automáticamente:
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=Empleado)
def audit_empleado_change(sender, instance, created, **kwargs):
    accion = 'CREATE' if created else 'UPDATE'
    request = kwargs.get('request')
    ip = request.META.get('REMOTE_ADDR') if request else '0.0.0.0'
    
    AuditLog.objects.create(
        usuario=instance.empresa.propietario,
        empresa=instance.empresa,
        tabla='empleado',
        accion=accion,
        id_registro=instance.id,
        valor_nuevo={'nombres': instance.nombres, 'email': instance.email},
        ip_address=ip
    )
"""

# ============================================
# VALIDACIÓN 10: HEADERS DE SEGURIDAD
# ============================================

"""
En settings.py (Django Middleware):

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',  # ✅ Debe estar
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # ✅ Previene Clickjacking
    ...
]

# Headers adicionales:
SECURE_BROWSER_XSS_FILTER = True  # X-XSS-Protection
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),  # Ajustar según necesidad
    'style-src': ("'self'", "'unsafe-inline'"),
    'img-src': ("'self'", 'data:', 'https:'),
}

# En producción:
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'
"""

# ============================================
# CHECKLIST DE VALIDACIÓN
# ============================================

CHECKLIST = """
🛡️  CHECKLIST DE SEGURIDAD BACKEND

AUTENTICACIÓN:
☐ JWT implementado con expiración de 15 minutos
☐ Refresh tokens con expiración de 24 horas
☐ Passwords hasheados con PBKDF2 o Argon2
☐ Endpoint de login valida credenciales correctamente

AISLAMIENTO MULTI-INQUILINO:
☐ Cada ViewSet filtra por empresa_id del usuario
☐ Imposible acceder a datos de otra empresa (IDOR test)
☐ Auditoría registra accesos por empresa

PREVENCIÓN SQL INJECTION:
☐ NUNCA hay raw SQL en el código
☐ Todas las búsquedas usan ORM de Django
☐ Parámetros de búsqueda se pasan como argumentos, no concatenados

VALIDACIÓN DE DATOS:
☐ Archivos validan extensión y MIME type
☐ Archivos se guardan con UUID (no nombre original)
☐ Tamaño máximo de archivo es limitado

RATE LIMITING:
☐ API limita 60 requests/minuto por usuario
☐ Endpoints críticos tienen límites más estrictos

MANEJO DE ERRORES:
☐ En producción (DEBUG=False) no se exponen stack traces
☐ Errores se registran en logs internos
☐ Usuario solo ve: {"error": "Error interno del servidor"}

GESTIÓN DE SECRETOS:
☐ .env no está en git (incluido en .gitignore)
☐ SECRET_KEY se carga desde .env
☐ Database password se carga desde .env
☐ Variables de entorno se usan para DEBUG, ALLOWED_HOSTS, etc

AUDITORÍA:
☐ Tabla AuditLog registra CREATE, READ, UPDATE, DELETE
☐ Cada log incluye usuario, empresa, timestamp, IP
☐ Logs son inmutables (no se pueden editar)

HEADERS DE SEGURIDAD:
☐ X-Frame-Options: DENY
☐ X-Content-Type-Options: nosniff
☐ X-XSS-Protection: 1; mode=block
☐ Strict-Transport-Security (si HTTPS)
☐ Content-Security-Policy configurado

CORS:
☐ CORS limitado a dominios específicos
☐ Credenciales solo en localhost/tudominio
☐ Métodos permitidos: GET, POST, PUT, DELETE (no todos)

CERTIFICADOS HTTPS:
☐ (Para producción) Certificado SSL válido
☐ (Para producción) Redirección HTTP → HTTPS
☐ (Para producción) HSTS habilitado
"""

print(CHECKLIST)
