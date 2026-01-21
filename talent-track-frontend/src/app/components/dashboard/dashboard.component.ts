import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AttendanceQuickMarkerComponent } from '../attendance-quick-marker/attendance-quick-marker.component';
import { filter, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, BaseChartDirective, AttendanceQuickMarkerComponent],
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
    llegadasTarde: 0
  };

  // Datos Empleado
  perfil = {
    puesto: '',
    saldo_vacaciones: 0,
    estado: 'ACTIVO',
    jornada_abierta: false
  };

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
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'] }] // Verde, Amarillo, Rojo
  };
  public pieChartType: ChartType = 'pie';

  // --- CONFIG GRÁFICO 2: BAR (Tareas) ---
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Tareas Completadas', backgroundColor: '#E11D48' }] // Rose-600
  };
  public barChartType: ChartType = 'bar';

  loadingCharts = true;
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
    
    this.api.getStats().subscribe({
      next: (res: any) => {
        // 1. Guardamos la respuesta cruda en stats (Para compatibilidad con tu HTML)
        this.stats = res; 

        // 2. Mapeo específico (Tu lógica actual)
        this.userRole = res.rol;
        this.userName = res.nombres;
        
        this.kpis = {
          totalEmpleados: res.total_empleados || 0,
          presentesHoy: res.presentes_hoy || 0,
          solicitudesPendientes: res.solicitudes_pendientes || 0,
          porcentajeAsistencia: res.porcentaje_asistencia || 0,
          llegadasTarde: res.ausentes_hoy || 0
        };

        this.perfil = {
          puesto: res.puesto,
          saldo_vacaciones: res.saldo_vacaciones,
          estado: res.estado,
          jornada_abierta: res.jornada_abierta
        };

        this.cargarListas();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }
  cargarGraficos() {
    this.loadingCharts = true;
    this.api.getDashboardCharts().subscribe({
      next: (res: any) => {
        // Asignar datos Pie
        this.pieChartData.labels = res.asistencia.labels;
        this.pieChartData.datasets[0].data = res.asistencia.data;

        // Asignar datos Barras
        this.barChartData.labels = res.productividad.labels;
        this.barChartData.datasets[0].data = res.productividad.data;

        this.loadingCharts = false;
      },
      error: () => this.loadingCharts = false
    });
  }


  cargarListas() {
    this.api.getTiposAusencia().subscribe((res: any) => this.tiposAusencia = Array.isArray(res) ? res : res.results);
    // Cargar últimas solicitudes del empleado (si aplica)
    if (this.userRole === 'EMPLEADO' || this.userRole === 'GERENTE') {
        // Asumiendo que tienes este endpoint
        // this.api.getMisSolicitudes().subscribe(...) 
    }
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