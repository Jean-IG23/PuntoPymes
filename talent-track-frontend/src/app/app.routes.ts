import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';

// 1. SERVICIOS
import { AuthService } from './services/auth.service';

// 2. COMPONENTES
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RelojComponent } from './components/reloj/reloj.component';
import { ObjetivosListComponent } from './components/objetivos-list/objetivos-list.component';
import { ObjetivoFormComponent } from './components/objetivo-form/objetivo-form.component';
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { AsistenciaAdminComponent } from './components/asistencia-admin/asistencia-admin.component';

// CORRECCIÓN 1: Verifica si tu carpeta se llama "carga-masiva" o "carga-masiva.component"
// Lo estándar en Angular es esto:
import { CargaMasivaComponent } from './components/carga-masiva/carga-masiva.component'; 

// 3. GUARD
const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

// 4. RUTAS
export const routes: Routes = [
  
  // -- RAÍZ --
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // -- RUTAS PROTEGIDAS --
  
  // DASHBOARD
  { path: 'home', component: DashboardComponent, canActivate: [authGuard] },

  // ASISTENCIA
  { path: 'reloj', component: RelojComponent, canActivate: [authGuard] },

  // OBJETIVOS (KPIs)
  { path: 'objetivos', component: ObjetivosListComponent, canActivate: [authGuard] },
  { path: 'objetivos/nuevo', component: ObjetivoFormComponent, canActivate: [authGuard] },
  { path: 'objetivos/editar/:id', component: ObjetivoFormComponent, canActivate: [authGuard] },

  // EMPLEADOS (Gestión General)
  { path: 'empleados/carga-masiva', component: CargaMasivaComponent, canActivate: [authGuard] }, 
  { path: 'empleados/nuevo', component: EmpleadoFormComponent, canActivate: [authGuard] },
  { path: 'empleados/editar/:id', component: EmpleadoFormComponent, canActivate: [authGuard] },
  { path: 'empleados', component: EmpleadoListComponent, canActivate: [authGuard] },

  // CORRECCIÓN 2: RUTAS CONTEXTUALES (Por Departamento)
  // Esto permite que la lógica de "verificarContexto" que hicimos en los componentes funcione.
  { 
    path: 'departamentos/:id/empleados', 
    component: EmpleadoListComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'departamentos/:id/empleados/nuevo', 
    component: EmpleadoFormComponent, 
    canActivate: [authGuard] 
  },

  // -- 404 --
  { path: '**', redirectTo: 'home' },
  { 
  path: 'asistencia/reporte', 
  component: AsistenciaAdminComponent, 
  canActivate: [authGuard] 
},
];