# 🛡️ PLAN DE PRUEBAS DE SEGURIDAD - TALENT TRACK V2.0
**Fecha:** 21 de Enero de 2026  
**Versión:** 1.0  
**Objetivo:** Validar mecanismos de seguridad para garantizar Confidencialidad, Integridad y Disponibilidad

---

## 📋 ÍNDICE
1. [Bloque 1: Seguridad Frontend](#bloque-1-seguridad-frontend)
2. [Bloque 2: Autenticación y Autorización](#bloque-2-autenticación-y-autorización)
3. [Bloque 3: Aislamiento Multi-Inquilino](#bloque-3-aislamiento-multi-inquilino)
4. [Bloque 4: Protección de Datos](#bloque-4-protección-de-datos)
5. [Bloque 5: Infraestructura y Rate Limiting](#bloque-5-infraestructura-y-rate-limiting)

---

## BLOQUE 1: SEGURIDAD FRONTEND

### 1.1 PROTECCIÓN CONTRA XSS (Cross-Site Scripting)

#### **Caso de Prueba XSS-001: Inyección en Campo de Observaciones**

**Objetivo:** Verificar que scripts maliciosos en campos de texto se sanitizan automáticamente

**Pasos:**
1. Ir a cualquier formulario (ej: Empleado Form)
2. En el campo "Observaciones" o similar, ingresar:
   ```
   <script>alert('XSS Vulnerable')</script>
   ```
3. Guardar el registro
4. Recargar la página y consultar el registro

**Resultado Esperado:**
- ✅ El script NO se ejecuta
- ✅ El texto se muestra como texto plano, sin interpretar etiquetas HTML
- ✅ En la BD aparece sanitizado (ej: `&lt;script&gt;...&lt;/script&gt;`)

**Evidencia a Registrar:**
```
- Screenshot del campo con inyección
- Screenshot del resultado sin ejecución
- Inspección del HTML en DevTools (F12) mostrando sanitización
- Query a BD: SELECT observaciones FROM tabla WHERE id=X;
```

---

#### **Caso de Prueba XSS-002: Inyección de Evento (onclick)**

**Objetivo:** Validar sanitización de atributos de eventos

**Pasos:**
1. En campo de nombre, ingresar:
   ```
   Juan <img src=x onerror="alert('XSS')">
   ```
2. Guardar y recargar

**Resultado Esperado:**
- ✅ No se ejecuta el evento `onerror`
- ✅ Se muestra como texto: `Juan <img src=x onerror="alert('XSS')">`

**Código Angular a Validar:**
```typescript
// En el template, debe usarse interpolación segura:
{{ empleado.nombres }}  // ✅ Sanitiza automáticamente

// NUNCA usar:
[innerHTML]="empleado.nombres"  // ❌ Vulnerable sin DomSanitizer
```

---

#### **Caso de Prueba XSS-003: Inyección en URL (href)**

**Objetivo:** Validar que URLs maliciosas en links se neutralicen

**Pasos:**
1. Crear un empleado con email:
   ```
   javascript:alert('XSS')
   ```
2. Hacer click en el email para verificar que no se ejecuta

**Resultado Esperado:**
- ✅ El navegador NO ejecuta código javascript
- ✅ El link es inerte o redirecciona a página de error

---

### 1.2 PROTECCIÓN CONTRA CSRF (Cross-Site Request Forgery)

#### **Caso de Prueba CSRF-001: Token Anti-CSRF en Formularios**

**Objetivo:** Verificar que cada formulario tiene token CSRF válido

**Pasos:**
1. Abrir DevTools (F12) → Pestaña Red
2. Cargar formulario de empleados
3. Filtrar por "XHR" (requests AJAX)
4. Buscar encabezados que contengan "csrf" o "X-CSRF"

**Resultado Esperado:**
```
Headers en POST:
- X-CSRF-Token: [token aleatorio de 32+ caracteres]
- o Cookie: csrftoken=[token]
```

**Verificación en Código:**
```typescript
// En ApiService debe enviarse token CSRF
private getHeaders() {
  const token = this.getCSRFToken();
  const headers = new HttpHeaders({
    'X-CSRF-Token': token,
    'Content-Type': 'application/json'
  });
  return { headers };
}

private getCSRFToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}
```

---

#### **Caso de Prueba CSRF-002: Validación desde Sitio Externo**

**Objetivo:** Simular ataque CSRF desde un sitio malicioso

**Pasos:**
1. Crear archivo HTML malicioso en otro servidor:
   ```html
   <html>
   <body>
   <form action="http://localhost:8000/api/empleados/" method="POST">
     <input type="hidden" name="nombres" value="Hacker">
     <input type="submit" value="Click para ganar premio">
   </form>
   </body>
   </html>
   ```
2. Estar logueado en Talent Track en otra pestaña
3. Abrir el HTML malicioso y hacer click

**Resultado Esperado:**
- ❌ La petición FALLA con error 403 Forbidden
- ✅ No se crea el empleado
- ✅ El servidor rechaza la petición por falta de CSRF token

---

### 1.3 PROTECCIÓN DE SESIÓN

#### **Caso de Prueba SESSION-001: Timeout de Sesión**

**Objetivo:** Validar que la sesión se cierre después de 15 minutos de inactividad

**Pasos:**
1. Loguearse en Talent Track
2. No hacer nada durante 16 minutos
3. Intentar hacer cualquier acción (click, navegación)

**Resultado Esperado:**
- ✅ Se redirecciona automáticamente a login
- ✅ Se muestra mensaje: "Tu sesión ha expirado"
- ✅ El token JWT en localStorage es inválido

**Implementación en AuthService:**
```typescript
// Debe resetear sesión después de 900000ms (15 min)
private setupSessionTimeout() {
  this.sessionTimeout = setTimeout(() => {
    this.logout();
  }, 900000);
}
```

---

#### **Caso de Prueba SESSION-002: Token Inválido Rechazado**

**Objetivo:** Verificar que tokens expirados se rechacen

**Pasos:**
1. Obtener el JWT token (desde localStorage)
2. En DevTools → Console, ejecutar:
   ```javascript
   localStorage.setItem('token', 'eyJhbGc...INVALIDO');
   location.reload();
   ```
3. Intentar navegar a cualquier página

**Resultado Esperado:**
- ✅ Redirección automática a login
- ✅ Error 401 Unauthorized en requests API
- ✅ Mensaje: "Sesión inválida"

---

### 1.4 ENMASCARAMIENTO DE DATOS SENSIBLES

#### **Caso de Prueba SENSIBLE-001: Salarios Enmascarados**

**Objetivo:** Validar que salarios se muestren enmascarados excepto para usuario propietario

**Pasos:**
1. Empleado A ve su propio perfil
2. Empleado A intenta ver datos de Empleado B (si la UI lo permite)

**Resultado Esperado:**
```
Empleado viendo su perfil:
- Salario: $2,500.00 ✅ VISIBLE

Empleado viendo otro perfil (si tiene acceso):
- Salario: **** ✅ ENMASCARADO

Manager/Admin viendo perfil:
- Salario: $2,500.00 ✅ VISIBLE (según permisos)
```

---

## BLOQUE 2: AUTENTICACIÓN Y AUTORIZACIÓN

### 2.1 AUTENTICACIÓN CON JWT

#### **Caso de Prueba AUTH-001: Login Exitoso Genera JWT**

**Objetivo:** Verificar que credenciales válidas generan token JWT

**Pasos:**
1. Ir a login
2. Ingresar email: `gerente@empresa.com` y password: `123456`
3. Revisar DevTools → Storage → localStorage

**Resultado Esperado:**
```
En localStorage debe haber:
- token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- usuario: {id, nombre, rol, empresa_id, ...}
- timestamp_login: 1703XXX

El token debe tener estructura:
- Header: {alg: "HS256", typ: "JWT"}
- Payload: {user_id, exp: [15min futura], iat: [ahora]}
- Signature: [validada en backend]
```

**Verificación:**
- Decodificar el JWT en https://jwt.io (sin revelar datos sensibles)
- Verificar que `exp` es 15 minutos en el futuro

---

#### **Caso de Prueba AUTH-002: Credenciales Incorrectas Rechazadas**

**Objetivo:** Validar que password incorrecto no genera acceso

**Pasos:**
1. Intentar login con email correcto pero password incorrecto
2. Revisar respuesta

**Resultado Esperado:**
```
Response:
{
  "error": "Credenciales inválidas",
  "status": 401
}

En localStorage:
- NO se guarda token
- NO se redirecciona
```

---

#### **Caso de Prueba AUTH-003: Password Hasheado en BD**

**Objetivo:** Verificar que passwords NO se guardan en texto plano

**Pasos:**
1. En terminal, conectar a BD:
   ```bash
   psql -U usuario -d talenttrack
   SELECT id, email, password FROM personal_empleado LIMIT 1;
   ```

**Resultado Esperado:**
```
id  | email              | password
----|-------------------|----------------------------------
1   | juan@empresa.com   | pbkdf2_sha256$260000$abc123...

✅ El password es un hash (nunca texto plano como "123456")
✅ Hash comienza con "pbkdf2_sha256$" o similar (algoritmo robusto)
```

---

### 2.2 CONTROL DE ACCESO POR ROL

#### **Caso de Prueba RBAC-001: Empleado NO Accede a Dashboard de Admin**

**Objetivo:** Verificar que empleados normales no pueden acceder a rutas administrativas

**Pasos:**
1. Loguearse como EMPLEADO
2. Intentar acceder directamente a: `http://localhost:4200/gestion/dashboard`
3. Revisar si tiene acceso o se redirecciona

**Resultado Esperado:**
- ✅ Se redirecciona automáticamente a `/home`
- ✅ Se muestra error: "No tienes permiso para acceder a esta página"
- ✅ En DevTools → Network: request a `/gestion/dashboard` retorna 403 Forbidden

**Código a Validar (app.routes.ts):**
```typescript
{
  path: 'gestion/dashboard',
  component: DashboardComponent,
  canActivate: [adminGuard]  // ✅ Guard protege la ruta
}
```

---

#### **Caso de Prueba RBAC-002: Manager VE Dashboard, Empleado NO**

**Objetivo:** Validar visibilidad de componentes según rol

**Pasos:**
1. Loguearse como EMPLEADO
2. Ir a `/home`
3. Verificar que NO ve opción "Dashboard"

**Comparar con:**
4. Loguearse como GERENTE
5. Ir a `/home`
6. Verificar que SÍ ve opción "Dashboard"

**Resultado Esperado:**
```html
<!-- HTML de HOME para EMPLEADO -->
<button (click)="goToDashboard()" *ngIf="auth.isManagement()">
  Dashboard  <!-- NO SE RENDERIZA para EMPLEADO -->
</button>

<!-- Para GERENTE sí aparece -->
<button (click)="goToDashboard()">
  Dashboard  <!-- ✅ VISIBLE -->
</button>
```

---

## BLOQUE 3: AISLAMIENTO MULTI-INQUILINO

### 3.1 AISLAMIENTO LÓGICO DE DATOS

#### **Caso de Prueba TENANT-001: Empresa A NO Ve Datos de Empresa B**

**Objetivo:** Validar que dos empresas en el SaaS NO pueden ver datos una de otra

**Escenario:**
- Empresa A: `empresa_a@example.com`
- Empresa B: `empresa_b@example.com`

**Pasos:**
1. Loguearse como usuario de Empresa A
2. Ir a `/gestion/empleados`
3. Anotar total de empleados (ej: 10)
4. En DevTools → Storage → token, copiar el JWT
5. Cerrar sesión
6. Loguearse como usuario de Empresa B
7. Ir a `/gestion/empleados`
8. Verificar si ve el total diferente

**Resultado Esperado:**
```
Empresa A: 10 empleados (Solo los de la Empresa A)
Empresa B: 15 empleados (Solo los de la Empresa B)

❌ NUNCA Empresa A verá los 15 empleados de Empresa B
```

**Implementación Backend (Django):**
```python
class EmpleadoViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        empresa_id = self.request.user.empresa_id
        # ✅ FILTRO OBLIGATORIO: Solo empleados de esta empresa
        return Empleado.objects.filter(empresa_id=empresa_id)
```

---

#### **Caso de Prueba TENANT-002: Ataque Directo de ID (IDOR)**

**Objetivo:** Intentar acceder a recurso de otra empresa manipulando ID

**Pasos:**
1. Loguearse como Empresa A
2. Obtener ID de un empleado de Empresa B (ej: ID=999)
3. Hacer petición:
   ```
   GET /api/empleados/999/
   ```
4. Con DevTools ver respuesta

**Resultado Esperado:**
```
Response:
{
  "error": "No tienes permiso para acceder a este recurso",
  "status": 403
}

❌ NUNCA devuelve los datos del empleado
```

---

### 3.2 AUDITORÍA DE ACCESO MULTI-INQUILINO

#### **Caso de Prueba AUDIT-001: Log de Accesos por Empresa**

**Objetivo:** Verificar que se registra quién accede a qué datos

**Pasos:**
1. Loguearse como usuario A
2. Ver 5 empleados
3. Ejecutar en BD:
   ```sql
   SELECT usuario_id, empresa_id, accion, timestamp 
   FROM audit_logs 
   WHERE accion='VIEW_EMPLEADO' 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```

**Resultado Esperado:**
```
usuario_id | empresa_id | accion         | timestamp
-----------|------------|----------------|-------------------
5          | 1          | VIEW_EMPLEADO  | 2026-01-21 14:30:45
5          | 1          | VIEW_EMPLEADO  | 2026-01-21 14:30:43
5          | 1          | VIEW_EMPLEADO  | 2026-01-21 14:30:41
...

✅ Cada acceso se registra con empresa_id
✅ Imposible que usuario de Empresa 1 acceda a empresa_id=2
```

---

## BLOQUE 4: PROTECCIÓN DE DATOS

### 4.1 PREVENCIÓN DE SQL INJECTION

#### **Caso de Prueba SQLi-001: ORM Protege contra Inyección**

**Objetivo:** Verificar que búsquedas usan ORM, no SQL crudo

**Pasos:**
1. En empleado-list, buscar:
   ```
   Juan'; DROP TABLE empleados; --
   ```
2. Verificar que la búsqueda falla gracefully

**Resultado Esperado:**
```
❌ NO se ejecuta DROP TABLE
✅ Se muestra: "No se encontraron resultados"

Logs del servidor:
[INFO] Búsqueda ejecutada como parámetro, no como SQL
```

**Código Correcto (Django):**
```python
# ✅ SEGURO - Usa ORM
empleados = Empleado.objects.filter(nombres__icontains=search_term)

# ❌ INSEGURO - NUNCA HACER
empleados = Empleado.objects.raw(f"SELECT * FROM empleados WHERE nombres LIKE '{search_term}'")
```

---

### 4.2 VALIDACIÓN DE ARCHIVOS ADJUNTOS

#### **Caso de Prueba FILES-001: Solo Extensiones Permitidas**

**Objetivo:** Validar que solo se aceptan tipos de archivo seguros

**Pasos:**
1. Intentar cargar un archivo `.exe` en campo de documento
2. Intentar cargar `.pdf` (permitido)
3. Intentar cargar `.jpg` (permitido)

**Resultado Esperado:**
```
.exe → ❌ Error: "Formato no permitido"
.pdf → ✅ Se carga correctamente
.jpg → ✅ Se carga correctamente
.php → ❌ Error: "Formato no permitido"
```

**Implementación:**
```python
ARCHIVO_EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']

def validar_archivo(file):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ARCHIVO_EXTENSIONES_PERMITIDAS:
        raise ValueError(f"Extensión {ext} no permitida")
```

---

#### **Caso de Prueba FILES-002: Renombramiento Aleatorio**

**Objetivo:** Verificar que archivos se guardan con UUID, no nombre original

**Pasos:**
1. Subir documento: `mi_salario_secreto.pdf`
2. Revisar en `/media/documentos/` en el servidor

**Resultado Esperado:**
```
Archivo original: mi_salario_secreto.pdf
Archivo guardado: a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6.pdf

✅ Imposible enumerar archivos por nombre
✅ Se impide acceso directo por URL predicible
```

---

### 4.3 AUDITORÍA DE CAMBIOS CRÍTICOS

#### **Caso de Prueba AUDIT-002: Log de Cambios en Salarios**

**Objetivo:** Registrar inmutablemente cambios de datos sensibles

**Pasos:**
1. Manager edita salario de empleado: $1000 → $2000
2. Verificar en tabla de auditoría:
   ```sql
   SELECT * FROM audit_logs WHERE tabla='personal_empleado' AND campo='salario' ORDER BY timestamp DESC;
   ```

**Resultado Esperado:**
```
id | usuario_id | tabla            | campo   | valor_anterior | valor_nuevo | timestamp
---|-----------|-----------------|---------|--|
1  | 15        | personal_empleado | salario | 1000 | 2000 | 2026-01-21 15:45:30
```

---

## BLOQUE 5: INFRAESTRUCTURA Y RATE LIMITING

### 5.1 RATE LIMITING EN API

#### **Caso de Prueba RATELIMIT-001: Límite de Requests por Minuto**

**Objetivo:** Validar que API rechaza después de 60 requests/minuto

**Pasos:**
1. Crear script Python:
```python
import requests
import time

url = "http://localhost:8000/api/empleados/"
headers = {"Authorization": f"Bearer {TOKEN}"}

for i in range(65):
    response = requests.get(url, headers=headers)
    print(f"Request {i+1}: {response.status_code}")
    if response.status_code == 429:
        print(f"✅ Rate limit activado en request {i+1}")
        break
    time.sleep(0.5)
```

2. Ejecutar script

**Resultado Esperado:**
```
Request 1: 200
Request 2: 200
...
Request 60: 200
Request 61: 429 Too Many Requests
✅ Rate limit activado en request 61
```

---

#### **Caso de Prueba RATELIMIT-002: Reseteo de Contador**

**Objetivo:** Verificar que límite se resetea cada minuto

**Pasos:**
1. Hacer 60 requests (llena el límite)
2. Esperar 61 segundos
3. Hacer otro request

**Resultado Esperado:**
```
Request 60: 200 (Último permitido)
Request 61: 429 Too Many Requests (Bloqueado)

[Esperar 61 segundos]

Request 62 (después de esperar): 200 ✅ Contador reseteado
```

---

### 5.2 GESTIÓN DE ERRORES SEGURA

#### **Caso de Prueba ERRORS-001: No Revelar Stack Trace**

**Objetivo:** Validar que errores en producción no exponen código

**Pasos:**
1. Provocar un error intencional (ej: acceder a endpoint inexistente)
2. Revisar respuesta

**Resultado Esperado:**
```
Response:
{
  "error": "Recurso no encontrado",
  "status": 404
}

❌ NO incluye:
- Stack trace de Python
- Nombres de variables
- Rutas de archivos
- Versiones de librerías
```

---

#### **Caso de Prueba ERRORS-002: Logs Internos Sin Exposición**

**Objetivo:** Verificar que detalles se registran internamente sin mostrar al usuario

**Pasos:**
1. Revisar archivo `/var/log/django.log` del servidor
2. Buscar error reciente

**Resultado Esperado:**
```
[ERROR] 2026-01-21 15:45:30 - AttributeError: 'Empleado' object has no attribute 'xxx'
  File "/app/personal/views.py", line 123, in get_queryset()
  ...
  
✅ Log interno COMPLETO (para debugging)
✅ Usuario NUNCA ve estos detalles
```

---

### 5.3 GESTIÓN DE SECRETOS

#### **Caso de Prueba SECRETS-001: Credenciales en .env**

**Objetivo:** Validar que secretos NO están en código fuente

**Pasos:**
1. Verificar que `.env` NO está en repositorio:
   ```bash
   cd /ruta/proyecto
   git status | grep .env
   ```

2. Revisar `.gitignore`:
   ```bash
   cat .gitignore | grep .env
   ```

**Resultado Esperado:**
```
.env ← Debe estar en .gitignore
.env.example ← Archivo de referencia (sin valores reales)

✅ git status NO muestra .env
❌ .env NUNCA fue commiteado
```

---

#### **Caso de Prueba SECRETS-002: Variables de Entorno Cargadas**

**Objetivo:** Verificar que la app carga secretos desde .env

**Pasos:**
1. En terminal del servidor:
   ```bash
   echo $DATABASE_PASSWORD
   ```

2. En Django shell:
   ```python
   python manage.py shell
   >>> import os
   >>> os.getenv('SECRET_KEY')[:10]  # Mostrar solo primeros 10 caracteres
   ```

**Resultado Esperado:**
```
✅ SECRET_KEY cargado desde .env
✅ DATABASE_PASSWORD existe y no está en settings.py
✅ DEBUG=False en producción (desde .env)
```

---

## 📊 MATRIZ DE RESULTADOS

| Bloque | Caso de Prueba | Status | Evidencia |
|--------|---|---|---|
| **Frontend** | XSS-001 | ⬜ | Screenshot |
| | XSS-002 | ⬜ | Screenshot |
| | CSRF-001 | ⬜ | Headers |
| **Autenticación** | AUTH-001 | ⬜ | JWT Token |
| | AUTH-002 | ⬜ | 401 Response |
| | RBAC-001 | ⬜ | 403 Redirect |
| **Multi-Tenant** | TENANT-001 | ⬜ | Query Results |
| | AUDIT-001 | ⬜ | Audit Logs |
| **Datos** | SQLi-001 | ⬜ | Query Plan |
| | FILES-001 | ⬜ | File Storage |
| **Infraestructura** | RATELIMIT-001 | ⬜ | 429 Response |
| | ERRORS-001 | ⬜ | Error Response |
| | SECRETS-001 | ⬜ | .gitignore |

---

## 🎯 SIGUIENTES PASOS

1. **Ejecutar Bloque 1** (XSS y CSRF) - Evidencias críticas
2. **Documentar resultados** en carpeta `/evidencias/`
3. **Generar reportes** con screenshots y logs
4. **Crear video demostrativo** de penetration testing básico
5. **Sumario ejecutivo** para defensa del proyecto

---

**Última actualización:** 21 de Enero de 2026
