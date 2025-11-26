import { Routes } from '@angular/router';
import { EmpleadoListComponent } from './components/empleado-list/empleado-list.component';
import { EmpleadoFormComponent } from './components/empleado-form/empleado-form.component';
import { LayoutComponent } from './components/layout/layout.component'; 

export const routes: Routes = [
    // RUTA PADRE (El Layout)
    {
        path: '',
        component: LayoutComponent,
        children: [
            // RUTAS HIJAS (Se cargan dentro del <router-outlet> del Layout)
            
            // Si entran a la raíz, redirigir a empleados
            { path: '', redirectTo: 'empleados', pathMatch: 'full' },
            
            { path: 'empleados', component: EmpleadoListComponent },
            { path: 'empleados/nuevo', component: EmpleadoFormComponent },
            
            // Aquí irán las futuras rutas:
            // { path: 'empresas', component: EmpresaListComponent },
        ]
    },
    
    // (Opcional) Ruta para Login fuera del layout (lo haremos después)
    // { path: 'login', component: LoginComponent }
];