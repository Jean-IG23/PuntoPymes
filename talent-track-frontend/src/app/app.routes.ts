import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard'; 
import { adminGuard } from './guards/admin.guard'; 
import { configGuard } from './guards/config.guard';
import { organizationGuard } from './guards/organization.guard';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
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
import { ReportesComponent } from './components/reportes/reportes.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { TareasComponent } from './components/tareas/tareas.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { NominaComponent } from './components/nomina/nomina.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { KpiManagerComponent } from './components/kpi-manager/kpi-manager.component';
import { KpiScoreComponent } from './components/kpi-score/kpi-score.component';

export const routes: Routes = [
  
  // ==========================================
  // 🌐 RUTAS PÚBLICAS
  // ==========================================
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // ==========================================
  // 🔒 RUTAS PRIVADAS (Envueltas en MainLayout)
  // ==========================================
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
        
        // ========================================
        // 📱 ACCESO PARA TODOS LOS USUARIOS
        // ========================================

        // Dashboard Principal (Unificado por roles)
        { path: 'dashboard', component: DashboardComponent },

        // Reloj de Asistencia
        { path: 'reloj', component: RelojComponent },
        
        // Perfil Personal
        { path: 'mi-perfil', component: PerfilComponent },
        
        // Solicitudes (Vacaciones, Permisos, etc.)
        { path: 'solicitudes', component: SolicitudesComponent },
        
        // Reportes Generales
        { path: 'reportes', component: ReportesComponent },
        
        // Tareas Asignadas
        { path: 'tareas', component: TareasComponent },
        
        // Nómina Personal
        { path: 'nomina', component: NominaComponent },

        // Ranking de Desempeño (Público para todos)
        { path: 'ranking', component: RankingComponent },
        
        // Mis Objetivos
        { path: 'objetivos', component: ObjetivosListComponent },

        // ========================================
        // 👨‍💼 GESTIÓN - SOLO JEFES/MANAGERS
        // ========================================
        {
          path: 'gestion',
          canActivate: [adminGuard],
          children: [
            // Dashboard de Jefe (Analytics, KPIs, estadísticas del equipo)
            { 
              path: 'dashboard', 
              component: DashboardComponent 
            },
            
            // Gestión de Personal
            { 
              path: 'empleados', 
              component: EmpleadoListComponent 
            },
            { 
              path: 'empleados/nuevo', 
              component: EmpleadoFormComponent 
            },
            { 
              path: 'empleados/editar/:id', 
              component: EmpleadoFormComponent 
            },
            { 
              path: 'carga-masiva', 
              component: CargaMasivaComponent 
            },
            
            // Asistencia del Equipo
            { 
              path: 'asistencia', 
              component: AsistenciaAdminComponent 
            },

            // Evaluaciones (Registrar KPIs y calificar objetivos)
            { 
              path: 'evaluaciones', 
              component: KpiScoreComponent 
            },

            // Organización (Estructura de empresa) - SOLO ADMIN, RRHH, SUPERADMIN
            { 
              path: 'organizacion', 
              component: OrganizacionComponent,
              canActivate: [organizationGuard]  // Bloquea acceso a GERENTE
            },

            // Contextuales (Empleados por departamento)
            { 
              path: 'departamentos/:id/empleados', 
              component: EmpleadoListComponent 
            },
            { 
              path: 'departamentos/:id/empleados/nuevo', 
              component: EmpleadoFormComponent 
            },

            // Crear/Editar Objetivos
            { 
              path: 'objetivos/nuevo', 
              component: ObjetivoFormComponent 
            },
            { 
              path: 'objetivos/editar/:id', 
              component: ObjetivoFormComponent 
            },
          ]
        },

        // ========================================
        // ⚙️ ADMIN - SOLO ADMINISTRADOR DE EMPRESA
        // ========================================
        {
          path: 'admin',
          canActivate: [configGuard],
          children: [
            // Definir KPIs para la empresa
            { 
              path: 'kpi', 
              component: KpiManagerComponent 
            },
            
            // Configurar Ausencias (Vacaciones, permisos, etc.)
            { 
              path: 'ausencias', 
              component: ConfigAusenciasComponent 
            },

            // Configuración General
            { 
              path: 'configuracion', 
              component: ConfiguracionComponent 
            },
          ]
        },

        // ========================================
        // 🏢 SAAS - SOLO SUPERADMIN
        // ========================================
        {
          path: 'saas',
          canActivate: [adminGuard],
          children: [
            // Dashboard SaaS (Analytics de toda la plataforma)
            { 
              path: 'dashboard', 
              component: SaasDashboardComponent 
            },

            // Gestión de Empresas Clientes
            // { 
            //   path: 'empresas', 
            //   component: EmpresaListComponent 
            // },
          ]
        },

        // ========================================
        // 🔄 REDIRECCIONES LEGACY
        // ========================================
        { path: 'portal', redirectTo: '/reloj', pathMatch: 'full' },
        { path: 'kpi/manager', redirectTo: '/admin/kpi', pathMatch: 'full' },
    ]
  },

  // ==========================================
  // 🚫 WILDCARD - Página no encontrada
  // ==========================================
  { path: '**', redirectTo: 'dashboard' },
];