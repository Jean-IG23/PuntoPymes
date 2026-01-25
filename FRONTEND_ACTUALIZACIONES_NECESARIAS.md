# 📱 PRÓXIMAS ACTUALIZACIONES: Frontend (Angular)

**Estado:** 📋 Pendiente  
**Dependencia:** Backend ✅ completado  

---

## 🎯 CAMBIOS NECESARIOS EN FRONTEND

### 1. Componente: `empleado-form.component.ts`

**Ubicación:** `talent-track-frontend/src/app/modules/personal/components/empleado-form.component.ts`

**Cambio 1: Selector de Rol**
```typescript
// ❌ ANTES
<mat-form-field>
  <mat-label>Rol</mat-label>
  <mat-select [(ngModel)]="empleado.rol" name="rol">
    <mat-option value="GERENTE">Gerente</mat-option>
    <mat-option value="EMPLEADO">Empleado</mat-option>
  </mat-select>
</mat-form-field>

// Campo de Área (Confuso)
<mat-form-field *ngIf="empleado.rol === 'GERENTE'">
  <mat-label>Líder de Área</mat-label>
  <mat-select [(ngModel)]="empleado.lider_area" name="lider_area">
    <mat-option *ngFor="let area of areas">{{ area.nombre }}</mat-option>
  </mat-select>
</mat-form-field>

// ✅ DESPUÉS
<mat-form-field>
  <mat-label>Rol</mat-label>
  <mat-select [(ngModel)]="empleado.rol" name="rol">
    <mat-option value="GERENTE">Gerente</mat-option>
    <mat-option value="EMPLEADO">Empleado</mat-option>
  </mat-select>
</mat-form-field>

<!-- Campo de Sucursal (Claro) -->
<mat-form-field *ngIf="empleado.rol === 'GERENTE'">
  <mat-label>Sucursal a Cargo</mat-label>
  <mat-select [(ngModel)]="empleado.sucursal_a_cargo" name="sucursal_a_cargo">
    <mat-option *ngFor="let sucursal of sucursales">
      {{ sucursal.nombre }}
    </mat-option>
  </mat-select>
  <mat-hint>
    El gerente tendrá acceso a TODA la información de esta sucursal
  </mat-hint>
</mat-form-field>
```

### 2. TypeScript Component Logic

```typescript
// empleado-form.component.ts

export class EmpleadoFormComponent {
  empleado: any = {};
  sucursales: any[] = [];
  areas: any[] = [];  // ❌ ELIMINAR (ya no lo usamos)

  constructor(private empleadoService: EmpleadoService) {}

  ngOnInit() {
    this.cargarSucursales();  // ✅ Cargar sucursales
    // ❌ No cargar áreas (no se usa)
  }

  cargarSucursales() {
    // Obtener todas las sucursales de la empresa
    this.empleadoService.getSucursales().subscribe(sucursales => {
      this.sucursales = sucursales;
    });
  }

  // ✅ Validación adicional
  puedeSerGerente(): boolean {
    // Un GERENTE requiere una sucursal asignada
    if (this.empleado.rol === 'GERENTE') {
      return !!this.empleado.sucursal_a_cargo;
    }
    return true;
  }

  guardarEmpleado() {
    if (!this.puedeSerGerente()) {
      alert('Un Gerente debe tener una sucursal asignada');
      return;
    }
    
    this.empleadoService.create(this.empleado).subscribe(
      (result) => {
        alert('Empleado creado exitosamente');
      },
      (error) => {
        alert('Error: ' + error.error.detail);
      }
    );
  }
}
```

### 3. Template Actualizado

```html
<!-- empleado-form.component.html -->

<form>
  <!-- Información Básica -->
  <mat-form-field class="full-width">
    <mat-label>Nombres</mat-label>
    <input matInput [(ngModel)]="empleado.nombres" name="nombres" required>
  </mat-form-field>

  <mat-form-field class="full-width">
    <mat-label>Apellidos</mat-label>
    <input matInput [(ngModel)]="empleado.apellidos" name="apellidos" required>
  </mat-form-field>

  <!-- Estructura Organizacional -->
  <mat-form-field class="full-width">
    <mat-label>Sucursal</mat-label>
    <mat-select [(ngModel)]="empleado.sucursal" name="sucursal" required>
      <mat-option *ngFor="let s of sucursales">{{ s.nombre }}</mat-option>
    </mat-select>
  </mat-form-field>

  <mat-form-field class="full-width">
    <mat-label>Departamento</mat-label>
    <mat-select [(ngModel)]="empleado.departamento" name="departamento">
      <mat-option *ngFor="let d of departamentos">{{ d.nombre }}</mat-option>
    </mat-select>
  </mat-form-field>

  <!-- ROL -->
  <mat-form-field class="full-width">
    <mat-label>Rol del Sistema</mat-label>
    <mat-select [(ngModel)]="empleado.rol" name="rol" required>
      <mat-option value="GERENTE">🏢 Gerente</mat-option>
      <mat-option value="EMPLEADO">👤 Empleado</mat-option>
      <mat-option value="RRHH">👥 RRHH</mat-option>
      <mat-option value="ADMIN">⚙️ Admin</mat-option>
    </mat-select>
  </mat-form-field>

  <!-- ✅ NUEVO: Sucursal a Cargo (solo para GERENTES) -->
  <mat-form-field class="full-width" *ngIf="empleado.rol === 'GERENTE'">
    <mat-label>Sucursal a Cargo</mat-label>
    <mat-select [(ngModel)]="empleado.sucursal_a_cargo" name="sucursal_a_cargo" required>
      <mat-option *ngFor="let s of sucursales">{{ s.nombre }}</mat-option>
    </mat-select>
    <mat-hint>
      ℹ️ El gerente tendrá acceso completo a asistencias, tareas y nómina 
      de esta sucursal
    </mat-hint>
    <mat-error>
      Un Gerente debe tener una sucursal asignada
    </mat-error>
  </mat-form-field>

  <!-- Datos Laborales -->
  <mat-form-field class="full-width">
    <mat-label>Sueldo</mat-label>
    <input matInput type="number" [(ngModel)]="empleado.sueldo" name="sueldo">
  </mat-form-field>

  <!-- Botones -->
  <button mat-raised-button color="primary" (click)="guardarEmpleado()">
    Guardar
  </button>
</form>
```

---

## 📊 CHECKLIST ANGULAR

- [ ] Eliminar referencias a `lider_area` en todo el proyecto
- [ ] Eliminar imports de `Area` si ya no se usa
- [ ] Reemplazar selector de `lider_area` por `sucursal_a_cargo`
- [ ] Actualizar servicios para cargar `sucursales` en lugar de `areas`
- [ ] Actualizar template HTML
- [ ] Agregar validaciones en TypeScript
- [ ] Testear formulario de crear empleado
- [ ] Testear formulario de editar empleado
- [ ] Verificar API responses con campo nuevo

---

## 🔍 VALIDACIONES EN FRONTEND

```typescript
// Prevenir errores antes de enviar al backend

puedeGuardarFormulario(): boolean {
  const basico = this.empleado.nombres && this.empleado.apellidos;
  const estructural = this.empleado.sucursal;
  
  // Si es GERENTE, debe tener sucursal_a_cargo
  const gerenteValido = this.empleado.rol !== 'GERENTE' || 
                        !!this.empleado.sucursal_a_cargo;
  
  return basico && estructural && gerenteValido;
}

get mensajeError(): string {
  if (!this.empleado.nombres) return 'Falta: Nombres';
  if (!this.empleado.apellidos) return 'Falta: Apellidos';
  if (!this.empleado.sucursal) return 'Falta: Sucursal';
  if (this.empleado.rol === 'GERENTE' && !this.empleado.sucursal_a_cargo) {
    return 'Un Gerente debe tener una sucursal asignada';
  }
  return '';
}
```

---

## 🧪 TESTING EN ANGULAR

```typescript
// empleado-form.component.spec.ts

describe('EmpleadoFormComponent - Sucursal a Cargo', () => {
  let component: EmpleadoFormComponent;
  let fixture: ComponentFixture<EmpleadoFormComponent>;

  beforeEach(() => {
    // Setup
  });

  it('debe mostrar selector sucursal_a_cargo solo para GERENTE', () => {
    component.empleado.rol = 'EMPLEADO';
    fixture.detectChanges();
    
    let selectSucursalCargo = fixture.debugElement.query(
      By.css('select[name="sucursal_a_cargo"]')
    );
    expect(selectSucursalCargo).toBeNull();

    component.empleado.rol = 'GERENTE';
    fixture.detectChanges();
    
    selectSucursalCargo = fixture.debugElement.query(
      By.css('select[name="sucursal_a_cargo"]')
    );
    expect(selectSucursalCargo).toBeTruthy();
  });

  it('debe requerir sucursal_a_cargo para GERENTE', () => {
    component.empleado.rol = 'GERENTE';
    component.empleado.sucursal_a_cargo = null;
    
    const puedeGuardar = component.puedeSerGerente();
    expect(puedeGuardar).toBeFalse();
  });

  it('debe permitir guardar GERENTE con sucursal_a_cargo', () => {
    component.empleado.rol = 'GERENTE';
    component.empleado.sucursal_a_cargo = { id: 5, nombre: 'Centro' };
    
    const puedeGuardar = component.puedeSerGerente();
    expect(puedeGuardar).toBeTrue();
  });
});
```

---

## 🌐 IMPACTO EN OTRAS VISTAS

### 1. **Dashboard/Gerentes**
```typescript
// Mostrar sucursal_a_cargo en lugar de lider_area
gerentes.forEach(g => {
  console.log(`${g.nombres} - Sucursal: ${g.nombre_sucursal_a_cargo}`);
});
```

### 2. **Listado de Empleados**
```html
<!-- Columna nueva para gerentes -->
<mat-header-cell *matHeaderCellDef>A Cargo De</mat-header-cell>
<mat-cell *matCellDef="let element">
  <span *ngIf="element.rol === 'GERENTE'">
    🏢 {{ element.nombre_sucursal_a_cargo }}
  </span>
</mat-cell>
```

### 3. **Permisos/Guard**
```typescript
// El guard automáticamente filtra por sucursal_a_cargo
// (Backend maneja esto, frontend solo necesita refrescar)

canActivate(): Observable<boolean> {
  return this.usuarioService.getPermisos().pipe(
    map(permisos => permisos.includes('ver_asistencia'))
  );
}
```

---

## 📋 ARCHIVOS A ACTUALIZAR

```
talent-track-frontend/src/app/
├─ modules/
│  ├─ personal/
│  │  ├─ components/
│  │  │  ├─ empleado-form.component.ts          ✏️ ACTUALIZAR
│  │  │  ├─ empleado-form.component.html        ✏️ ACTUALIZAR
│  │  │  └─ empleado-form.component.spec.ts     ✏️ ACTUALIZAR
│  │  │
│  │  ├─ pages/
│  │  │  ├─ empleado-list.component.ts          ✏️ ACTUALIZAR
│  │  │  └─ empleado-list.component.html        ✏️ ACTUALIZAR
│  │  │
│  │  └─ services/
│  │     └─ empleado.service.ts                 ✏️ REVISAR
│  │
│  └─ dashboard/
│     └─ components/
│        └─ gerentes.component.html              ✏️ ACTUALIZAR (opcional)
```

---

## 🚀 EJECUCIÓN

**Cuando backend esté en producción:**

```bash
# 1. Pull cambios backend
git pull

# 2. Actualizar angular
cd talent-track-frontend
npm install  # si hay nuevas dependencias

# 3. Actualizar archivos según lista anterior
# (Frontend developers: Actualizar archivos mencionados)

# 4. Test
npm test

# 5. Build
ng build --prod

# 6. Deploy
npm run deploy
```

---

## 📞 REFERENCIAS

**Backend:** `IMPLEMENTACION_COMPLETADA.md`  
**Refactorización:** `REFACTORIZACION_GERENTE_SUCURSAL.md`  
**API:** `personal/serializers.py` (campo `nombre_sucursal_a_cargo`)  

---

**Nota:** Estas son las MÍNIMAS actualizaciones necesarias. El backend seguirá funcionando incluso si el frontend aún usa `lider_area`, pero mostrará datos vacíos/incorrectos.

