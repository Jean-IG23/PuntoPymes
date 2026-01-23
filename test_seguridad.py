#!/usr/bin/env python3
"""
SCRIPT DE PRUEBAS XSS Y AUTENTICACIÓN
Talent Track V2.0 - Plan de Seguridad
"""

import requests
import json
import time
from datetime import datetime
import sys

class TestadorSeguridad:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.usuario_id = None
        self.resultados = []
        
    def log_resultado(self, nombre_prueba, status, detalles):
        """Registra resultado de prueba"""
        resultado = {
            "nombre": nombre_prueba,
            "status": status,  # "PASS", "FAIL", "ERROR"
            "detalles": detalles,
            "timestamp": datetime.now().isoformat()
        }
        self.resultados.append(resultado)
        print(f"\n[{status}] {nombre_prueba}")
        print(f"    → {detalles}")
        
    # ========== BLOQUE 1: AUTENTICACIÓN ==========
    
    def prueba_AUTH_001_login_exitoso(self, email="admin@example.com", password="admin123"):
        """Valida que login exitoso genera JWT"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/login/",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and len(data["token"]) > 50:
                    self.token = data["token"]
                    self.usuario_id = data.get("user", {}).get("id")
                    self.log_resultado(
                        "AUTH-001: Login exitoso genera JWT",
                        "PASS",
                        f"Token generado: {self.token[:20]}... (longitud: {len(self.token)})"
                    )
                    return True
                else:
                    self.log_resultado("AUTH-001", "FAIL", "Token no generado o formato inválido")
                    return False
            else:
                self.log_resultado("AUTH-001", "FAIL", f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_resultado("AUTH-001", "ERROR", str(e))
            return False
    
    def prueba_AUTH_002_credenciales_invalidas(self, email="test@test.com", password="wrongpass"):
        """Valida que credenciales incorrectas se rechacen"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/login/",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 401:
                self.log_resultado(
                    "AUTH-002: Credenciales inválidas rechazadas",
                    "PASS",
                    f"Status 401: {response.json().get('error', 'Credenciales inválidas')}"
                )
                return True
            else:
                self.log_resultado("AUTH-002", "FAIL", f"Status {response.status_code}, esperaba 401")
                return False
        except Exception as e:
            self.log_resultado("AUTH-002", "ERROR", str(e))
            return False
    
    def prueba_AUTH_003_token_expirado(self):
        """Valida que token inválido se rechace"""
        try:
            headers = {"Authorization": "Bearer invalidtoken123456789"}
            response = self.session.get(
                f"{self.base_url}/api/empleados/",
                headers=headers
            )
            
            if response.status_code == 401:
                self.log_resultado(
                    "AUTH-003: Token inválido rechazado",
                    "PASS",
                    f"Status 401 retornado para token inválido"
                )
                return True
            else:
                self.log_resultado("AUTH-003", "FAIL", f"Status {response.status_code}, esperaba 401")
                return False
        except Exception as e:
            self.log_resultado("AUTH-003", "ERROR", str(e))
            return False
    
    # ========== BLOQUE 2: XSS ==========
    
    def prueba_XSS_001_sanitizacion_texto(self, datos_xss=None):
        """Intenta inyectar script en campo de observaciones"""
        if datos_xss is None:
            datos_xss = {
                "nombres": "Juan",
                "apellidos": "Pérez",
                "documento": "12345678",
                "email": "test@test.com",
                "observaciones": "<script>alert('XSS')</script>",
            }
        
        try:
            if not self.token:
                self.log_resultado("XSS-001", "SKIP", "No hay token (ejecuta AUTH-001 primero)")
                return None
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.post(
                f"{self.base_url}/api/empleados/",
                json=datos_xss,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                # Verificar que la respuesta no contiene etiquetas sin sanitizar
                response_text = response.text
                if "<script>" in response_text:
                    self.log_resultado(
                        "XSS-001: Sanitización de scripts",
                        "FAIL",
                        "Script tag encontrado sin sanitizar en respuesta"
                    )
                    return False
                else:
                    self.log_resultado(
                        "XSS-001: Sanitización de scripts",
                        "PASS",
                        "Script tag sanitizado correctamente"
                    )
                    return True
            else:
                self.log_resultado("XSS-001", "FAIL", f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_resultado("XSS-001", "ERROR", str(e))
            return False
    
    def prueba_XSS_002_evento_onerror(self):
        """Intenta inyectar evento onclick/onerror"""
        datos_xss = {
            "nombres": "Juan<img src=x onerror=\"alert('XSS')\">",
            "apellidos": "Pérez",
            "documento": "12345679",
            "email": "test2@test.com",
        }
        
        try:
            if not self.token:
                self.log_resultado("XSS-002", "SKIP", "No hay token")
                return None
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.post(
                f"{self.base_url}/api/empleados/",
                json=datos_xss,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                if "onerror" in response.text:
                    self.log_resultado(
                        "XSS-002: Sanitización de eventos",
                        "FAIL",
                        "Atributo onerror no sanitizado"
                    )
                    return False
                else:
                    self.log_resultado(
                        "XSS-002: Sanitización de eventos",
                        "PASS",
                        "Eventos maliciosos sanitizados"
                    )
                    return True
            else:
                self.log_resultado("XSS-002", "FAIL", f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_resultado("XSS-002", "ERROR", str(e))
            return False
    
    # ========== BLOQUE 3: CSRF ==========
    
    def prueba_CSRF_001_token_presente(self):
        """Valida que requests POST incluyan CSRF token"""
        try:
            if not self.token:
                self.log_resultado("CSRF-001", "SKIP", "No hay token")
                return None
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Hacer request y revisar headers
            response = self.session.get(
                f"{self.base_url}/api/empleados/",
                headers=headers
            )
            
            # Revisar si response incluye CSRF token en cookies
            if "csrftoken" in self.session.cookies:
                self.log_resultado(
                    "CSRF-001: Token anti-CSRF presente",
                    "PASS",
                    f"CSRF token encontrado en cookies"
                )
                return True
            else:
                self.log_resultado(
                    "CSRF-001: Token anti-CSRF presente",
                    "WARN",
                    "CSRF token no encontrado en cookies (puede estar en X-CSRFToken header)"
                )
                return True  # No es un FAIL, solo una observación
        except Exception as e:
            self.log_resultado("CSRF-001", "ERROR", str(e))
            return False
    
    # ========== BLOQUE 4: RATE LIMITING ==========
    
    def prueba_RATELIMIT_001_limite_requests(self, max_requests=65, timeout=1):
        """Valida que API implementa rate limiting"""
        try:
            if not self.token:
                self.log_resultado("RATELIMIT-001", "SKIP", "No hay token")
                return None
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response_429_at = None
            
            for i in range(max_requests):
                response = self.session.get(
                    f"{self.base_url}/api/empleados/",
                    headers=headers
                )
                
                if response.status_code == 429:
                    response_429_at = i + 1
                    break
                
                time.sleep(timeout / 1000)  # Pequeña pausa entre requests
            
            if response_429_at:
                self.log_resultado(
                    "RATELIMIT-001: Rate limiting activo",
                    "PASS",
                    f"Error 429 retornado en request #{response_429_at}"
                )
                return True
            else:
                self.log_resultado(
                    "RATELIMIT-001: Rate limiting activo",
                    "WARN",
                    f"No se alcanzó limite en {max_requests} requests (puede ser muy alto)"
                )
                return False
        except Exception as e:
            self.log_resultado("RATELIMIT-001", "ERROR", str(e))
            return False
    
    # ========== BLOQUE 5: ERRORES ==========
    
    def prueba_ERRORS_001_sin_stack_trace(self):
        """Valida que errores no expongan stack traces"""
        try:
            # Acceder a endpoint inexistente
            response = self.session.get(
                f"{self.base_url}/api/endpoint_inexistente_12345/"
            )
            
            if response.status_code in [404, 500]:
                response_text = response.text.lower()
                
                # Buscar patrones típicos de stack trace
                patrones_inseguros = [
                    "traceback",
                    "file \"",
                    "line ",
                    "python",
                    "django",
                    "/app/",
                    "/usr/local/"
                ]
                
                tiene_stack = any(patron in response_text for patron in patrones_inseguros)
                
                if tiene_stack:
                    self.log_resultado(
                        "ERRORS-001: Sin stack trace en error",
                        "FAIL",
                        "Stack trace detectado en respuesta de error"
                    )
                    return False
                else:
                    self.log_resultado(
                        "ERRORS-001: Sin stack trace en error",
                        "PASS",
                        "Respuesta de error no expone detalles técnicos"
                    )
                    return True
            else:
                self.log_resultado("ERRORS-001", "INFO", f"Status {response.status_code}")
                return True
        except Exception as e:
            self.log_resultado("ERRORS-001", "ERROR", str(e))
            return False
    
    # ========== REPORTE FINAL ==========
    
    def generar_reporte(self, archivo_salida="reporte_seguridad.json"):
        """Genera reporte JSON de todas las pruebas"""
        try:
            resumen = {
                "fecha": datetime.now().isoformat(),
                "total_pruebas": len(self.resultados),
                "pass": sum(1 for r in self.resultados if r["status"] == "PASS"),
                "fail": sum(1 for r in self.resultados if r["status"] == "FAIL"),
                "error": sum(1 for r in self.resultados if r["status"] == "ERROR"),
                "skip": sum(1 for r in self.resultados if r["status"] == "SKIP"),
                "resultados": self.resultados
            }
            
            with open(archivo_salida, "w") as f:
                json.dump(resumen, f, indent=2)
            
            print(f"\n{'='*60}")
            print(f"REPORTE FINAL - {resumen['fecha']}")
            print(f"{'='*60}")
            print(f"✅ PASS:  {resumen['pass']}")
            print(f"❌ FAIL:  {resumen['fail']}")
            print(f"⚠️  ERROR: {resumen['error']}")
            print(f"⏭️  SKIP:  {resumen['skip']}")
            print(f"{'='*60}")
            print(f"Reporte guardado en: {archivo_salida}")
            
            return resumen
        except Exception as e:
            print(f"Error generando reporte: {e}")
            return None
    
    def ejecutar_suite_completa(self):
        """Ejecuta todas las pruebas de seguridad"""
        print("\n" + "="*60)
        print("INICIANDO SUITE DE PRUEBAS DE SEGURIDAD")
        print("Talent Track V2.0")
        print("="*60)
        
        # Bloque 1: Autenticación
        print("\n[BLOQUE 1] AUTENTICACIÓN")
        print("-" * 60)
        self.prueba_AUTH_001_login_exitoso()
        self.prueba_AUTH_002_credenciales_invalidas()
        self.prueba_AUTH_003_token_expirado()
        
        # Bloque 2: XSS
        print("\n[BLOQUE 2] PROTECCIÓN XSS")
        print("-" * 60)
        self.prueba_XSS_001_sanitizacion_texto()
        self.prueba_XSS_002_evento_onerror()
        
        # Bloque 3: CSRF
        print("\n[BLOQUE 3] PROTECCIÓN CSRF")
        print("-" * 60)
        self.prueba_CSRF_001_token_presente()
        
        # Bloque 4: Rate Limiting
        print("\n[BLOQUE 4] RATE LIMITING")
        print("-" * 60)
        self.prueba_RATELIMIT_001_limite_requests()
        
        # Bloque 5: Manejo de Errores
        print("\n[BLOQUE 5] MANEJO DE ERRORES")
        print("-" * 60)
        self.prueba_ERRORS_001_sin_stack_trace()
        
        # Generar reporte
        self.generar_reporte()


if __name__ == "__main__":
    # Obtener URL base (opcional desde argumentos)
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    print(f"\n🔐 Testador de Seguridad - Talent Track V2.0")
    print(f"📍 URL Base: {base_url}")
    print(f"⏰ Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    testador = TestadorSeguridad(base_url)
    testador.ejecutar_suite_completa()
