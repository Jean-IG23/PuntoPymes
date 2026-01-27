import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { filter, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  providers: [DatePipe]
})
export class DashboardComponent implements OnInit, OnDestroy {

  // --- DATOS GLOBALES ---
  userRole: string = '';
  userName: string = '';
  loading: boolean = true;
  
  // Datos Admin/Líder
  kpis = {
    totalEmpleados: 0,
    presentesHoy: 0,
    solicitudesPendientes: 0,
    porcentajeAsistencia: 0,
    llegadasTarde: 0,
    diasTrabajados: 0,
    proximoPago: '15 dic'
  };

  // Datos Empleado
  perfil = {
    puesto: '',
    saldo_vacaciones: 0,
    estado: 'ACTIVO',
    jornada_abierta: false
  };

  // Datos adicionales por rol
  tareasPendientes: number = 0;
  empresasTotal: number = 0;
  usuariosTotal: number = 0;
  empresasActivas: number = 0;

  // Charts
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'] }]
  };
  public pieChartType: ChartType = 'pie';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Asistencia', backgroundColor: '#E11D48' }]
  };
  public barChartType: ChartType = 'bar';

  // --- RELOJ Y ASISTENCIA ---
  horaActual: string = '';
  fechaActual: Date = new Date();
  private timer: any;

  // --- SOLICITUDES ---
  tiposAusencia: any[] = [];
  misSolicitudes: any[] = [];
  showModalSolicitud = false;
  formSolicitud: FormGroup;
  procesandoSolicitud = false;
  minDate: string = '';
  diasCalculados: number = 0;
  stats: any = {}; // Tu variable existente de stats
  constructor(
    private api: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    public router: Router,
    private fb: FormBuilder
  ) {
    this.minDate = new Date().toISOString().split('T')[0];
    
    this.formSolicitud = this.fb.group({
      tipo_ausencia: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]]
    });

    // Detectar cambios de fecha para calcular días
    this.formSolicitud.valueChanges.subscribe(val => {
      if (val.fecha_inicio && val.fecha_fin) this.calcularDias(val.fecha_inicio, val.fecha_fin);
    });
  }

  ngOnInit() {
    this.iniciarReloj();
    this.cargarDatos();
    this.cargarGraficos();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // Método para determinar si el usuario puede ver gráficos
  puedeVerGraficos(): boolean {
    const canSee = this.userRole === 'ADMIN' || this.userRole === 'RRHH' || this.userRole === 'GERENTE';
    console.log('puedeVerGraficos:', canSee, 'userRole:', this.userRole);
    return canSee;
  }

  marcarEntrada() {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.api.marcarAsistencia(lat, lng).subscribe({
            next: (res: any) => {
              Swal.fire('¡Entrada Registrada!', res.mensaje || 'Marcación exitosa', 'success');
              this.cargarDatos(); // Reload data to update status
            },
            error: (err) => {
              Swal.fire('Error', err.error?.error || 'No se pudo registrar la entrada', 'error');
            }
          });
        },
        (error) => {
          Swal.fire('Error de GPS', 'No se pudo obtener la ubicación. Activa el GPS.', 'error');
        }
      );
    } else {
      Swal.fire('GPS No Soportado', 'Tu dispositivo no soporta geolocalización', 'error');
    }
  }

  marcarSalida() {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.api.marcarAsistencia(lat, lng).subscribe({
            next: (res: any) => {
              Swal.fire('¡Salida Registrada!', res.mensaje || 'Marcación exitosa', 'success');
              this.cargarDatos(); // Reload data to update status
            },
            error: (err) => {
              Swal.fire('Error', err.error?.error || 'No se pudo registrar la salida', 'error');
            }
          });
        },
        (error) => {
          Swal.fire('Error de GPS', 'No se pudo obtener la ubicación. Activa el GPS.', 'error');
        }
      );
    } else {
      Swal.fire('GPS No Soportado', 'Tu dispositivo no soporta geolocalización', 'error');
    }
  }

  cargarGraficos() {
    console.log('cargarGraficos called');
    // Load chart data for management users
    this.api.getDashboardCharts().subscribe({
      next: (res: any) => {
        console.log('Charts response:', res);
        if (res?.asistencia) {
          this.pieChartData.labels = res.asistencia.labels || [];
          this.pieChartData.datasets[0].data = res.asistencia.data || [];
        }

        if (res?.productividad) {
          this.barChartData.labels = res.productividad.labels || [];
          this.barChartData.datasets[0].data = res.productividad.data || [];
        }
      },
      error: (e) => {
        console.error('Error loading charts:', e);
        // Set default data
        this.pieChartData.labels = ['Presentes', 'Ausentes', 'Pendientes'];
        this.pieChartData.datasets[0].data = [this.kpis.presentesHoy || 0, 0, 0];

        this.barChartData.labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
        this.barChartData.datasets[0].data = [0, 0, 0, 0, 0];
      }
    });
  }

  verSolicitudesPendientes() {
    // Navigate to solicitudes page to see pending requests
    this.router.navigate(['/solicitudes']);
  }

  iniciarReloj() {
    this.timer = setInterval(() => {
      const now = new Date();
      this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
  }
  

  // ================================================================
  // 1. CARGA DE DATOS INTELIGENTE
  // ================================================================
  cargarDatos() {
    this.loading = true;

    // Get user info from AuthService instead of API
    const user = this.auth.getUser();
    if (user) {
      this.userRole = user.rol;
      this.userName = `${user.nombres} ${user.apellidos || ''}`.trim();
    }

    // Load role-specific data
    if (this.auth.isSuperAdmin()) {
      // SuperAdmin gets system-wide stats
      this.api.getStats().subscribe({
        next: (res: any) => {
          this.stats = res;
          this.empresasTotal = res.empresas_total || 0;
          this.usuariosTotal = res.usuarios_total || 0;
          this.empresasActivas = res.empresas_activas || 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error loading superadmin stats:', e);
          this.loading = false;
        }
      });
    } else if (this.auth.isManagement()) {
      // Load management stats
      this.api.getStats().subscribe({
        next: (res: any) => {
          this.stats = res;
          this.kpis = {
            totalEmpleados: res.total_empleados || 0,
            presentesHoy: res.presentes_hoy || 0,
            solicitudesPendientes: res.solicitudes_pendientes || 0,
            porcentajeAsistencia: res.porcentaje_asistencia || 0,
            llegadasTarde: res.ausentes_hoy || 0,
            diasTrabajados: res.dias_trabajados || 0,
            proximoPago: res.proximo_pago || '15 dic'
          };
          this.loading = false;
          this.cargarGraficos();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error loading management stats:', e);
          this.loading = false;
        }
      });
    } else {
      // For employees, load personal data
      this.api.getStats().subscribe({
        next: (res: any) => {
          this.stats = res;
          this.perfil = {
            puesto: res.puesto || '',
            saldo_vacaciones: res.saldo_vacaciones || 0,
            estado: res.estado || 'ACTIVO',
            jornada_abierta: res.jornada_abierta || false
          };
          this.tareasPendientes = res.tareas_pendientes || 0;
          this.kpis = {
            totalEmpleados: 0,
            presentesHoy: 0,
            solicitudesPendientes: res.solicitudes_pendientes || 0,
            porcentajeAsistencia: 0,
            llegadasTarde: 0,
            diasTrabajados: res.dias_trabajados || 0,
            proximoPago: res.proximo_pago || '15 dic'
          };
          this.cargarListas();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error loading employee data:', e);
          this.loading = false;
        }
      });
    }
  }


  cargarListas() {
    // FIX: Manejar ambos formatos de respuesta
    this.api.getTiposAusencia().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.tiposAusencia = res;
        } else if (res?.results && Array.isArray(res.results)) {
          this.tiposAusencia = res.results;
        } else {
          this.tiposAusencia = [];
        }
      },
      error: (e) => {
        console.error('Error cargando tipos de ausencia:', e);
        this.tiposAusencia = [];
      }
    });
  }

  // ================================================================
  // 2. SISTEMA DE SOLICITUDES (PERMISOS/AUSENCIAS)
  // ================================================================

  // ================================================================
  // 3. GESTIÓN DE VACACIONES
  // ================================================================
  calcularDias(inicio: string, fin: string) {
    const d1 = new Date(inicio);
    const d2 = new Date(fin);
    if (d2 < d1) { this.diasCalculados = -1; return; }
    const diff = Math.abs(d2.getTime() - d1.getTime());
    this.diasCalculados = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  }

  enviarSolicitud() {
    if (this.formSolicitud.invalid) return;
    
    // Validación rápida de saldo
    const tipoId = this.formSolicitud.value.tipo_ausencia;
    const tipo = this.tiposAusencia.find(t => t.id == tipoId);
    const esVacacion = tipo?.nombre.toLowerCase().includes('vacac');

    if (esVacacion && this.diasCalculados > this.perfil.saldo_vacaciones) {
      Swal.fire('Saldo Insuficiente', `Solo tienes ${this.perfil.saldo_vacaciones} días.`, 'error');
      return;
    }

    this.procesandoSolicitud = true;
    const data = { ...this.formSolicitud.value, dias_solicitados: this.diasCalculados };

    this.api.createSolicitud(data)
      .pipe(finalize(() => { 
        this.procesandoSolicitud = false; 
        this.cdr.detectChanges(); 
      }))
      .subscribe({
        next: () => {
          this.showModalSolicitud = false;
          this.formSolicitud.reset();
          Swal.fire('Enviada', 'Tu solicitud ha sido registrada.', 'success');
          // Recargar saldo si fuera necesario
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'No se pudo enviar.', 'error')
      });
  }
}