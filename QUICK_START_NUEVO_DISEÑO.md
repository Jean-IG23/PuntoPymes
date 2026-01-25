# QUICK START - CÓMO APLICAR EL NUEVO DISEÑO

**Para:** Desarrolladores  
**Tiempo:** 2-3 minutos para entender, 1 hora por componente para aplicar

---

## 1️⃣ VERIFICAR QUE FUNCIONE

```bash
# Abrir en navegador y verificar:
# http://localhost:4200/home

# Debe verse:
✅ Navbar en la parte superior
✅ Logo con gradiente
✅ Dropdown de usuario en desktop
✅ Menu móvil en móvil
✅ Home con colores profesionales
✅ KPIs con hover effects
✅ Cards con animaciones
```

---

## 2️⃣ APLICAR A OTROS COMPONENTES

### PATRÓN A SEGUIR:

**HTML:**
```html
<!-- Usar clases globales de styles.css -->
<div class="card">
  <h2 class="section-title">Mi Sección</h2>
  <button class="btn-primary">Guardar</button>
  <button class="btn-secondary">Cancelar</button>
</div>
```

**CSS:**
```css
:host {
  display: block;
}

/* Usar SOLO variables CSS */
.my-component {
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.my-component:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

---

## 3️⃣ COLORES DISPONIBLES

```css
/* Primarios */
var(--color-primary)         /* #dc2626 - Rojo */
var(--color-primary-dark)    /* #991b1b - Rojo oscuro */
var(--color-primary-light)   /* #fca5a5 - Rojo claro */

/* Estados */
var(--color-success)         /* #10b981 - Verde */
var(--color-warning)         /* #f59e0b - Naranja */
var(--color-danger)          /* #ef4444 - Rojo peligro */
var(--color-info)            /* #3b82f6 - Azul */

/* Grays (usar estos para texto y borders) */
var(--color-gray-900)        /* Texto oscuro */
var(--color-gray-600)        /* Texto normal */
var(--color-gray-500)        /* Placeholder */
var(--color-gray-200)        /* Borders */
var(--color-gray-50)         /* Backgrounds */

/* Blanco */
var(--color-white)           /* Blanco puro */
```

---

## 4️⃣ ESPACIADO DISPONIBLE

```css
var(--spacing-xs)            /* 4px */
var(--spacing-sm)            /* 8px */
var(--spacing-md)            /* 16px */
var(--spacing-lg)            /* 24px */
var(--spacing-xl)            /* 32px */
var(--spacing-2xl)           /* 48px */
```

**Uso:**
```css
.card {
  padding: var(--spacing-lg);  /* 24px */
  gap: var(--spacing-md);      /* 16px */
  margin-bottom: var(--spacing-xl); /* 32px */
}
```

---

## 5️⃣ BORDES REDONDEADOS

```css
var(--border-radius-sm)      /* 6px - Pequeño */
var(--border-radius-md)      /* 8px - Medio */
var(--border-radius-lg)      /* 12px - Grande */
var(--border-radius-xl)      /* 16px - Extra grande */
var(--border-radius-2xl)     /* 20px - Máximo */
```

**Uso:**
```css
.card {
  border-radius: var(--border-radius-xl);  /* 16px */
}

.button {
  border-radius: var(--border-radius-lg);  /* 12px */
}
```

---

## 6️⃣ SOMBRAS

```css
var(--shadow-xs)             /* Muy sutil */
var(--shadow-sm)             /* Sutil */
var(--shadow-md)             /* Normal */
var(--shadow-lg)             /* Grande */
var(--shadow-xl)             /* Extra grande */
var(--shadow-2xl)            /* Máximo */
```

**Uso:**
```css
.card {
  box-shadow: var(--shadow-sm);        /* Default */
}

.card:hover {
  box-shadow: var(--shadow-lg);        /* Elevación */
}
```

---

## 7️⃣ TRANSICIONES

```css
var(--transition-fast)       /* 150ms */
var(--transition-base)       /* 300ms */
var(--transition-slow)       /* 500ms */
```

**Uso:**
```css
.element {
  transition: all var(--transition-base);  /* 300ms */
}

.quick-transition {
  transition: all var(--transition-fast);  /* 150ms */
}
```

---

## 8️⃣ ANIMACIONES GLOBALES

```css
/* Disponibles en styles.css */
animation: slideInUp var(--transition-base);    /* Entra desde abajo */
animation: slideInDown var(--transition-base);  /* Entra desde arriba */
animation: fadeIn var(--transition-base);       /* Fade suave */
animation: scaleIn var(--transition-base);      /* Escala suave */
animation: pulse 2s ease-in-out infinite;       /* Pulso continuo */
```

---

## 9️⃣ CLASES DE BOTONES GLOBALES

```html
<!-- Primario (Rojo) -->
<button class="btn-primary">Guardar</button>

<!-- Secundario (Gris) -->
<button class="btn-secondary">Cancelar</button>

<!-- Outline -->
<button class="btn-outline">Más opciones</button>

<!-- Pequeño -->
<button class="btn-primary btn-sm">Acción</button>

<!-- Grande -->
<button class="btn-primary btn-lg">CTA Principal</button>

<!-- Con ícono -->
<button class="btn-primary btn-icon">
  <i class="ri-save-line"></i> Guardar
</button>
```

---

## 🔟 CLASES DE CARDS

```html
<!-- Card básica -->
<div class="card">
  <h3>Título</h3>
  <p>Contenido</p>
</div>

<!-- Card elevada -->
<div class="card card-elevated">
  <h3>Título</h3>
  <p>Contenido importante</p>
</div>

<!-- Card con classes extras -->
<div class="card rounded-2xl shadow-lg">
  <!-- Combinables con clases globales -->
</div>
```

---

## 1️⃣1️⃣ ALERTAS

```html
<!-- Success -->
<div class="alert alert-success">
  <i class="ri-check-line"></i> Guardado correctamente
</div>

<!-- Warning -->
<div class="alert alert-warning">
  <i class="ri-alert-line"></i> Por favor revisar
</div>

<!-- Danger -->
<div class="alert alert-danger">
  <i class="ri-error-warning-line"></i> Error al guardar
</div>

<!-- Info -->
<div class="alert alert-info">
  <i class="ri-information-line"></i> Información importante
</div>
```

---

## 1️⃣2️⃣ BADGES

```html
<!-- Badges de color -->
<span class="badge badge-primary">Activo</span>
<span class="badge badge-success">Aprobado</span>
<span class="badge badge-warning">Pendiente</span>
<span class="badge badge-danger">Rechazado</span>
<span class="badge badge-info">Información</span>
<span class="badge badge-gray">Inactivo</span>

<!-- Con ícono -->
<span class="badge badge-success">
  <i class="ri-check-line"></i> Aprobado
</span>
```

---

## 1️⃣3️⃣ ESTRUCTURA RECOMENDADA

### Para cualquier componente nuevo:

```html
<div class="component-wrapper">
  <!-- Header -->
  <div class="section-header">
    <h2 class="section-title">
      <i class="ri-icon-line"></i>
      Mi Sección
    </h2>
    <p class="section-description">Descripción breve</p>
  </div>

  <!-- Content -->
  <div class="section-content">
    <div class="grid">
      <div class="card">
        <!-- Card content -->
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="section-actions">
    <button class="btn-primary">Guardar</button>
    <button class="btn-secondary">Cancelar</button>
  </div>
</div>
```

```css
.component-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-header {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.section-description {
  font-size: 1.0625rem;
  color: var(--color-gray-600);
  margin: var(--spacing-sm) 0 0 0;
}

.section-content {
  flex: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.section-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}
```

---

## 1️⃣4️⃣ CHECKLIST ANTES DE ENVIAR PR

- [ ] **Colors:** Todas las instancias usan `var(--color-*)`
- [ ] **No hardcoded colors:** Sin `#dc2626` o similar en HTML/CSS
- [ ] **Responsive:** Funciona en 480px, 768px, 1024px
- [ ] **Transiciones:** Todas las transiciones usan `var(--transition-*)`
- [ ] **Hover effects:** Todos los elementos clickables tienen hover
- [ ] **Spacing:** Usa variables `var(--spacing-*)`
- [ ] **Border radius:** Usa `var(--border-radius-*)`
- [ ] **Sombras:** Usa `var(--shadow-*)`
- [ ] **Animaciones:** Suave y profesional
- [ ] **Accesibilidad:** Buttons tienen aria-label, links tienen role

---

## 1️⃣5️⃣ ATAJOS ÚTILES

**Cambiar color de texto:**
```css
color: var(--color-gray-900);      /* Oscuro */
color: var(--color-gray-600);      /* Normal */
color: var(--color-gray-500);      /* Claro */
color: var(--color-white);         /* Blanco */
```

**Cambiar background:**
```css
background-color: var(--color-white);   /* Blanco */
background-color: var(--color-gray-50); /* Gris claro */
background-color: var(--color-primary); /* Rojo */
```

**Quick card:**
```css
.card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}
.card:hover { box-shadow: var(--shadow-lg); }
```

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Qué color debo usar para X?**
```
Botón primario         → var(--color-primary)
Botón secundario       → var(--color-gray-200)
Texto oscuro           → var(--color-gray-900)
Texto normal           → var(--color-gray-600)
Placeholder            → var(--color-gray-500)
Border                 → var(--color-gray-200)
Background claro       → var(--color-gray-50)
Success                → var(--color-success)
Warning/Pendiente      → var(--color-warning)
Error/Danger           → var(--color-danger)
Info                   → var(--color-info)
```

**P: ¿Cuándo usar cuál sombra?**
```
Default en cards       → var(--shadow-sm)
Hover en cards         → var(--shadow-lg)
Modales/Elevado        → var(--shadow-xl)
Muy prominente         → var(--shadow-2xl)
```

**P: ¿Transición rápida o lenta?**
```
Hover effects          → var(--transition-base)  [300ms]
Menú slide             → var(--transition-base)  [300ms]
Fade suave             → var(--transition-slow)  [500ms]
Toggle rápido          → var(--transition-fast)  [150ms]
```

---

## 📖 LEER TAMBIÉN

- [GUIA_UNIFICACION_DISEÑO_FRONTEND.md](GUIA_UNIFICACION_DISEÑO_FRONTEND.md) - Guía completa
- [RESUMEN_UNIFICACION_DISEÑO_EJECUTADO.md](RESUMEN_UNIFICACION_DISEÑO_EJECUTADO.md) - Resumen de cambios

---

**Creado:** 2026-01-22  
**Última actualización:** 2026-01-22
