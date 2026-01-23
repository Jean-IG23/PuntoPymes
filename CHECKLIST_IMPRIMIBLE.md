
# 📋 CHECKLIST DE PRUEBAS DE SEGURIDAD - VERSIÓN IMPRIMIBLE

**Talent Track V2.0** | Fecha: _____________ | Testeador: _________________________

---

## 🔐 BLOQUE 1: AUTENTICACIÓN JWT (15 min)

### ☑️ AUTH-001: Login Exitoso
```
[ ] Ingresar: admin@example.com / admin123
[ ] Verificar token en localStorage
[ ] Decodificar token en jwt.io
[ ] Verificar expiración: 15 minutos
Evidencia: 01_jwt_token_storage.png _____ (nombre archivo)
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ AUTH-002: Credenciales Inválidas
```
[ ] Intentar login con password incorrecto
[ ] Verificar error 401
[ ] Verificar mensaje: "Credenciales inválidas"
[ ] Confirmar que NO se crea token
Evidencia: 03_login_error_401.png _____ 
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ AUTH-003: Token Inválido Rechazado
```
[ ] Modificar token en localStorage a uno inválido
[ ] Intentar acceder a /api/empleados/
[ ] Verificar error 401
[ ] Confirmar redirección a login
Evidencia: 02_jwt_payload_decoded.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 1:** ___ / 3 PASS

---

## 🧬 BLOQUE 2: PROTECCIÓN XSS (20 min)

### ☑️ XSS-001: Inyección en Campo de Observaciones
```
[ ] Campo: Observaciones
[ ] Payload: <script>alert('XSS')</script>
[ ] Guardar empleado
[ ] Verificar que NO se ejecuta alert
[ ] Verificar en Network → Response
Evidencia: 04_xss_input_form.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ XSS-002: Inyección de Evento (onerror)
```
[ ] Campo: Nombres
[ ] Payload: Juan<img src=x onerror="console.error('XSS')">
[ ] Guardar
[ ] Verificar que NO aparece error en Console
[ ] Verificar que se sanitiza correctamente
Evidencia: 05_xss_safely_stored.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ XSS-003: Respuesta sin Ejecución
```
[ ] Revisar Network → Response del POST
[ ] Buscar: <script> o atributos maliciosos
[ ] Verificar encoding (&lt; en lugar de <)
Evidencia: 06_xss_response_sanitized.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ XSS-004: Headers de Seguridad
```
[ ] Console: ejecutarTodasLasPruebas()
[ ] Verificar: Content-Security-Policy
[ ] Verificar: X-XSS-Protection
Evidencia: 08_xss_console_tests_pass.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 2:** ___ / 4 PASS

---

## 🛡️ BLOQUE 3: PROTECCIÓN CSRF (10 min)

### ☑️ CSRF-001: Token en Cookies
```
[ ] Abrir DevTools → Storage → Cookies
[ ] Buscar: csrftoken
[ ] Verificar longitud > 30 caracteres
Evidencia: 09_csrf_token_cookies.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ CSRF-002: Headers en POST
```
[ ] Hacer una acción (crear empleado)
[ ] DevTools → Network → POST request
[ ] Revisar Headers:
    [ ] X-CSRF-Token: presente
    [ ] X-Requested-With: XMLHttpRequest
Evidencia: 10_csrf_post_headers.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ CSRF-003: Rechazo sin Token
```
[ ] Console: fetch sin X-CSRF-Token
[ ] Esperado: 403 Forbidden
Evidencia: 11_csrf_rejected_no_token.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 3:** ___ / 3 PASS

---

## 🔑 BLOQUE 4: CONTROL DE ACCESO - RBAC (15 min)

### ☑️ RBAC-001: Empleado Rechazado
```
[ ] Loguearse como: empleado@empresa.com
[ ] Intentar acceder: /gestion/dashboard
[ ] Resultado esperado: Redirección a /home
[ ] Verificar mensaje de error
Evidencia: 12_rbac_employee_access_denied.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ RBAC-002: Manager Accede
```
[ ] Loguearse como: gerente@empresa.com
[ ] Ir a: /home
[ ] Verificar que botón "Dashboard" existe
[ ] Hacer click → Acceso permitido
Evidencia: 14_rbac_manager_access_allowed.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ RBAC-003: Navegación Filtrada
```
[ ] Como EMPLEADO:
    [ ] Ver: Mi Perfil, Solicitudes
    [ ] NO ver: Dashboard, Mi Equipo
[ ] Como MANAGER:
    [ ] Ver: Dashboard, Mi Equipo
    [ ] NO ver: (nada restrictivo)
Evidencia: 16_rbac_employee_sidebar.png _____ / 17_rbac_manager_sidebar.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 4:** ___ / 3 PASS

---

## ⚠️ BLOQUE 5: MANEJO DE ERRORES (5 min)

### ☑️ ERROR-001: Sin Stack Trace
```
[ ] Acceder a: /api/endpoint_inexistente_123/
[ ] Revisar respuesta
[ ] Verificar que NO contiene:
    [ ] Stack trace de Python
    [ ] Rutas de archivos (/app/, /usr/)
    [ ] Nombres de variables
    [ ] Versión de Django
Evidencia: 18_error_handling_clean.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 5:** ___ / 1 PASS

---

## 🚦 BLOQUE 6: RATE LIMITING (10 min)

### ☑️ RATE-001: 60 req/min Límite
```
[ ] Terminal: python test_seguridad.py
[ ] Esperar a prueba RATELIMIT-001
[ ] Verificar: Error 429 en request #61
Evidencia: 19_rate_limiting_429.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ RATE-002: Contador Reseteado
```
[ ] Esperar 61 segundos
[ ] Ejecutar script de nuevo
[ ] Verificar: Requests 1-60 retornan 200
Evidencia: 20_rate_limiting_reset.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 6:** ___ / 2 PASS

---

## 🔑 BLOQUE 7: GESTIÓN DE SECRETOS (5 min)

### ☑️ SECRETS-001: .env en gitignore
```
[ ] Terminal: findstr ".env" .gitignore
[ ] Resultado esperado: .env ← encontrado
Evidencia: 21_env_in_gitignore.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ SECRETS-002: Nunca Commiteado
```
[ ] Terminal: git log --all -- .env
[ ] Resultado esperado: "fatal: Path '.env' does not exist"
Evidencia: 22_env_never_committed.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ SECRETS-003: Contenido Estructura
```
[ ] Ver contenido de .env
[ ] Verificar contiene:
    [ ] SECRET_KEY
    [ ] DATABASE_PASSWORD
    [ ] JWT_SECRET
    [ ] DEBUG=False
Evidencia: 23_env_content_structure.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 7:** ___ / 3 PASS

---

## 👥 BLOQUE 8: AISLAMIENTO MULTI-INQUILINO (10 min)

### ☑️ TENANT-001: Empresas Aisladas
```
[ ] Empresa A: Contar empleados (ej: 10)
[ ] Empresa B: Contar empleados (ej: 15)
[ ] Verificar: Empresa A ve SOLO 10
[ ] Verificar: Empresa B ve SOLO 15
Evidencia: 24_tenant_isolation_company_a.png _____ / 25_tenant_isolation_company_b.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ TENANT-002: IDOR Protection
```
[ ] Como Empresa A, obtener ID de empleado B (ej: 999)
[ ] Acceder: /api/empleados/999/
[ ] Resultado esperado: 403 Forbidden
Evidencia: 26_tenant_idor_protection.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 8:** ___ / 2 PASS

---

## 🗄️ BLOQUE 9: SQL INJECTION (20 min) - AVANZADO

### ☑️ SQLi-001: Búsqueda Segura
```
[ ] Campo búsqueda: Juan'; DROP TABLE empleados; --
[ ] Resultado: "No se encontraron resultados"
[ ] Tabla empleados: Intacta (no eliminada)
Evidencia: 27_sqli_search_safe.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ SQLi-002: Filtro Seguro
```
[ ] Query: ?empresa_id=1 OR 1=1
[ ] Resultado: Empleados de tu empresa SOLO
[ ] NO retorna todas las empresas
Evidencia: 28_sqli_filter_safe.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ SQLi-003: Validación de Tipos
```
[ ] ID inválido: 9999999999999999999999999
[ ] Resultado: 404 (no found)
[ ] NO error de SQL
Evidencia: 29_sqli_type_validation.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 9:** ___ / 3 PASS

---

## 📝 BLOQUE 10: AUDITORÍA (15 min) - AVANZADO

### ☑️ AUDIT-001: Log de Cambios
```
[ ] Cambiar salario: $2000 → $3000
[ ] Query BD: SELECT * FROM audit_logs WHERE tabla='personal_empleado'
[ ] Verificar: valor_anterior=2000, valor_nuevo=3000
Evidencia: 30_audit_salary_change.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ AUDIT-002: Inmutabilidad
```
[ ] Intentar UPDATE a audit_logs
[ ] Resultado esperado: Error o segundo audit_log
[ ] Logs NO pueden editarse
Evidencia: 31_audit_immutable.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ AUDIT-003: Login Attempts
```
[ ] 3 intentos fallidos de login
[ ] BD: SELECT * FROM login_attempts WHERE email='...'
[ ] Verificar: 3 registros con exitoso=False
Evidencia: 32_audit_login_attempts.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ AUDIT-004: Data Access Log
```
[ ] Manager ve perfil con salario
[ ] BD: SELECT * FROM data_access_logs WHERE campo='salario'
[ ] Verificar: Acceso registrado con timestamp
Evidencia: 33_audit_data_access.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 10:** ___ / 4 PASS

---

## 📁 BLOQUE 11: VALIDACIÓN DE ARCHIVOS (5 min) - AVANZADO

### ☑️ FILES-001: Extensiones
```
[ ] Intentar subir: malicioso.exe
[ ] Resultado: Error "Formato no permitido"
[ ] Archivos.pdf, .jpg: Se aceptan
Evidencia: 34_file_validation_exe_rejected.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ FILES-002: Metadata EXIF
```
[ ] Subir foto de perfil
[ ] Terminal: exiftool foto_descargada.jpg
[ ] Verificar: Sin GPS, sin Camera, sin Timestamp
Evidencia: 35_file_metadata_removed.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 11:** ___ / 2 PASS

---

## ✏️ BLOQUE 12: VALIDACIÓN DE ENTRADA (5 min) - AVANZADO

### ☑️ INPUT-001: HTML Injection
```
[ ] Payload: <img src=x onerror="fetch('attacker.com')">
[ ] Resultado: Se sanitiza correctamente
[ ] Network: 0 peticiones a attacker.com
Evidencia: 36_input_html_injection_safe.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

### ☑️ INPUT-002: Unicode Seguro
```
[ ] Payload: Juan名前\'; DROP
[ ] Resultado: Se guarda como texto literalmente
[ ] BD: SELECT nombres... → "Juan名前'; DROP"
Evidencia: 37_input_unicode_safe.png _____
Resultado: ☐ PASS ☐ FAIL ☐ ERROR
```

**Subtotal Bloque 12:** ___ / 2 PASS

---

## 📊 RESUMEN GENERAL

```
RESULTADOS TOTALES:

Bloque 1 (Autenticación):      ___/3  PASS
Bloque 2 (XSS):                ___/4  PASS
Bloque 3 (CSRF):               ___/3  PASS
Bloque 4 (RBAC):               ___/3  PASS
Bloque 5 (Errores):            ___/1  PASS
Bloque 6 (Rate Limit):         ___/2  PASS
Bloque 7 (Secretos):           ___/3  PASS
Bloque 8 (Multi-Tenant):       ___/2  PASS
Bloque 9 (SQL Injection):      ___/3  PASS
Bloque 10 (Auditoría):         ___/4  PASS
Bloque 11 (Validación Arch):   ___/2  PASS
Bloque 12 (Validación Input):  ___/2  PASS
                             ___________
TOTAL:                         ___/37 PASS

FALLOS:                        ___/37 FAIL

TASA DE ÉXITO:                 ___%
```

---

## 🎯 EVALUACIÓN FINAL

```
☐ Todos los tests PASARON (100%)        → EXCELENTE
☐ 90-99% de tests pasaron                → MUY BUENO
☐ 80-89% de tests pasaron                → BUENO
☐ 70-79% de tests pasaron                → ACEPTABLE
☐ < 70% de tests pasaron                 → INSUFICIENTE
```

**Conclusión Final:**  
_________________________________________________________________

_________________________________________________________________

---

## 📝 NOTAS Y OBSERVACIONES

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## ✍️ FIRMA Y FECHA

| Campo | Valor |
|-------|-------|
| Testeador | _________________________ |
| Fecha | _________________________ |
| Hora Inicio | _________________________ |
| Hora Fin | _________________________ |
| Tiempo Total | _________________________ |
| Firma | _________________________ |

---

**Talento Track V2.0 - Plan de Pruebas de Seguridad**  
Versión: 1.0 | Año: 2026
