import { Routes } from '@angular/router';

// Componentes Base
import { LayoutComponent } from './components/layout/layout.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PortalEmpleadoComponent } from './components/portal-empleado/portal-empleado.component';
import { CargaMasivaComponent } from './components/carga-masiva.component/carga-masiva.component';

// Guards
import { authGuard } from './guards/auth.guard';

// Listas
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { SucursalListComponent } from './components/sucursal-list/sucursal-list.component';
import { DepartamentoListComponent } from './components/departamento-list/departamento-list.component';
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';
import { PuestoListComponent } from './components/puesto-list/puesto-list.component';
import { AreaListComponent } from './components/area-list/area-list.component';
// 👇 IMPORTAR TURNOS AQUÍ 👇
import { TurnoListComponent } from './components/turno-list/turno-list.component';
import { TurnoFormComponent } from './components/turno-form/turno-form.component';

// Formularios
import { EmpresaFormComponent } from './components/empresa-form/empresa-form.component';
import { SucursalFormComponent } from './components/sucursal-form/sucursal-form.component';
import { DepartamentoFormComponent } from './components/departamento-form/departamento-form.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { PuestoFormComponent } from './components/puesto-form/puesto-form.component';
import { AreaFormComponent } from './components/area-form/area-form.component';

// KPI (Nuevos)
import { KpiManagerComponent } from './components/kpi-manager/kpi-manager.component';
import { KpiScoreComponent } from './components/kpi-score/kpi-score.component';
import { MiEmpresaComponent } from './components/mi-empresa/mi-empresa.component';


export const routes: Routes = [
    // 1. LOGIN (Público)
    { path: 'login', component: LoginComponent },

    // 2. PORTAL EMPLEADO (Pantalla completa, sin menú lateral de admin)
    { path: 'portal', component: PortalEmpleadoComponent, canActivate: [authGuard] },

    // 3. ZONA ADMINISTRATIVA (Con Layout/Sidebar)
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            // Dashboard
            { path: 'dashboard', component: DashboardComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
            
            // --- SUPER ADMIN ---
            { path: 'empresas', component: EmpresaListComponent },
            { path: 'empresas/nueva', component: EmpresaFormComponent },
            
            // --- CLIENTES (Mi Empresa) ---
            { path: 'mi-empresa', component: MiEmpresaComponent },

            // --- NAVEGACIÓN JERÁRQUICA ---
            { path: 'empresas/:id/sucursales', component: SucursalListComponent },
            { path: 'empresas/:id/sucursales/nueva', component: SucursalFormComponent },
            { path: 'empleados/carga-masiva', component: CargaMasivaComponent },    
            { path: 'empresas/:id/empleados', component: EmpleadoListComponent },

            { path: 'sucursales/:id/departamentos', component: DepartamentoListComponent },
            { path: 'sucursales/:id/departamentos/nuevo', component: DepartamentoFormComponent },
            { path: 'empleados/nuevo', component: EmpleadoFormComponent },

            { path: 'departamentos/:id/empleados', component: EmpleadoListComponent },
            { path: 'departamentos/:id/empleados/nuevo', component: EmpleadoFormComponent },
            
            // --- CATÁLOGOS GENERALES ---
            { path: 'empleados', component: EmpleadoListComponent },
            
            { path: 'puestos', component: PuestoListComponent },
            { path: 'puestos/nuevo', component: PuestoFormComponent },
            
            { path: 'areas', component: AreaListComponent },
            { path: 'areas/nueva', component: AreaFormComponent },

            // 👇 RUTAS DE TURNOS (AGREGADAS) 👇
            { path: 'turnos', component: TurnoListComponent },
            { path: 'turnos/nuevo', component: TurnoFormComponent },
            
            // --- RUTAS DE KPI ---
            { path: 'kpi/gestion', component: KpiManagerComponent },
            { path: 'kpi/evaluar', component: KpiScoreComponent },
        ]
    },

    // 4. Wildcard (Cualquier ruta rara va al login)
    { path: '**', redirectTo: 'login' }
];