import { Routes } from '@angular/router';

// 1. IMPORTAR GUARDS (Los porteros de seguridad)
import { authGuard } from './guards/auth.guard'; 
import { adminGuard } from './guards/admin.guard'; 
import { configGuard } from './guards/config.guard';

// 2. IMPORTAR COMPONENTES
// Nota: Asegúrate de que todos empiecen con './components/...' si esa es tu estructura
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component'; 
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { OrganizacionComponent } from './components/organizacion/organizacion.component';
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { CargaMasivaComponent } from './components/carga-masiva/carga-masiva.component';
import { RelojComponent } from './components/reloj/reloj.component';
import { ObjetivosListComponent } from './components/objetivos-list/objetivos-list.component';
import { ObjetivoFormComponent } from './components/objetivo-form/objetivo-form.component';
import { AsistenciaAdminComponent } from './components/asistencia-admin/asistencia-admin.component';
import { SolicitudesComponent } from './components/solicitudes/solicitudes.component';
import { ConfigAusenciasComponent } from './components/config-ausencias/config-ausencias.component';
import { SaasDashboardComponent } from './components/saas-dashboard/saas-dashboard.component';
// 3. DEFINICIÓN DE RUTAS
export const routes: Routes = [
  
  // -- RUTA PÚBLICA --
  { path: 'login', component: LoginComponent },

  // -- RUTAS PRIVADAS (Envueltas en MainLayout) --
  {
    path: '',
    component: MainLayoutComponent, // El caparazón (Navbar + Content)
    canActivate: [authGuard],       // 1er Candado: Solo logueados pueden ver esto
    children: [
        
        // Redirección por defecto: Si entra a la raíz, va al dashboard
        { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

        // --- ACCESO GENERAL (Jefes y Empleados) ---
        { path: 'dashboard', component: DashboardComponent },
        { path: 'saas-admin', component: SaasDashboardComponent },
        { path: 'reloj', component: RelojComponent },
        { path: 'mi-perfil', component: EmpleadoFormComponent }, // O el componente de perfil de lectura
        { path: 'solicitudes', component: SolicitudesComponent },
        { path: 'objetivos', component: ObjetivosListComponent },

        // --- ACCESO RESTRINGIDO (Solo Jefes - Usamos adminGuard) ---
        
        // 1. ORGANIZACIÓN
        { 
          path: 'organizacion', 
          component: OrganizacionComponent,
          canActivate: [adminGuard] // <--- Solo Jefes
        },
        
        // 2. EMPLEADOS
        { 
          path: 'empleados', 
          component: EmpleadoListComponent,
          canActivate: [adminGuard] 
        },
        { 
          path: 'empleados/nuevo', 
          component: EmpleadoFormComponent,
          canActivate: [adminGuard]
        },
        { 
          path: 'empleados/editar/:id', 
          component: EmpleadoFormComponent,
          canActivate: [adminGuard]
        },
        { 
          path: 'empleados/carga-masiva', 
          component: CargaMasivaComponent,
          canActivate: [adminGuard]
        },
        
        // 3. CONTEXTUALES (Departamentos)
        { 
          path: 'departamentos/:id/empleados', 
          component: EmpleadoListComponent, 
          canActivate: [adminGuard] 
        },
        { 
          path: 'departamentos/:id/empleados/nuevo', 
          component: EmpleadoFormComponent, 
          canActivate: [adminGuard] 
        },

        // 4. REPORTES Y GESTIÓN
        { 
          path: 'asistencia/reporte', 
          component: AsistenciaAdminComponent, 
          canActivate: [adminGuard] 
        },
        
        // 5. GESTIÓN OBJETIVOS
        { 
          path: 'objetivos/nuevo', 
          component: ObjetivoFormComponent, 
          canActivate: [adminGuard] 
        },
        { 
          path: 'objetivos/editar/:id', 
          component: ObjetivoFormComponent, 
          canActivate: [adminGuard] 
        },
        { 
    path: 'configuracion/ausencias', 
    component: ConfigAusenciasComponent,
    canActivate: [configGuard] 
  },
    ]
  },

  // -- 404 (Wildcard) --
  // Si escriben una ruta loca, los mandamos al dashboard
  { path: '**', redirectTo: 'dashboard' },
];