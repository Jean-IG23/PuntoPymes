"""
Custom Error Handlers for Security
Retorna respuestas JSON genéricas para no exponer información técnica
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


def handler400(request, exception=None):
    """
    Bad Request Handler (400)
    Cliente envió una solicitud malformada
    """
    logger.warning(f'400 Bad Request: {request.path}')
    return JsonResponse(
        {
            'error': 'Bad Request',
            'detail': 'La solicitud no es válida. Verifica los parámetros enviados.',
            'status': 400
        },
        status=400
    )


def handler403(request, exception=None):
    """
    Forbidden Handler (403)
    Usuario no tiene permisos para acceder al recurso
    """
    logger.warning(f'403 Forbidden: {request.path} - User: {request.user}')
    return JsonResponse(
        {
            'error': 'Forbidden',
            'detail': 'No tienes permisos para acceder a este recurso.',
            'status': 403
        },
        status=403
    )


def handler404(request, exception=None):
    """
    Not Found Handler (404)
    El recurso solicitado no existe
    """
    logger.info(f'404 Not Found: {request.path}')
    return JsonResponse(
        {
            'error': 'Not Found',
            'detail': 'El recurso que buscas no existe.',
            'status': 404
        },
        status=404
    )


def handler500(request):
    """
    Internal Server Error Handler (500)
    Error no controlado en el servidor
    
    IMPORTANTE: En DEBUG=False, esto es lo único que los clientes ven.
    Los detalles se guardan en logs para los administradores.
    """
    logger.error(f'500 Internal Server Error: {request.path}', exc_info=True)
    
    return JsonResponse(
        {
            'error': 'Internal Server Error',
            'detail': 'Ocurrió un error en el servidor. El equipo técnico ha sido notificado.',
            'status': 500
        },
        status=500
    )


def handler_csrf(request, reason=''):
    """
    CSRF Handler (403)
    Token CSRF inválido o faltante
    """
    logger.warning(f'CSRF violation: {request.path} - Reason: {reason}')
    return JsonResponse(
        {
            'error': 'Forbidden',
            'detail': 'Violación de seguridad CSRF. Recarga la página e intenta de nuevo.',
            'status': 403
        },
        status=403
    )
