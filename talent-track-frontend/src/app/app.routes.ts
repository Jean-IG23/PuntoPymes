import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { PuestoFormComponent } from './components/puesto-form/puesto-form.component';
// Listas
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { SucursalListComponent } from './components/sucursal-list/sucursal-list.component';
import { DepartamentoListComponent } from './components/departamento-list/departamento-list.component';
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';

// Formularios
import { EmpresaFormComponent } from './components/empresa-form/empresa-form.component';
import { SucursalFormComponent } from './components/sucursal-form/sucursal-form.component';
import { DepartamentoFormComponent } from './components/departamento-form/departamento-form.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { PortalEmpleadoComponent } from './components/portal-empleado/portal-empleado.component';
import { MiEmpresaComponent } from './components/mi-empresa/mi-empresa.component';
import { CargaMasivaComponent } from './components/carga-masiva.component/carga-masiva.component';
import { PuestoListComponent } from './components/puesto-list/puesto-list.component';
import { AreaListComponent } from './components/area-list/area-list.component';
import { AreaFormComponent } from './components/area-form/area-form.component';
export const routes: Routes = [
    { path: 'login', component: LoginComponent },

    // RUTA PARA EMPLEADOS (Sin Layout de Admin)
    { path: 'portal', component: PortalEmpleadoComponent, canActivate: [authGuard] },

    // RUTAS DEL ADMIN (Con Layout)
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            // CAMBIO CLAVE: Quitamos el redirectTo de aquí y lo manejamos en el componente o con ruta directa
            { path: 'dashboard', component: DashboardComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Intenta redirigir
            
            // --- SUPER ADMIN ---
            { path: 'empresas', component: EmpresaListComponent },
            { path: 'empresas/nueva', component: EmpresaFormComponent },
            
            // --- CLIENTES (Mi Empresa) ---
            { path: 'mi-empresa', component: MiEmpresaComponent },

            // --- NAVEGACIÓN PROFUNDA ---
            { path: 'empresas/:id/sucursales', component: SucursalListComponent },
            { path: 'empresas/:id/sucursales/nueva', component: SucursalFormComponent },
            { path: 'empleados/carga-masiva', component: CargaMasivaComponent },    
            { path: 'empresas/:id/empleados', component: EmpleadoListComponent },

            { path: 'sucursales/:id/departamentos', component: DepartamentoListComponent },
            { path: 'sucursales/:id/departamentos/nuevo', component: DepartamentoFormComponent },

            { path: 'departamentos/:id/empleados', component: EmpleadoListComponent },
            { path: 'departamentos/:id/empleados/nuevo', component: EmpleadoFormComponent },
            
            { path: 'empleados', component: EmpleadoListComponent },
            { path: 'puestos', component: PuestoListComponent },
            { path: 'puestos/nuevo', component: PuestoFormComponent },
            { path: 'areas', component: AreaListComponent },
            { path: 'areas/nueva', component: AreaFormComponent },
        ]
    },

    { path: '**', redirectTo: 'login' }
];