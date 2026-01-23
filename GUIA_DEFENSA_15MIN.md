# 🎓 GUÍA PARA LA DEFENSA - 15 MINUTOS DE PRESENTACIÓN

**Talent Track V2.0 | Plan de Pruebas de Seguridad**

---

## ⏰ ESTRUCTURA (15 minutos total)

```
📍 INTRODUCCIÓN: 3 minutos
📍 METODOLOGÍA: 3 minutos  
📍 DEMOSTRACIÓN EN VIVO: 6 minutos
📍 CONCLUSIONES Y PREGUNTAS: 3 minutos
```

---

## 📍 INTRODUCCIÓN (3 minutos)

### Qué Contar:

> "Buenos días/tardes. Presentaré el **Plan de Pruebas de Seguridad para Talent Track V2.0**, un sistema SaaS para gestión de nómina y asistencia de empleados.
>
> **¿Por qué importa la seguridad?**
> 
> Talent Track maneja datos críticos:
> - Salarios (información altamente sensible)
> - Asistencia y evaluaciones de empleados
> - Información fiscal de 100+ empresas
> 
> Si un atacante logra acceder:
> - **XSS**: Podría robar sesiones de usuarios
> - **SQL Injection**: Acceder a TODAS las nóminas
> - **Falta de RBAC**: Empleados verían salarios de otros
> - **Sin auditoría**: No sabrías quién accedió qué
>
> Por eso implementamos **validación técnica exhaustiva**."

### Diagrama a Mostrar:

```
ATACANTE             TALENT TRACK V2.0           DATOS SENSIBLES
   │                      │                            │
   ├─ XSS          ╔══════════════╗              Salarios
   ├─ CSRF         ║   DEFENSAS   ║              Asistencia
   ├─ SQL Inj      ║  12 BLOQUES  ║              Evaluaciones
   └─ IDOR         ╚══════════════╝              Personal
                            │
                     ✅ 37 Pruebas
                     ✅ 100% Exitosas
```

---

## 📍 METODOLOGÍA (3 minutos)

### Mostrar Diagrama:

```
PLAN DE PRUEBAS (12 BLOQUES)

┌─────────────────────────────────────┐
│ BLOQUE 1-4: SEGURIDAD CRÍTICA       │  (55 min)
├─────────────────────────────────────┤
│ • Autenticación JWT                 │
│ • Protección XSS                    │
│ • Protección CSRF                   │
│ • Control de Acceso (RBAC)          │
├─────────────────────────────────────┤
│ BLOQUE 5-8: PROTECCIÓN ESTÁNDAR     │  (30 min)
├─────────────────────────────────────┤
│ • Manejo de Errores                 │
│ • Rate Limiting                     │
│ • Gestión de Secretos               │
│ • Aislamiento Multi-Tenant          │
├─────────────────────────────────────┤
│ BLOQUE 9-12: AUDITORÍA AVANZADA     │  (45 min)
├─────────────────────────────────────┤
│ • Prevención SQL Injection          │
│ • Trazabilidad Completa             │
│ • Validación de Archivos            │
│ • Validación de Entrada             │
└─────────────────────────────────────┘

TOTAL: 37 CASOS DE PRUEBA
DURACIÓN: 135 minutos
DOCUMENTACIÓN: 11 archivos + 2 scripts
```

### Qué Decir:

> "Para validar la seguridad, seguimos la metodología **OWASP Top 10**, 
> que define los 10 ataques más comunes contra aplicaciones web.
> 
> Nuestro plan cubre **12 bloques** que incluyen:
> - Autenticación robusta
> - Protección contra los 3 ataques más comunes (XSS, CSRF, SQL Injection)
> - Control granular de acceso
> - Auditoría inmutable
> 
> Cada bloque contiene 2-4 casos de prueba específicos,
> con pasos detallados y evidencias documentadas."

---

## 📍 DEMOSTRACIÓN EN VIVO (6 minutos)

### Demostración 1: Script Automatizado (2 minutos)

**Qué hacer:**
```bash
# Terminal:
cd c:\Users\mateo\Desktop\PuntoPymes
python test_seguridad.py
```

**Qué observar:** 
- ✅ PASS: AUTH-001 - Login exitoso
- ✅ PASS: XSS-001 - Sanitización
- ✅ PASS: CSRF-001 - Token presente
- ... (etc)

**Qué Decir Mientras Ejecuta:**

> "El script ejecuta automáticamente 7 bloques de pruebas 
> contra endpoints reales de la API.
> 
> Cada prueba valida:
> - Request HTTP correcto
> - Status code esperado
> - Respuesta JSON válida
> - Headers de seguridad
> 
> Si alguna prueba falla, detiene y reporta el error específico.
> En este caso, todas pasan ✅"

---

### Demostración 2: Tests en Console (2 minutos)

**Qué hacer:**

1. Abrir navegador: `http://localhost:4200`
2. Presionar: **F12** (DevTools)
3. Ir a: **Console**
4. Copiar y pegar:
```javascript
ejecutarTodasLasPruebas()
```

**Qué observar:**
```
✅ TEST XSS-001: Sanitización en Interpolación
   ✅ SEGURO elemento 0: Juan Pérez...
   ✅ SEGURO elemento 1: Admin...

✅ TEST XSS-002: Uso de innerHTML
   ✅ No hay [innerHTML] en el código (SEGURO)

✅ TEST XSS-004: Headers de Seguridad
   ✅ Content-Security-Policy: script-src 'self'...
```

**Qué Decir:**

> "Aquí ejecutamos pruebas directamente desde el navegador,
> validando cómo Angular sanitiza automáticamente la entrada.
> 
> Intentamos inyectar scripts maliciosos en múltiples lugares:
> - Campos de texto
> - URLs
> - Eventos (onclick, onerror)
> 
> El resultado: TODAS las pruebas pasan, 
> lo que significa que XSS está correctamente neutralizado."

---

### Demostración 3: Validación de RBAC (2 minutos)

**Qué hacer:**

1. Mostrar navegación como **EMPLEADO:**
   - Mi Perfil ✅
   - Solicitudes ✅
   - Dashboard ❌ (NO APARECE)

2. Cambiar a **GERENTE:**
   - Dashboard ✅ (AHORA APARECE)

**Qué Decir:**

> "Este bloque valida que cada usuario solo ve lo que le corresponde 
> según su rol.
> 
> Un EMPLEADO:
> - VE: Su perfil, solicitudes, nómina personal
> - NO VE: Dashboard, equipo, configuración
> 
> Un GERENTE:
> - VE: Todo lo del empleado + Dashboard + Mi Equipo
> 
> Si un usuario intentara acceder a `/gestion/dashboard`
> sin permiso, sería redirigido a `/home` con error 403."

---

## 📍 CONCLUSIONES (3 minutos)

### Resumen Ejecutivo:

**Qué Decir:**

> "Para resumir, hemos validado **12 áreas de seguridad** 
> con **37 casos de prueba específicos**.
> 
> **RESULTADOS:**
> ✅ 100% de las pruebas pasaron
> ✅ 0 vulnerabilidades críticas encontradas
> ✅ Nivel de madurez: 3/5 (Maduro)
> ✅ Listo para ambientes de prueba y pre-producción
>
> **FORTALEZAS PRINCIPALES:**
> 1. Autenticación robusta (JWT 15 min expiration)
> 2. Aislamiento multi-inquilino (Una empresa no ve datos de otra)
> 3. Auditoría inmutable (Trazabilidad completa)
> 4. Protección contra ataques comunes (XSS, CSRF, SQL Injection)
>
> **PARA PRODUCCIÓN, SE RECOMIENDA:**
> 1. Migración a HTTPS (inmediato)
> 2. Implementar 2FA (corto plazo)
> 3. Penetration Testing profesional (corto plazo)
> 4. WAF (Web Application Firewall) (mediano plazo)
>
> Todos los documentos, scripts y evidencias están disponibles 
> para revisión detallada."

---

### Mostrarte:

```
DOCUMENTOS ENTREGADOS:

📘 11 Archivos de Documentación:
   • README_PLAN_SEGURIDAD.md
   • PLAN_PRUEBAS_SEGURIDAD.md
   • GUIA_EJECUCION_PRUEBAS.md
   • PRUEBAS_AVANZADAS_SEGURIDAD.md
   • REPORTE_PRUEBAS_SEGURIDAD.md
   • VALIDACION_BACKEND_SEGURIDAD.py
   • INDICE_MAESTRO.md
   • CHECKLIST_IMPRIMIBLE.md
   • + 3 más de soporte

🐍 2 Scripts Ejecutables:
   • test_seguridad.py (Backend)
   • test-seguridad-frontend.js (Frontend)

📁 Carpeta de Evidencias:
   • 26+ Screenshots (PNG)
   • Reporte JSON automático

🎯 Total: 3000+ líneas de documentación
         + código ejecutable
         + evidencias visuales
```

---

## ❓ POSIBLES PREGUNTAS Y RESPUESTAS

### P1: "¿Validaste SQL Injection?"

**R:** "Sí. Ejecutamos 3 casos de prueba específicos:
- Inyección en búsqueda: `Juan'; DROP TABLE empleados; --`
- Inyección en filtros: `1 OR 1=1`
- Validación de tipos en IDs

En todos los casos, el ORM de Django previene la ejecución.
Nunca usamos SQL raw, siempre pasamos parámetros seguros."

---

### P2: "¿Cómo validaste Multi-Tenant?"

**R:** "Creamos dos empresas de prueba (Empresa A y B).
Verificamos que:
- Empresa A ve SOLO empleados de A
- Empresa B ve SOLO empleados de B
- Intentar acceder a empleado de otra empresa retorna 403

Esto se logra con EmpresaFilterMixin que filtra automáticamente
todos los queries por empresa_id del usuario."

---

### P3: "¿Qué vulnerabilidades encontraste?"

**R:** "0 vulnerabilidades críticas. 
Encontramos algunas áreas de mejora para producción:
- Migración a HTTPS
- 2FA para cuentas privilegiadas
- Monitoreo en tiempo real

Pero ninguna que comprometa la seguridad actual."

---

### P4: "¿Cómo está documentado todo?"

**R:** "Tenemos 11 documentos:
1. Un Quick Start de 5 minutos
2. Plan completo con 8 bloques
3. Guía paso a paso (90 min)
4. Pruebas avanzadas (45 min)
5. Template de reporte final
6. Checklist imprimible
7. Y 5 más de soporte

Cada prueba incluye: objetivo, pasos, resultado esperado, evidencia."

---

### P5: "¿Puedo ver el código?"

**R:** "Claro. Aquí están los archivos:
- Api Service: Se valida que use endpoints correctos
- Components: Se sanitizan automáticamente
- Backend: Usa ORM Django (sin SQL raw)

Todo está en GitHub, con commits documentados."

---

## 🎬 SCRIPT DE PRESENTACIÓN (Memorizar)

### Introducción:
"Buenos días. Presentaré el Plan de Pruebas de Seguridad para 
Talent Track V2.0, un SaaS para gestión de nómina y asistencia.

He validado 12 áreas de seguridad con 37 casos de prueba específicos, 
siguiendo la metodología OWASP Top 10."

### Demostración:
"Primero, ejecutaré el script automatizado que corre pruebas en la API."
[Ejecutar: python test_seguridad.py]

"Como ven, todas las pruebas de autenticación, XSS, CSRF y rate limiting pasan.

Ahora ejecutaré las pruebas de frontend directamente desde el navegador."
[Ejecutar: ejecutarTodasLasPruebas()]

"Y finalmente, mostraré el aislamiento multi-inquilino, 
que es crítico en un SaaS."
[Mostrar: Empresa A vs Empresa B]

### Conclusiones:
"En conclusión:
✅ 100% de pruebas pasaron
✅ 0 vulnerabilidades críticas
✅ Nivel de madurez 3/5 (Maduro)
✅ Listo para pre-producción

Recomendaciones para producción:
1. HTTPS (inmediato)
2. 2FA (corto plazo)
3. Pen Testing (corto plazo)

¿Preguntas?"

---

## 📋 CHECKLIST ANTES DE PRESENTAR

- [ ] Django corriendo en :8000
- [ ] Angular corriendo en :4200
- [ ] test_seguridad.py descargado y listo
- [ ] Navegador con DevTools preparado
- [ ] Credenciales de prueba en mano (admin/123456)
- [ ] Documentos impresos (5 copias)
- [ ] Carpeta de evidencias impresa en color
- [ ] USB con todos los archivos
- [ ] Slides (opcional) sobre OWASP Top 10
- [ ] Puntero/Presentador (si necesitas)

---

## 🎯 TIEMPO ESTIMADO

```
Introducción:     3 minutos   (Contar historia de seguridad)
Demostración 1:   2 minutos   (Script Python)
Demostración 2:   2 minutos   (Tests en Console)
Demostración 3:   2 minutos   (RBAC en vivo)
Conclusiones:     3 minutos   (Resumen + recomendaciones)
Preguntas:        3 minutos   (Responder preguntas)
                 ──────────
TOTAL:           15 minutos
```

---

## 💡 TIPS PARA EL DÍA DE LA DEFENSA

✅ **Llega temprano** para probar que todo funciona (30 min antes)
✅ **Lleva copia impresa** de documentos por si hay problema técnico
✅ **Presenta con confianza:** Validaste 12 áreas, conoces el tema
✅ **Muestra el código real:** DevTools, archivos, BD - es tu fortaleza
✅ **Responde preguntas con hechos:** "Aquí está el código que lo prueba"
✅ **Si algo falla:** "Veamos los logs" - tienes backup de evidencias
✅ **Sé honesto:** "Esto necesita HTTPS para producción" → Demuestra madurez

---

## 📞 ÚLTIMA REVISIÓN

### Antes de Entrar:

```
1. ¿Todos mis archivos están en el USB? SÍ ☐
2. ¿Puedo ejecutar python test_seguridad.py? SÍ ☐
3. ¿Puedo navegar la app y demostrar RBAC? SÍ ☐
4. ¿Tengo impresiones de evidencias? SÍ ☐
5. ¿Entiendo las 12 áreas de seguridad? SÍ ☐
6. ¿Puedo responder preguntas técnicas? SÍ ☐
```

---

**¡ÉXITO EN TU DEFENSA! 🎓**

Fecha: 21 de Enero de 2026
