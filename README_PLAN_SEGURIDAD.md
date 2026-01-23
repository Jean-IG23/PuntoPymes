# 🛡️ PLAN DE PRUEBAS DE SEGURIDAD - QUICK START

**Talent Track V2.0** | Fecha: 21 de Enero de 2026

---

## 📁 Archivos Creados

```
📁 PuntoPymes/
├── 📄 PLAN_PRUEBAS_SEGURIDAD.md           ← Documento completo de pruebas (8 bloques)
├── 📄 GUIA_EJECUCION_PRUEBAS.md           ← Paso a paso para ejecutar pruebas
├── 📄 REPORTE_PRUEBAS_SEGURIDAD.md        ← Template de reporte final
├── 📄 VALIDACION_BACKEND_SEGURIDAD.py     ← Checklist backend
├── 🐍 test_seguridad.py                   ← Script automatizado (Python)
└── 📁 talent-track-frontend/
    └── 📄 src/test-seguridad-frontend.js  ← Tests en Console (JavaScript)
```

---

## 🚀 QUICK START (5 minutos)

### Paso 1: Preparar Servidor Backend

```bash
# Terminal 1: Iniciar Django
cd c:\Users\mateo\Desktop\PuntoPymes
python manage.py runserver 0.0.0.0:8000

# Resultado esperado:
# Starting development server at http://127.0.0.1:8000/
```

### Paso 2: Preparar Frontend

```bash
# Terminal 2: Iniciar Angular
cd c:\Users\mateo\Desktop\PuntoPymes\talent-track-frontend
ng serve --open

# Resultado esperado:
# ✔ Compiled successfully. [http://localhost:4200/]
```

### Paso 3: Loguearse en la App

1. Ir a: `http://localhost:4200/login`
2. Email: `admin@example.com`
3. Password: `admin123`

---

## 🧪 EJECUTAR PRUEBAS

### Opción A: Pruebas Automatizadas (Recomendado)

```bash
# Terminal 3: Ejecutar script Python
cd c:\Users\mateo\Desktop\PuntoPymes
python test_seguridad.py

# Resultado:
# ✅ PASS: AUTH-001 - Login exitoso
# ✅ PASS: XSS-001 - Sanitización de scripts
# ... (todas las pruebas)

# Genera: reporte_seguridad.json
```

### Opción B: Pruebas Manuales en Navegador

1. Abrir DevTools: **F12**
2. Ir a **Console**
3. Pegar y ejecutar:

```javascript
// Script de pruebas XSS
ejecutarTodasLasPruebas()

// Resultado:
// ✅ TEST XSS-001: Sanitización en Interpolación
// ✅ TEST XSS-002: Uso de innerHTML
// ... (todos los tests)
```

---

## 📊 8 BLOQUES DE PRUEBAS

| # | Bloque | Archivo | Duración | Status |
|---|--------|---------|----------|--------|
| 1 | **Autenticación JWT** | PLAN_PRUEBAS_SEGURIDAD.md (línea 65) | 15 min | ⬜ |
| 2 | **Protección XSS** | PLAN_PRUEBAS_SEGURIDAD.md (línea 155) | 20 min | ⬜ |
| 3 | **Protección CSRF** | PLAN_PRUEBAS_SEGURIDAD.md (línea 275) | 10 min | ⬜ |
| 4 | **Control de Acceso (RBAC)** | PLAN_PRUEBAS_SEGURIDAD.md (línea 365) | 15 min | ⬜ |
| 5 | **Manejo de Errores** | PLAN_PRUEBAS_SEGURIDAD.md (línea 500) | 5 min | ⬜ |
| 6 | **Rate Limiting** | PLAN_PRUEBAS_SEGURIDAD.md (línea 570) | 10 min | ⬜ |
| 7 | **Secretos y .env** | PLAN_PRUEBAS_SEGURIDAD.md (línea 650) | 5 min | ⬜ |
| 8 | **Aislamiento Multi-Inquilino** | PLAN_PRUEBAS_SEGURIDAD.md (línea 730) | 10 min | ⬜ |

---

## 🔍 PRUEBAS POR TIPO

### 🔐 AUTENTICACIÓN
```bash
python test_seguridad.py
# Resultado: AUTH-001, AUTH-002, AUTH-003
```

### 🧬 XSS
```javascript
// En Console (F12)
ejecutarTodasLasPruebas()
```

### 🛡️ CSRF
```javascript
testCSRF_Token()
monitorNetworkCSRF()
```

### 🔑 ACCESO (RBAC)
- Loguearse como EMPLEADO → No puede ver Dashboard
- Loguearse como GERENTE → Sí puede ver Dashboard

### ⚙️ RATE LIMITING
```bash
python test_seguridad.py
# Resultado: RATELIMIT-001 (Error 429 a request #61)
```

---

## 📋 EJEMPLO: Ejecutar UNA Prueba

### Prueba AUTH-001: Login Exitoso

```bash
# 1. En terminal, ejecutar:
python test_seguridad.py

# 2. Seleccionar solo AUTH-001 (modificar test_seguridad.py):
testador = TestadorSeguridad("http://localhost:8000")
testador.prueba_AUTH_001_login_exitoso()
testador.generar_reporte()

# 3. Resultado:
# ✅ PASS: AUTH-001 - Login exitoso genera JWT
#     → Token generado: eyJhbGci... (longitud: 256+)

# 4. Archivo generado: reporte_seguridad.json
```

---

## 📸 GUARDAR EVIDENCIAS

### Carpeta de Evidencias
```bash
# Crear carpeta
mkdir c:\Users\mateo\Desktop\PuntoPymes\evidencias

# Guardar screenshots aquí:
evidencias/
├── 01_jwt_token_storage.png
├── 02_xss_payload_test.png
├── 03_csrf_token_headers.png
├── 04_rbac_access_denied.png
├── 05_rate_limit_429.png
└── reporte_seguridad.json
```

### Cómo Guardar Screenshot
1. Presionar: `Windows + Shift + S`
2. Seleccionar área
3. Guardar en `evidencias/`

---

## ✅ CHECKLIST DE EJECUCIÓN

### Antes de Empezar:
- [ ] Django corriendo en puerto 8000
- [ ] Angular corriendo en puerto 4200
- [ ] Acceso a login funciona
- [ ] Carpeta `evidencias/` creada

### Durante las Pruebas:
- [ ] Cada prueba anotada en PLAN_PRUEBAS_SEGURIDAD.md
- [ ] Screenshots guardados en `evidencias/`
- [ ] Resultados registrados en reporte JSON

### Después de Pruebas:
- [ ] Reporte JSON generado
- [ ] Reporte Markdown completado
- [ ] Todas las evidencias guardadas
- [ ] Documento REPORTE_PRUEBAS_SEGURIDAD.md completado

---

## 🐛 SOLUCIONAR PROBLEMAS

### Problema: "ModuleNotFoundError: No module named 'requests'"
```bash
pip install requests
python test_seguridad.py
```

### Problema: "Connection refused" en localhost:8000
```bash
# Verificar que Django está corriendo:
ps aux | findstr python
# Si no está, iniciar:
python manage.py runserver
```

### Problema: "No estoy logueado en la app"
```
1. Ir a: http://localhost:4200/login
2. Email: admin@example.com
3. Password: admin123
```

---

## 📞 SOPORTE

### Archivos de Referencia:
1. **PLAN_PRUEBAS_SEGURIDAD.md** - Documento completo (todas las pruebas)
2. **GUIA_EJECUCION_PRUEBAS.md** - Pasos detallados (paso a paso)
3. **VALIDACION_BACKEND_SEGURIDAD.py** - Checklist backend (implementación)

### Comandos Útiles:
```bash
# Ver logs del backend
tail -f /ruta/django.log

# Ver logs del frontend
ng serve --verbose

# Revisar BD para hashes de passwords
psql -U usuario -d talenttrack
SELECT id, email, password FROM personal_empleado LIMIT 1;
```

---

## 📈 PRÓXIMOS PASOS

### Inmediatamente:
1. ✅ Ejecutar todos los bloques (90 min total)
2. ✅ Guardar evidencias
3. ✅ Generar reporte JSON

### Después:
4. ✅ Revisar REPORTE_PRUEBAS_SEGURIDAD.md
5. ✅ Completar secciones de "Conclusiones"
6. ✅ Usar reporte en presentación/defensa

### Para Producción:
7. ⚠️ Implementar HTTPS
8. ⚠️ Implementar 2FA
9. ⚠️ Configurar WAF
10. ⚠️ Auditoría externa

---

## 🎓 DOCUMENTOS PARA DEFENSA

### Para el Tribunal:
- ✅ PLAN_PRUEBAS_SEGURIDAD.md (¿Qué se prueba?)
- ✅ GUIA_EJECUCION_PRUEBAS.md (¿Cómo se prueba?)
- ✅ REPORTE_PRUEBAS_SEGURIDAD.md (¿Qué resultados?)
- ✅ Carpeta `evidencias/` (Prueba visual)
- ✅ `reporte_seguridad.json` (Datos automatizados)

### Script de Demostración:
```bash
# Mostrar en vivo durante defensa:
python test_seguridad.py

# O en navegador:
F12 → Console → ejecutarTodasLasPruebas()
```

---

## 🏆 ESTRATEGIA DE DEFENSA

```
PRESENTACIÓN (5 min):
1. "¿Por qué importa la seguridad?" → Explicar riesgos
2. "¿Qué podría pasar?" → Ejemplos de ataques comunes
3. "¿Cómo lo validamos?" → Mostrar plan de pruebas

DEMOSTRACIÓN (10 min):
4. Ejecutar pruebas en vivo
5. Mostrar evidencias
6. Explicar resultados

CONCLUSIONES (3 min):
7. "Todos los tests pasaron" ✅
8. "La app está segura para usuarios" 
9. "Recomendaciones para producción"
```

---

## 📞 CONTACT & SUPPORT

- **Documentación:** Ver archivos `.md` en raíz del proyecto
- **Scripts:** Ver `test_seguridad.py` y `test-seguridad-frontend.js`
- **Dudas:** Revisar sección "Solucionar Problemas" arriba

---

**¡Listo para comenzar!** 🚀

Próximo paso: Ir a `GUIA_EJECUCION_PRUEBAS.md` y seguir los pasos paso a paso.

```bash
cd c:\Users\mateo\Desktop\PuntoPymes
python test_seguridad.py
```

---

Versión: 1.0 | Fecha: 21 de Enero de 2026
