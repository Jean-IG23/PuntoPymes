# -*- coding: utf-8 -*-
"""
Middleware para manejar problemas de encoding en Windows con caracteres especiales
(ñ, acentos, etc.)
"""

import json
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class EncodingFixMiddleware(MiddlewareMixin):
    """
    Middleware que normaliza la codificación de datos JSON en POST/PUT/PATCH
    para evitar errores de 'charmap' codec en Windows.
    """
    
    def process_request(self, request):
        """Intercepta y normaliza los datos de entrada"""
        
        # Solo procesamos POST, PUT, PATCH, DELETE
        if request.method not in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return None
        
        # Solo procesamos application/json
        if request.content_type and 'application/json' not in request.content_type:
            return None
        
        try:
            # Lee el body como UTF-8 explícitamente
            body = request.body.decode('utf-8')
            
            if body:
                # Parsea el JSON
                data = json.loads(body)
                
                # Normaliza los strings para asegurar que son UTF-8 válidos
                normalized_data = self._normalize_encoding(data)
                
                # Re-codifica el body
                request._body = json.dumps(normalized_data, ensure_ascii=False).encode('utf-8')
                
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            # Si hay error, loguea pero continúa con el request original
            logger.warning(f"EncodingFixMiddleware: Error normalizando {e}")
            pass
        
        return None
    
    def _normalize_encoding(self, obj):
        """
        Recursivamente normaliza objetos para asegurar encoding UTF-8 válido
        """
        if isinstance(obj, dict):
            return {key: self._normalize_encoding(value) for key, value in obj.items()}
        
        elif isinstance(obj, list):
            return [self._normalize_encoding(item) for item in obj]
        
        elif isinstance(obj, str):
            # Asegurar que es UTF-8 válido
            try:
                # Intenta encodar y decodificar para validar
                obj.encode('utf-8').decode('utf-8')
                return obj
            except (UnicodeEncodeError, UnicodeDecodeError):
                # Si falla, reemplaza caracteres inválidos
                return obj.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
        
        return obj
