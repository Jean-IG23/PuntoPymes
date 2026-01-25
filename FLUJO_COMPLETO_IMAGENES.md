# 📸 FLUJO COMPLETO DE IMÁGENES EN PUNTOPYMES

**Última Actualización:** 22 de Enero, 2026  
**Análisis:** Proceso de guardado, almacenamiento y optimización  

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| **Resolución** | ❌ NO se baja | Se guardan con resolución original |
| **Almacenamiento** | 📁 Archivos | Se guardan en carpeta `media/` del servidor |
| **BD** | 📍 Ruta únicamente | Se guarda la ruta, NO la imagen binaria |
| **Optimización** | ⚠️ NINGUNA | Sin compresión, sin redimensionamiento |
| **Tipos soportados** | ✅ Múltiples | JPG, PNG, WebP, etc. |

---

## 🏗️ ARQUITECTURA DEL FLUJO

```
┌─────────────────────────────────────────────────────────────────┐
│ USUARIO (Angular Frontend)                                       │
│                                                                  │
│  1. Selecciona archivo (input type=file)                         │
│  2. Preview local en navegador                                   │
│  3. FormData + PATCH/POST a backend                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ DJANGO BACKEND (Python)                                          │
│                                                                  │
│  1. Recibe el archivo vía MultipartFormData                      │
│  2. ✅ Valida tipo (ImageField = auto-validate)                   │
│  3. Genera nombre único: empleados/uuid_original.ext             │
│  4. Guarda en: /media/empleados/uuid_original.ext               │
│  5. Guarda RUTA en BD: empleados/uuid_original.ext              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ALMACENAMIENTO (FileSystem)                                      │
│                                                                  │
│  Carpeta: c:\Users\mateo\Desktop\PuntoPymes\media\empleados\     │
│  Archivo: empleados/12345-nombre.jpg (IMAGEN ORIGINAL)          │
│  Tamaño: 100% del original (sin comprimir)                       │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ BASE DE DATOS (PostgreSQL)                                       │
│                                                                  │
│  Tabla: personal_empleado                                        │
│  Campo: foto (VARCHAR)                                           │
│  Valor: "empleados/12345-nombre.jpg"  (SOLO RUTA, NO IMAGEN)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 DETALLES TÉCNICOS

### 1️⃣ MODELO (Django)

**Archivo:** `personal/models.py` - Línea 26

```python
class Empleado(models.Model):
    # ...
    foto = models.ImageField(
        upload_to='empleados/',  # Carpeta dentro de MEDIA_ROOT
        null=True,               # Puede ser vacío
        blank=True,              # No obligatorio
        verbose_name="Foto de Perfil"
    )
```

**Lo que hace `ImageField`:**
- ✅ Valida que sea imagen (JPEG, PNG, GIF, etc.)
- ✅ Genera nombre único automáticamente
- ✅ Guarda archivo en servidor
- ✅ Almacena ruta en BD
- ❌ NO redimensiona
- ❌ NO comprime
- ❌ NO valida resolución/tamaño máximo

### 2️⃣ CONFIGURACIÓN (Django Settings)

**Archivo:** `PuntoPymes/settings.py` - Líneas 161-162

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

**Significa:**
- `MEDIA_ROOT = c:\Users\mateo\Desktop\PuntoPymes\media`
- `MEDIA_URL = /media/` (URL pública)
- Las imágenes se sirven desde: `http://localhost:8000/media/...`

### 3️⃣ VISTA (Cómo recibe el archivo)

**Archivo:** `personal/views.py` - Líneas 290-310 (aproximadamente)

```python
def update(self, request, *args, **kwargs):
    # ...
    # partial=True permite actualizar solo la foto sin los demás campos
    serializer = self.get_serializer(empleado, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()  # ← Django maneja la imagen automáticamente
        return Response(serializer.data)
    else:
        return Response(serializer.errors, status=400)
```

### 4️⃣ SERIALIZER (Serialización)

**Archivo:** `personal/serializers.py` - Línea 165+

```python
class EmpleadoSerializer(serializers.ModelSerializer):
    # El serializer incluye el campo ImageField automáticamente
    
    class Meta:
        model = Empleado
        fields = '__all__'  # Incluye 'foto'
        # No hay validación adicional de tamaño/resolución
```

---

## 🌐 FLUJO EN FRONTEND (Angular)

### Paso 1: Seleccionar imagen

**Archivo:** `talent-track-frontend/src/app/components/empleado-form/empleado-form.component.ts`

```typescript
onFotoSelected(event: any) {
    const file = event.target.files[0];  // ← Usuario elige archivo
    
    if (file) {
        this.selectedFoto = file;  // Guardar referencia
        
        // Preview LOCAL (sin enviar al servidor)
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fotoPreview = reader.result;  // Data URL
        };
        reader.readAsDataURL(file);  // ← Conversión a base64 para preview
    }
}
```

### Paso 2: Enviar imagen

```typescript
guardarEmpleado() {
    if (this.selectedFoto) {
        // FormData para archivos (multipart/form-data)
        const formData = new FormData();
        formData.append('nombres', this.empleado.nombres);
        formData.append('apellidos', this.empleado.apellidos);
        // ... otros campos ...
        formData.append('foto', this.selectedFoto);  // ← AQUÍ va la imagen
        
        // PATCH (actualizar empleado existente)
        this.api.updateEmpleado(id, formData).subscribe(...)
    }
}
```

### Paso 3: Mostrar imagen

```html
<!-- Cargar desde backend -->
<img [src]="'http://localhost:8000' + empleado.foto" 
     class="w-16 h-16 rounded-full object-cover">
```

---

## 💾 FLUJO TÉCNICO COMPLETO

```
USUARIO SELECCIONA IMAGEN (empleado.jpg - 2MB)
↓
ANGULAR FRONTEND
├─ Lee archivo con FileReader
├─ Crea preview local (data URL base64)
├─ Empaqueta en FormData
└─ Envía POST/PATCH a /api/empleados/

        HTTP REQUEST
        ↓
DJANGO BACKEND RECIBE
├─ Desempaqueta MultipartFormData
├─ Valida:
│  ├─ ✅ Es ImageField (JPEG/PNG/etc)
│  └─ ⚠️ NO valida tamaño máximo (problema potencial)
├─ Genera nombre único:
│  └─ empleados/uuid_aleatorio_1234567890.jpg
├─ Guarda ARCHIVO en:
│  └─ /media/empleados/uuid_aleatorio_1234567890.jpg
├─ Guarda RUTA en BD:
│  └─ foto = "empleados/uuid_aleatorio_1234567890.jpg"
└─ Retorna respuesta JSON

        RESPUESTA JSON
        ↓
ANGULAR RECIBE
├─ {
│   "id": 42,
│   "nombres": "Mateo",
│   "foto": "empleados/uuid_aleatorio_1234567890.jpg",
│   ...
│ }
├─ Actualiza variable local
└─ Muestra imagen: <img src="/media/empleados/...">

        PERSISTENCIA
        ↓
PRÓXIMA CARGA (Otro usuario)
├─ GET /api/empleados/42/
├─ Retorna: {"foto": "empleados/..."}
├─ Frontend carga desde: /media/empleados/...
└─ Si está en servidor: ✅ Existe
   Si no: ❌ Error 404
```

---

## 📊 ANÁLISIS ACTUAL

### ✅ QUE SÍ FUNCIONA

| Característica | Status | Detalles |
|---|---|---|
| **Subir imagen** | ✅ | Funciona correctamente |
| **Guardar ruta** | ✅ | Se almacena en BD |
| **Recuperar imagen** | ✅ | GET devuelve ruta correcta |
| **Preview local** | ✅ | Muestra antes de guardar |
| **Validación tipo** | ✅ | Solo permite imágenes |
| **Múltiples formatos** | ✅ | JPG, PNG, GIF, WebP |

### ⚠️ PROBLEMAS ACTUALES

| Problema | Impacto | Solución |
|---|---|---|
| **Sin compresión** | 📊 Imágenes muy pesadas (2-5MB) | Implementar PIL/Pillow |
| **Sin redimensionamiento** | 🖼️ 4000x3000px = consumo excesivo | Redimensionar a max 1000x1000 |
| **Sin validación tamaño** | 💾 Posible llenar disco duro | Max 5MB |
| **Sin validación resolución** | 📸 Imágenes muy grandes | Max 4000x4000 |
| **Sin control de calidad** | 🎨 Pérdida de calidad potencial | Guardar con quality 85% |

---

## 🗂️ ESTRUCTURA DE CARPETAS

```
PuntoPymes/
├─ media/
│  └─ empleados/
│     ├─ 550e8400-e29b-41d4-a716-446655440000.jpg  (2.1 MB)
│     ├─ 550e8400-e29b-41d4-a716-446655440001.jpg  (1.8 MB)
│     ├─ 550e8400-e29b-41d4-a716-446655440002.png  (3.2 MB)
│     └─ 550e8400-e29b-41d4-a716-446655440003.jpg  (1.5 MB)
│
├─ documentos_empleados/  (Si hubiera archivos)
└─ contratos/            (Si hubiera archivos)
```

**Tamaño total:** Suma directa de archivos  
**Límite:** Sistema de archivos (disco duro disponible)

---

## 🔐 SEGURIDAD ACTUAL

### ✅ BUENO

```python
models.ImageField()  # Solo permite tipos MIME de imagen
```

### ⚠️ MEJORABLE

**Archivo:** `VALIDACION_BACKEND_SEGURIDAD.py` - Línea 147

```python
tipos_permitidos = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword'
}
# Este código EXISTE pero NO se usa en el flujo actual
```

**El problema:**
- La validación existe en archivo de prueba
- NO está conectada al modelo/serializer
- Posible vulnerabilidad de seguridad

---

## 📋 DETALLES DE GUARDADO EN BD

### Campo en Base de Datos

```sql
-- Tabla personal_empleado
CREATE TABLE personal_empleado (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR(150),
    apellidos VARCHAR(150),
    email VARCHAR(254),
    foto VARCHAR(100),  -- ← AQUÍ se guarda la ruta
    ...
);
```

### Valores Almacenados

```sql
SELECT id, nombres, foto FROM personal_empleado LIMIT 5;

id  │ nombres │ foto
────┼─────────┼──────────────────────────────────────────────
1   │ Mateo   │ empleados/550e8400-e29b-41d4-a716-44665544.jpg
2   │ Juan    │ empleados/550e8400-e29b-41d4-a716-44665545.png
3   │ María   │ (NULL)  -- No tiene foto
4   │ Carlos  │ empleados/550e8400-e29b-41d4-a716-44665546.jpg
5   │ Ana     │ empleados/550e8400-e29b-41d4-a716-44665547.jpg
```

**Importante:** Se almacena SOLO la ruta, no la imagen binaria

---

## 🎯 CÓMO MEJORAR (Recomendaciones)

### Opción 1: Compresión Simple (Recomendado)

```python
# En personal/models.py
from PIL import Image
from io import BytesIO
import os

class Empleado(models.Model):
    # ... campos ...
    
    def save(self, *args, **kwargs):
        # Procesar imagen ANTES de guardar
        if self.foto:
            img = Image.open(self.foto)
            
            # 1. Redimensionar si es muy grande
            if img.width > 1000 or img.height > 1000:
                img.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
            
            # 2. Comprimir
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            # 3. Reemplazar archivo
            self.foto.save(f'empleados/{self.foto.name}', output)
        
        super().save(*args, **kwargs)
```

### Opción 2: Validación de Tamaño

```python
# En personal/serializers.py
class EmpleadoSerializer(serializers.ModelSerializer):
    def validate_foto(self, value):
        # Validar tamaño
        if value.size > 5 * 1024 * 1024:  # 5 MB
            raise serializers.ValidationError(
                "Archivo muy grande. Máximo 5 MB."
            )
        
        # Validar resolución
        img = Image.open(value)
        if img.width > 4000 or img.height > 4000:
            raise serializers.ValidationError(
                "Resolución muy alta. Máximo 4000x4000."
            )
        
        return value
```

### Opción 3: CloudStorage (Para Producción)

```python
# Usar AWS S3 o Google Cloud Storage
# En lugar de guardar en servidor local

# settings.py
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'mi-bucket'
```

---

## 📈 IMPACTO DE RENDIMIENTO

### Situación Actual (Sin Optimización)

```
100 empleados con foto 2MB = 200 MB en disco
1000 empleados con foto 2MB = 2 GB en disco
10000 empleados con foto 2MB = 20 GB en disco  ⚠️

Tiempo carga: ~1-2 segundos por imagen
```

### Con Compresión (Opción 1)

```
100 empleados con foto ~200KB = 20 MB en disco
1000 empleados con foto ~200KB = 200 MB en disco
10000 empleados con foto ~200KB = 2 GB en disco  ✅

Tiempo carga: ~100-200ms por imagen (10x más rápido)
```

---

## 🔄 FLUJO ACTUAL RESUMIDO

```
1. USUARIO
   └─ Selecciona imagen en UI (Angular)

2. FRONTEND
   ├─ Carga archivo en memoria
   ├─ Crea preview local con FileReader
   └─ Envía FormData a backend

3. BACKEND (Django)
   ├─ Recibe MultipartFormData
   ├─ ImageField valida tipo
   ├─ Genera nombre único
   ├─ Guarda archivo en /media/empleados/
   └─ Guarda ruta en BD

4. BASE DE DATOS (PostgreSQL)
   └─ Almacena: "empleados/uuid.jpg" (VARCHAR)

5. SERVICIO DE ARCHIVOS
   └─ Django media handler sirve archivos desde /media/

6. FRONTEND (Recuperar)
   ├─ GET /api/empleados/42/
   ├─ Recibe: {"foto": "empleados/uuid.jpg"}
   └─ Muestra: <img src="/media/empleados/uuid.jpg">
```

---

## ✨ CONCLUSIÓN

| Aspecto | Respuesta |
|---------|-----------|
| **¿Se baja resolución?** | ❌ NO - Se guardan con resolución original |
| **¿Se guardan en BD?** | ✅ SÍ - Pero solo la RUTA, no la imagen |
| **¿Dónde se guardan?** | 📁 En carpeta `/media/empleados/` del servidor |
| **¿Se comprimen?** | ❌ NO - Consumo excesivo de espacio |
| **¿Se redimensionan?** | ❌ NO - Posible rendimiento lento |
| **¿Hay validación?** | ⚠️ PARCIAL - Solo tipo, no tamaño/resolución |

**Recomendación:** Implementar compresión y redimensionamiento (Opción 1) para mejorar rendimiento y ahorrar espacio.

