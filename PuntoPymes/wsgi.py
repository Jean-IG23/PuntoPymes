"""
WSGI config for PuntoPymes project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

# FIX: Configurar encoding para Windows
os.environ['PYTHONIOENCODING'] = 'utf-8'

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PuntoPymes.settings')

application = get_wsgi_application()
