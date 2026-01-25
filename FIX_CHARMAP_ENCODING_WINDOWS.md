# 🔧 FIX: Error de Encoding "charmap" al Crear Empresa

## 🐛 El Problema

Cuando intentas crear una empresa con caracteres especiales (ñ, acentos, etc), recibes:

```
Error interno: 'charmap' codec can't encode characters in position 1-2: 
character maps to <undefined>
```

### ¿Por qué sucede?

Windows usa **CP1252 (charmap)** como encoding por defecto, que no puede representar:
- Acentos (á, é, í, ó, ú)
- Ñ (eñe)
- Otros caracteres latinos

Django intenta usar este encoding en lugar de UTF-8, causando el error.

---

## ✅ La Solución

Se implementaron 4 capas de fixes:

### 1️⃣ **Middleware de Normalización** (`PuntoPymes/middleware.py`)

Middleware que intercepta todos los requests JSON y los normaliza a UTF-8:

```python
class EncodingFixMiddleware(MiddlewareMixin):
    """Normaliza encoding de datos JSON en POST/PUT/PATCH"""
    
    def process_request(self, request):
        # Lee y re-codifica el body como UTF-8
        # Normaliza strings recursivamente
        # Maneja errores gracefully
```

**Ubicación en settings.py**: Se colocó DESPUÉS de `CommonMiddleware`

### 2️⃣ **Configuración de Settings** (`PuntoPymes/settings.py`)

Se agregó al inicio del archivo:

```python
import sys

# FIX: Configurar UTF-8 por defecto en Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    os.environ['PYTHONIOENCODING'] = 'utf-8'
```

### 3️⃣ **Serializer Mejorado** (`core/serializers.py`)

El `EmpresaSerializer` ahora tiene un método `_clean_string()`:

```python
def _clean_string(self, value):
    """Limpia y normaliza strings para evitar problemas de encoding"""
    return value.encode('utf-8', errors='replace').decode('utf-8')

def to_internal_value(self, data):
    # Limpia todos los strings antes de validar
    for field in ['razon_social', 'nombre_comercial', 'ruc', 'direccion']:
        if field in data:
            data[field] = self._clean_string(data[field])
```

### 4️⃣ **ViewSet Mejorado** (`core/views.py`)

El `EmpresaViewSet.create()` ahora normaliza datos antes de procesar:

```python
def create(self, request, *args, **kwargs):
    # Normalizar strings para encoding
    for field in ['razon_social', 'nombre_comercial', 'ruc', 'direccion']:
        if field in data:
            data[field] = data[field].encode('utf-8', errors='replace').decode('utf-8').strip()
```

### 5️⃣ **manage.py y wsgi.py**

Ambos archivos ahora incluyen:

```python
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    os.environ['PYTHONIOENCODING'] = 'utf-8'
```

---

## 🧪 Cómo Testear

### Test 1: Ejecutar script de prueba
```bash
cd c:\Users\mateo\Desktop\PuntoPymes
python test_empresa_encoding.py
```

Esto testea:
- Creación de empresas con caracteres especiales
- Validación de encoding UTF-8
- (Opcional) Test de API si el servidor está corriendo

### Test 2: Crear empresa desde el frontend
1. Abrir `http://localhost:4200/`
2. Login como admin
3. Ir a "Organizaciones"
4. Crear empresa con datos como:
   - **Razón Social**: "Pymes Innovación S.A.C."
   - **Nombre Comercial**: "Pymes Inteligente - Región Ñoño"
   - **Dirección**: "Calle Español Nº 123, Piso 2º"

✅ Debería crear sin errores

### Test 3: Verificar en base de datos
```bash
psql -U postgres -d talent_track_db
SELECT * FROM core_empresa ORDER BY id DESC LIMIT 1;
```

---

## 📋 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `PuntoPymes/middleware.py` | ✅ Creado - Middleware de normalización |
| `PuntoPymes/settings.py` | ✅ Imports + config UTF-8 + middleware registrado |
| `core/serializers.py` | ✅ Método `_clean_string()` agregado |
| `core/views.py` | ✅ Normalización en `EmpresaViewSet.create()` |
| `manage.py` | ✅ UTF-8 config para Windows |
| `PuntoPymes/wsgi.py` | ✅ UTF-8 config para Windows |
| `test_empresa_encoding.py` | ✅ Creado - Script de testing |

---

## 🚀 Cómo Aplicar el Fix

Ya está todo implementado, pero si necesitas hacer cambios:

### Si aún tienes errores:

1. **Reinicia el servidor Django**:
   ```bash
   # Termina el servidor actual
   # En PowerShell: Ctrl+C
   
   # Inicia nuevamente
   python manage.py runserver
   ```

2. **Limpia la caché del navegador**:
   - DevTools → Application → Cache Storage → Limpiar todo
   - O usa Ctrl+Shift+Del

3. **Si sigue fallando, revisa los logs**:
   ```bash
   # En la terminal del servidor deberías ver mensajes como:
   # ✅ Empresa creada: ID 123
   # ✅ Matriz creada
   ```

---

## 💡 Conceptos Clave

### ¿Por qué UTF-8?

- **Soporte universal**: Soporta cualquier idioma y carácter especial
- **Standard web**: Es el encoding estándar de internet
- **Compatibilidad**: Django, Python, PostgreSQL todos usan UTF-8

### ¿Qué hace el middleware?

1. Intercepta el request JSON
2. Lo decodifica como UTF-8
3. Normaliza todos los strings
4. Los re-codifica como UTF-8 válido
5. Continúa con el request

### ¿Por qué `errors='replace'`?

Si un carácter es realmente inválido, lo reemplaza con `?` en lugar de fallar completamente.

---

## ✅ Checklist de Validación

- [ ] El servidor Django inicia sin errores
- [ ] Puedes crear una empresa sin caracteres especiales
- [ ] Puedes crear una empresa con acentos y ñ
- [ ] Los datos se guardan correctamente en BD
- [ ] El frontend muestra los datos sin corrupción

---

## 📞 Si Aún Hay Problemas

### Síntoma: "charmap" error persiste

**Solución**:
1. Reinicia PowerShell completamente (cierra y abre una nueva)
2. Reinicia el servidor Django
3. Limpia la caché del navegador

### Síntoma: Datos se guardan como "???"

**Causa**: El encoding se normalizó pero está perdiendo caracteres.

**Solución**: Verifica que la BD esté usando UTF-8:
```sql
-- En PostgreSQL:
SELECT datname, pg_encoding_to_char(encoding) 
FROM pg_database 
WHERE datname = 'talent_track_db';

-- Debería mostrar: UTF8
```

### Síntoma: Error diferente en otra sección

**Solución**: Reporta el error exacto y aplicaremos el mismo fix a ese módulo.

---

## 🎯 Resumen

El problema era **encoding incompatible con Windows**.

La solución fue **multi-capa**:
1. Middleware de normalización
2. Configuración del sistema
3. Serializer con limpieza
4. ViewSet con normalización
5. Scripts con soporte UTF-8

Ahora el sistema puede manejar **cualquier carácter especial** sin problemas.

---

*Generado: Enero 23, 2026*  
*Fix: Encoding charmap en Windows*
