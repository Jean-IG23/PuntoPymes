import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
//import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component'; // Nuevo
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { SucursalListComponent } from './components/sucursal-list/sucursal-list.component';
import { DepartamentoListComponent } from './components/departamento-list/departamento-list.component';
import { EmpresaFormComponent } from './components/empresa-form/empresa-form.component';
import { SucursalFormComponent } from './components/sucursal-form/sucursal-form.component';
import { DepartamentoFormComponent } from './components/departamento-form/departamento-form.component';
export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
            
            // === EMPRESAS ===
            { path: 'empresas', component: EmpresaListComponent },
            { path: 'empresas/nueva', component: EmpresaFormComponent }, // NUEVO
            
            // === SUCURSALES ===
            // Ruta para ver:
            { path: 'empresas/:id/sucursales', component: SucursalListComponent },
            // Ruta para crear:
            { path: 'sucursales/nueva', component: SucursalFormComponent }, // NUEVO

            // === DEPARTAMENTOS ===
            // Ruta para ver:
            { path: 'sucursales/:id/departamentos', component: DepartamentoListComponent },
            // Ruta para crear:
            { path: 'departamentos/nuevo', component: DepartamentoFormComponent }, // NUEVO

            // === EMPLEADOS ===
            { path: 'departamentos/:id/empleados', component: EmpleadoListComponent },
            { path: 'empleados/nuevo', component: EmpleadoFormComponent },
            
        ]
    }
];