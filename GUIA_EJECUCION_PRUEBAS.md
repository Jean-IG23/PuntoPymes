# 🚀 GUÍA RÁPIDA DE EJECUCIÓN DE PRUEBAS DE SEGURIDAD
**Talent Track V2.0 - 21 de Enero de 2026**

---

## 📋 BLOQUE 1: AUTENTICACIÓN Y JWT (15 minutos)

### Paso 1.1: Validar Login Correcto

```bash
# Terminal - Ejecutar script de pruebas
cd c:\Users\mateo\Desktop\PuntoPymes
python test_seguridad.py

# Credenciales de prueba:
# Email: admin@example.com
# Password: admin123
```

**Resultado esperado:**
```
✅ PASS: AUTH-001 - Login exitoso genera JWT
    → Token generado: eyJhbGciOi... (longitud: 256+)
```

**Evidencia a guardar:**
- Screenshot de la consola mostrando token generado
- Copiar el token en archivo `evidencias/token_jwt.txt`

---

### Paso 1.2: Validar Token JWT en Navegador

1. Loguearse en http://localhost:4200
2. Abrir DevTools: **F12** → **Storage** → **localStorage**
3. Buscar clave `token`
4. Hacer click y copiar el valor

**Evidencia:**
```
Screenshot de localStorage con token visible
Filename: evidencias/01_jwt_token_storage.png
```

---

### Paso 1.3: Decodificar y Validar Token

1. Ir a: https://jwt.io (NO subes datos sensibles, solo inspeccionas)
2. Pegar el token JWT en el campo izquierdo
3. Revisar **Payload**

**Verificar que contiene:**
```json
{
  "user_id": 1,
  "exp": 1705...,  // Fecha futura (15 min desde ahora)
  "iat": 1705...,  // Fecha de emisión (ahora)
  "token_type": "access"
}
```

**Evidencia:**
```
Screenshot de jwt.io mostrando payload decodificado
Filename: evidencias/02_jwt_payload_decoded.png
```

---

### Paso 1.4: Validar Rechazo de Credenciales Incorrectas

1. Ir a login
2. Ingresar:
   - Email: `admin@example.com`
   - Password: `passwordincorrecto`
3. Click en "Iniciar Sesión"

**Resultado esperado:**
```
Error message: "Credenciales inválidas"
Status: 401
En localStorage: NO debe haber token
```

**Evidencia:**
```
Screenshot del mensaje de error
Filename: evidencias/03_login_error_401.png
```

---

## 📋 BLOQUE 2: PROTECCIÓN XSS (20 minutos)

### Paso 2.1: Test XSS en Campo de Observaciones

1. Ir a **Gestión** → **Empleados** → **Crear Nuevo**
2. Llenar campos:
   ```
   Nombres: Juan
   Apellidos: Pérez
   Email: xsstest@test.com
   Documento: 99999999
   Observaciones: <script>alert('XSS Vulnerable')</script>
   ```
3. Guardar empleado
4. Verificar que NO se ejecuta el alert

**Resultado esperado:**
```
✅ Empleado guardado exitosamente
✅ NO aparece popup de alert
✅ Script se muestra como texto en observaciones
```

**Evidencia:**
```
Screenshot del formulario con payload XSS
Filename: evidencias/04_xss_input_form.png

Screenshot después de guardar (sin ejecución)
Filename: evidencias/05_xss_safely_stored.png
```

---

### Paso 2.2: Validar Sanitización en Respuesta

1. Con el empleado XSS creado, abrir DevTools → **Network**
2. Filtrar por la última petición POST de crear empleado
3. Ir a **Response**

**Buscar en la respuesta:**
```
"observaciones": "<script>alert('XSS...')</script>"
```

**Verificación:**
- ❌ Si aparece `<script>` sin escape = VULNERABLE
- ✅ Si aparece `&lt;script&gt;` = SEGURO

**Evidencia:**
```
Screenshot de Network → Response mostrando sanitización
Filename: evidencias/06_xss_response_sanitized.png
```

---

### Paso 2.3: Test XSS en Evento onload

1. Ir a crear otro empleado
2. En campo "Nombres", ingresar:
   ```
   Juan<img src=x onerror="console.error('XSS Ejecutado')">
   ```
3. Guardar
4. Ir a DevTools → **Console**
5. Verificar que NO aparece el error `'XSS Ejecutado'`

**Evidencia:**
```
Screenshot de Console vacía (sin errores maliciosos)
Filename: evidencias/07_xss_event_safe.png
```

---

### Paso 2.4: Ejecutar Test XSS desde Console

1. En DevTools → **Console**, pegar:
   ```javascript
   ejecutarTodasLasPruebas()
   ```

2. Esperar a que se ejecute

**Resultado esperado:**
```
✅ TEST XSS-001: Sanitización en Interpolación
   ✅ SEGURO elemento 0: Juan Pérez...
   ✅ SEGURO elemento 1: Admin...
   
✅ TEST XSS-002: Uso de innerHTML
   ✅ No hay [innerHTML] en el código (SEGURO)
   
✅ TEST XSS-004: Headers de Seguridad
   ✅ Content-Security-Policy: script-src 'self'...
```

**Evidencia:**
```
Screenshot de la ejecución de ejecutarTodasLasPruebas()
Filename: evidencias/08_xss_console_tests_pass.png
```

---

## 📋 BLOQUE 3: PROTECCIÓN CSRF (10 minutos)

### Paso 3.1: Verificar Token CSRF en Cookies

1. Abrir DevTools → **Storage** → **Cookies**
2. Dominio: `localhost:4200` (o tu URL)
3. Buscar cookies que contengan `csrf`

**Resultado esperado:**
```
Cookie Name: csrftoken
Value: abc123def456... (32+ caracteres)
```

**Evidencia:**
```
Screenshot del storage mostrando csrftoken
Filename: evidencias/09_csrf_token_cookies.png
```

---

### Paso 3.2: Monitorear CSRF en POST Requests

1. DevTools → **Network** → pestaña XHR
2. Hacer una acción que genere POST (ej: crear empleado)
3. Hacer click en la petición POST
4. Ir a **Headers** → **Request Headers**

**Buscar estos headers:**
```
X-CSRF-Token: abc123def456...
X-Requested-With: XMLHttpRequest
Content-Type: application/json
```

**Evidencia:**
```
Screenshot de Headers POST con CSRF token
Filename: evidencias/10_csrf_post_headers.png
```

---

### Paso 3.3: Test de Rechazo sin CSRF Token

1. En Console, ejecutar:
   ```javascript
   // Intentar POST sin CSRF token
   fetch('http://localhost:8000/api/empleados/', {
     method: 'POST',
     body: JSON.stringify({nombres: 'Hack', apellidos: 'Test'}),
     headers: {
       'Content-Type': 'application/json'
       // Nota: NO incluye X-CSRF-Token
     }
   }).then(r => r.json()).then(d => console.log(d))
   ```

2. Revisar respuesta

**Resultado esperado:**
```
{
  "error": "CSRF token missing or invalid",
  "status": 403
}
```

**Evidencia:**
```
Screenshot de la respuesta 403
Filename: evidencias/11_csrf_rejected_no_token.png
```

---

## 📋 BLOQUE 4: CONTROL DE ACCESO (RBAC) (15 minutos)

### Paso 4.1: Empleado NO Accede a Dashboard de Admin

1. Loguearse como **EMPLEADO** (ej: `empleado@empresa.com`)
2. Intentar acceder directamente a: `http://localhost:4200/gestion/dashboard`
3. Revisar qué sucede

**Resultado esperado:**
```
✅ Se redirecciona automáticamente a /home
✅ Se muestra mensaje: "No tienes permiso para acceder a esta página"
```

**Evidencia:**
```
Screenshot de la redirección
Filename: evidencias/12_rbac_employee_access_denied.png

Screenshot del mensaje de error
Filename: evidencias/13_rbac_permission_message.png
```

---

### Paso 4.2: Manager SÍ Accede a Dashboard

1. Cerrar sesión
2. Loguearse como **MANAGER** (ej: `gerente@empresa.com`)
3. Ir a home
4. Verificar que existe botón "Dashboard"
5. Hacer click

**Resultado esperado:**
```
✅ Botón "Dashboard" visible
✅ Acceso permitido a /gestion/dashboard
✅ Se carga el dashboard con KPIs
```

**Evidencia:**
```
Screenshot del botón Dashboard visible
Filename: evidencias/14_rbac_manager_access_allowed.png

Screenshot del dashboard cargado
Filename: evidencias/15_rbac_dashboard_loaded.png
```

---

### Paso 4.3: Navegación Filtrada por Rol

1. Loguearse como EMPLEADO
2. Revisar la barra lateral (sidebar)
3. Anotar opciones visibles:
   - ✅ Mi Perfil
   - ✅ Solicitudes
   - ❌ Dashboard (NO debe aparecer)
   - ❌ Mi Equipo (NO debe aparecer)

4. Hacer logout y loguearse como MANAGER
5. Revisar que ahora SÍ aparecen Dashboard y Mi Equipo

**Evidencia:**
```
Screenshot del sidebar como EMPLEADO
Filename: evidencias/16_rbac_employee_sidebar.png

Screenshot del sidebar como MANAGER
Filename: evidencias/17_rbac_manager_sidebar.png
```

---

## 📋 BLOQUE 5: MANEJO DE ERRORES (5 minutos)

### Paso 5.1: Acceder a Endpoint Inexistente

1. Abrir DevTools → **Network**
2. En la barra de direcciones, intentar:
   ```
   http://localhost:8000/api/endpoint_inexistente_xyz/
   ```

3. Revisar respuesta

**Resultado esperado:**
```
Status: 404
Response:
{
  "error": "Recurso no encontrado",
  "status": 404
}

❌ NO debe mostrar:
- Stack trace de Python
- Ruta del archivo
- Nombres de variables
- Versión de Django
```

**Evidencia:**
```
Screenshot de la respuesta limpia
Filename: evidencias/18_error_handling_clean.png
```

---

## 📋 BLOQUE 6: RATE LIMITING (10 minutos)

### Paso 6.1: Ejecutar Script de Rate Limiting

```bash
cd c:\Users\mateo\Desktop\PuntoPymes
python test_seguridad.py

# El script ejecutará:
# - 65 requests seguidos a /api/empleados/
# - Esperará recibir 429 Too Many Requests
```

**Resultado esperado:**
```
✅ PASS: RATELIMIT-001 - Error 429 retornado en request #61
    → Límite de tasa está activo correctamente
```

**Evidencia:**
```
Screenshot de la consola mostrando el límite
Filename: evidencias/19_rate_limiting_429.png
```

---

### Paso 6.2: Validar Reseteo del Límite

1. Esperar 61 segundos
2. Ejecutar nuevamente el script
3. El primer request debe pasar (status 200)

**Resultado esperado:**
```
Request 1: 200 ✅ Contador reseteado
```

**Evidencia:**
```
Screenshot del contador reseteado
Filename: evidencias/20_rate_limiting_reset.png
```

---

## 📋 BLOQUE 7: SECRETOS Y CONFIGURACIÓN (5 minutos)

### Paso 7.1: Validar .env No Está en Git

```bash
cd c:\Users\mateo\Desktop\PuntoPymes

# Comando 1: Verificar que .env existe localmente
dir | findstr .env

# Comando 2: Verificar que está en .gitignore
findstr ".env" .gitignore

# Comando 3: Verificar que NO fue commiteado
git log --all --full-history -- .env
```

**Resultado esperado:**
```
.env ← Archivo existe localmente
.env ← Está en .gitignore
git log → "fatal: Path '.env' does not exist in any of the trees"
       → Confirma que NUNCA fue commiteado
```

**Evidencia:**
```
Screenshot del comando findstr .gitignore
Filename: evidencias/21_env_in_gitignore.png

Screenshot del comando git log
Filename: evidencias/22_env_never_committed.png
```

---

### Paso 7.2: Validar Contenido de .env

```bash
# Ver contenido (NUNCA mostrar en público)
type .env
```

**Verificar que contiene:**
```
SECRET_KEY=tu-clave-aleatoria-de-64-caracteres
DEBUG=False
DATABASE_PASSWORD=tu-password-aqui
JWT_SECRET=tu-jwt-secret-aqui
ALLOWED_HOSTS=localhost,127.0.0.1,tudominio.com
```

**Evidencia:**
```
Screenshot del .env (con valores oscurecidos para defensa)
Filename: evidencias/23_env_content_structure.png
```

---

## 📋 BLOQUE 8: MULTI-INQUILINO (Aislamiento) (10 minutos)

### Paso 8.1: Crear Dos Empresas de Prueba

1. Acceder como SUPERADMIN
2. Crear Empresa A: `empresa_a@example.com`
3. Crear Empresa B: `empresa_b@example.com`
4. Crear empleados en cada una

---

### Paso 8.2: Validar Aislamiento de Datos

**Empresa A (Usuario A):**
1. Loguearse como usuario de Empresa A
2. Ir a `/gestion/empleados`
3. Anotar el número de empleados visibles: **ej: 10**

**Empresa B (Usuario B):**
1. Loguearse como usuario de Empresa B
2. Ir a `/gestion/empleados`
3. Anotar el número de empleados visibles: **ej: 15**

**Validación:**
```
Empresa A ve: 10 empleados ✅
Empresa B ve: 15 empleados ✅
Empresa A NUNCA ve los 15 de Empresa B ✅
```

**Evidencia:**
```
Screenshot de lista de Empresa A
Filename: evidencias/24_tenant_isolation_company_a.png

Screenshot de lista de Empresa B
Filename: evidencias/25_tenant_isolation_company_b.png
```

---

### Paso 8.3: Test de IDOR (Intentar Acceso Directo)

1. Loguearse como Empresa A
2. Obtener el ID de un empleado de Empresa B (ej: ID=999)
3. Intentar acceder directamente:
   ```
   http://localhost:8000/api/empleados/999/
   ```

4. Revisar respuesta

**Resultado esperado:**
```
Status: 403 Forbidden
{
  "error": "No tienes permiso para acceder a este recurso",
  "detail": "No tienes permiso para realizar esta acción."
}

✅ NO retorna los datos del empleado
```

**Evidencia:**
```
Screenshot de la respuesta 403
Filename: evidencias/26_tenant_idor_protection.png
```

---

## 📊 RESUMEN DE ARCHIVOS DE EVIDENCIA

```
📁 evidencias/
├── 01_jwt_token_storage.png
├── 02_jwt_payload_decoded.png
├── 03_login_error_401.png
├── 04_xss_input_form.png
├── 05_xss_safely_stored.png
├── 06_xss_response_sanitized.png
├── 07_xss_event_safe.png
├── 08_xss_console_tests_pass.png
├── 09_csrf_token_cookies.png
├── 10_csrf_post_headers.png
├── 11_csrf_rejected_no_token.png
├── 12_rbac_employee_access_denied.png
├── 13_rbac_permission_message.png
├── 14_rbac_manager_access_allowed.png
├── 15_rbac_dashboard_loaded.png
├── 16_rbac_employee_sidebar.png
├── 17_rbac_manager_sidebar.png
├── 18_error_handling_clean.png
├── 19_rate_limiting_429.png
├── 20_rate_limiting_reset.png
├── 21_env_in_gitignore.png
├── 22_env_never_committed.png
├── 23_env_content_structure.png
├── 24_tenant_isolation_company_a.png
├── 25_tenant_isolation_company_b.png
├── 26_tenant_idor_protection.png
└── reporte_seguridad.json
```

---

## ⏱️ CRONOGRAMA TOTAL ESTIMADO

| Bloque | Duración | Estado |
|--------|----------|--------|
| 1. Autenticación JWT | 15 min | ⬜ |
| 2. Protección XSS | 20 min | ⬜ |
| 3. Protección CSRF | 10 min | ⬜ |
| 4. Control de Acceso (RBAC) | 15 min | ⬜ |
| 5. Manejo de Errores | 5 min | ⬜ |
| 6. Rate Limiting | 10 min | ⬜ |
| 7. Secretos y .env | 5 min | ⬜ |
| 8. Aislamiento Multi-Inquilino | 10 min | ⬜ |
| **TOTAL** | **90 min** | |

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Ejecutar todas las pruebas de este documento
2. ✅ Guardar evidencias en carpeta `/evidencias/`
3. ✅ Generar reporte JSON con `test_seguridad.py`
4. ✅ Crear documento resumen con conclusiones
5. ✅ Grabar video de demostración (opcional pero recomendado)

---

**Última actualización:** 21 de Enero de 2026  
**Versión:** 1.0
