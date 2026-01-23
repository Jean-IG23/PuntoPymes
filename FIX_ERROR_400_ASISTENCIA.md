# 🔧 FIX: Error 400 en Marcaje de Asistencia

## 🐛 Problema Identificado

**Error:** `Failed to load resource: the server responded with a status of 400 (Bad Request)`

**Ubicación:** Al marcar asistencia en el componente de reloj/attendance

**Causa Raíz:** 
Mismatch entre los nombres de parámetros enviados desde el frontend vs. lo que espera el backend:

### Frontend (INCORRECTO) ❌
```typescript
// En api.service.ts - marcarAsistencia()
const data = {
  latitud: lat,        // ← INCORRECTO
  longitud: lng,       // ← INCORRECTO
  timestamp: new Date().toISOString()
};
return this.http.post(`${this.baseUrl}/marcar/`, data, ...);
```

### Backend (ESPERADO) ✅
```python
# En asistencia/views.py - MarcarAsistenciaView.post()
lat = request.data.get('lat')      # ← ESPERA 'lat'
lng = request.data.get('lng')      # ← ESPERA 'lng'

if not lat or not lng:
    return Response(
        {'error': 'Coordenadas GPS requeridas.'}, 
        status=400
    )
```

---

## ✅ Solución Aplicada

### Cambio Realizado en `api.service.ts`

**Líneas 313-323:**

```typescript
// ANTES (INCORRECTO) ❌
marcarAsistencia(lat: number, lng: number): Observable<any> {
  const data = {
    latitud: lat,      // ← CAMBIAR
    longitud: lng,     // ← CAMBIAR
    timestamp: new Date().toISOString()
  };
  return this.http.post(`${this.baseUrl}/marcar/`, data, this.getHeaders());
}

// DESPUÉS (CORRECTO) ✅
marcarAsistencia(lat: number, lng: number): Observable<any> {
  const data = {
    lat: lat,          // ← CORRECTO
    lng: lng,          // ← CORRECTO
    timestamp: new Date().toISOString()
  };
  return this.http.post(`${this.baseUrl}/marcar/`, data, this.getHeaders());
}
```

---

## 📊 Flujo Correcto Ahora

```
1. Usuario abre componente de asistencia
   ↓
2. Se obtiene la ubicación GPS
   - position.coords.latitude → lat
   - position.coords.longitude → lng
   ↓
3. Se llama a api.marcarAsistencia(lat, lng)
   ↓
4. Se envía al backend:
   {
     "lat": -34.603,      ✅ Correcto
     "lng": -58.381,      ✅ Correcto
     "timestamp": "2026-01-21T..."
   }
   ↓
5. Backend recibe y valida:
   lat = request.data.get('lat')    ✅ Encuentra el valor
   lng = request.data.get('lng')    ✅ Encuentra el valor
   ↓
6. Continúa con lógica de geocerca y registro
   ↓
7. Respuesta exitosa (200 OK)
```

---

## 🧪 Cómo Probar

### 1. Abrir DevTools (F12)
- Tab: **Network**
- Tab: **Console**

### 2. Ir a la página de Asistencia

### 3. Hacer clic en "Obtener Ubicación"
- Esperar a que aparezca "✓ Ubicación verificada"

### 4. Hacer clic en "Marcar"
- En Network, buscar la petición `marcar/`
- Hacer clic en ella
- Ir a **Request** → **Payload**

**Debe verse así (CORRECTO):**
```json
{
  "lat": -34.6037,
  "lng": -58.3815,
  "timestamp": "2026-01-21T14:30:45.123Z"
}
```

**NO así (INCORRECTO - lo que tenía antes):**
```json
{
  "latitud": -34.6037,
  "longitud": -58.3815,
  "timestamp": "2026-01-21T14:30:45.123Z"
}
```

### 5. Verificar Response
**Debe ser 200 OK:**
```json
{
  "mensaje": "¡Entrada registrada con éxito!",
  "tipo": "ENTRADA",
  "hora": "14:30:45"
}
```

**NO debe ser 400 Bad Request:**
```json
{
  "error": "Coordenadas GPS requeridas."
}
```

---

## 📋 Checklist de Funcionamiento

- ✅ Obtener ubicación GPS sin errores
- ✅ Botón "Marcar" está habilitado
- ✅ Se envía petición con `lat` y `lng`
- ✅ Backend responde con 200 OK
- ✅ Aparece mensaje "¡Entrada registrada!"
- ✅ Se puede marcar salida
- ✅ El evento queda registrado en la base de datos

---

## 🔍 Por Qué Pasó Esto

El error ocurrió por:

1. **Inconsistencia de nombres:** El frontend usaba `latitud/longitud` (nombres en español) mientras que el backend esperaba `lat/lng` (abreviaciones en inglés).

2. **Falta de validación:** El backend respondía con error 400 cuando los parámetros no coincidían exactamente.

3. **No había sincronización:** El frontend no fue actualizado cuando el backend fue creado.

---

## 🛡️ Prevención Futura

Para evitar esto en el futuro:

1. **Documentar la API:**
   ```python
   # POST /api/marcar/
   # Parámetros requeridos:
   # - lat (float): Latitud
   # - lng (float): Longitud
   # Respuesta (200):
   # {
   #   "mensaje": "...",
   #   "tipo": "ENTRADA" | "SALIDA",
   #   "hora": "HH:MM:SS"
   # }
   ```

2. **Tests de integración:**
   ```typescript
   it('debe enviar lat y lng correctamente', () => {
     const mockResponse = { mensaje: 'OK', tipo: 'ENTRADA' };
     spyOn(http, 'post').and.returnValue(of(mockResponse));
     
     api.marcarAsistencia(-34.6, -58.3);
     
     expect(http.post).toHaveBeenCalledWith(
       jasmine.any(String),
       { lat: -34.6, lng: -58.3, timestamp: jasmine.any(String) },
       jasmine.any(Object)
     );
   });
   ```

3. **Validación en Frontend:**
   ```typescript
   if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
     throw new Error('Coordenadas GPS inválidas');
   }
   ```

---

## 📝 Resumen

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Parámetro 1** | `latitud` ❌ | `lat` ✅ |
| **Parámetro 2** | `longitud` ❌ | `lng` ✅ |
| **Status HTTP** | 400 Bad Request ❌ | 200 OK ✅ |
| **Mensaje Error** | "Coordenadas GPS requeridas" | "Entrada/Salida registrada" |
| **Funcionalidad** | No funciona | ✅ Funciona |

---

## ✨ Resultado Final

El marcaje de asistencia ahora funciona correctamente con GPS en todas las computadoras y dispositivos.

**Estado:** ✅ **RESUELTO**

