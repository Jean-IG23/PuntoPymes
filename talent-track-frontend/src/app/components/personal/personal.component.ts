import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './personal.component.html'
})
export class PersonalComponent implements OnInit {

  // --- DATOS ---
  empleados: any[] = [];
  sucursales: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  // --- FILTROS ---
  filtroSucursal: string = '';
  filtroDepartamento: string = '';

  // --- REPORTES DE ASISTENCIA ---
  estadisticasAsistencia: any = null;
  reportesEmpleados: any[] = [];
  fechaInicioReportes: string = '';
  fechaFinReportes: string = '';

  // --- VISIBILIDAD DE CONTRASEÑA ---
  showPassword: boolean = false;

  // --- ESTADOS DE VISTA ---
  loading = false;
  showModal = false;
  isEditing = false;
  empleadoSeleccionadoId: number | null = null;
  isAdminOrRRHH = false;

  // --- FORMULARIO EMPLEADO ---
  formEmpleado: FormGroup;

  // --- VARIABLES CARGA MASIVA ---
  showModalImport = false;
  archivoSeleccionado: File | null = null;
  loadingImport = false;
  reporteImport: any = null; // { total: 0, creados: 0, errores: [] }

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {
    // Inicializar fechas para reportes (mes actual)
    const hoy = new Date();
    this.fechaFinReportes = hoy.toISOString().split('T')[0];
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicioReportes = primerDia.toISOString().split('T')[0];

    // Formulario reactivo con validaciones
    this.formEmpleado = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      documento: ['', Validators.required], // Cédula
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      password: [''], // Para cambios de contraseña
      fecha_ingreso: [new Date().toISOString().split('T')[0]],
      sueldo: [460, [Validators.required, Validators.min(0)]],
      sucursal: ['', Validators.required],
      departamento: [''],
      puesto: [''],
      turno_asignado: [''],
      rol: ['EMPLEADO', Validators.required],
      estado: ['ACTIVO']
    });
  }

  ngOnInit() {
    this.isAdminOrRRHH = this.auth.isManagement() || this.auth.isSuperAdmin();
    this.cargarCatalogos();
    this.cargarEmpleados();
  }

  // ==========================================
  // 1. CARGA DE DATOS (CRUD)
  // ==========================================
  cargarCatalogos() {
    this.api.getSucursales().subscribe(res => this.sucursales = res.results || res);
    this.api.getTurnos().subscribe(res => this.turnos = res.results || res);
    // Deptos y Puestos se cargan dinámicamente o todos de una vez
    this.api.getDepartamentos().subscribe(res => this.departamentos = res.results || res);
    this.api.getPuestos().subscribe(res => this.puestos = res.results || res);
  }

  cargarEmpleados() {
    this.loading = true;
    const suc = this.filtroSucursal ? parseInt(this.filtroSucursal) : null;
    const dep = this.filtroDepartamento ? parseInt(this.filtroDepartamento) : null;

    this.api.getEmpleados(null, dep).subscribe({ // Ajusta params según tu API real
      next: (res) => {
        this.empleados = res.results || res;
        // Filtro manual de sucursal si el backend no lo hace directo en este endpoint
        if (suc) {
          this.empleados = this.empleados.filter(e => e.sucursal?.id === suc);
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // ==========================================
  // 2. GESTIÓN INDIVIDUAL (Crear/Editar)
  // ==========================================
  abrirModalNuevo() {
    this.isEditing = false;
    this.empleadoSeleccionadoId = null;
    this.formEmpleado.reset({
      sueldo: 460,
      rol: 'EMPLEADO',
      estado: 'ACTIVO',
      fecha_ingreso: new Date().toISOString().split('T')[0]
    });
    this.showModal = true;
  }

  abrirModalEditar(empleado: any) {
    this.isEditing = true;
    this.empleadoSeleccionadoId = empleado.id;
    
    // Rellenar formulario (Mapeo seguro de IDs)
    this.formEmpleado.patchValue({
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
      documento: empleado.documento,
      email: empleado.email,
      telefono: empleado.telefono,
      fecha_ingreso: empleado.fecha_ingreso,
      sueldo: empleado.sueldo,
      rol: empleado.rol,
      estado: empleado.estado,
      sucursal: empleado.sucursal?.id || '',
      departamento: empleado.departamento?.id || '',
      puesto: empleado.puesto?.id || '',
      turno_asignado: empleado.turno_asignado?.id || ''
    });
    this.showModal = true;
  }

  guardarEmpleado() {
    if (this.formEmpleado.invalid) return;
    this.loading = true;

    const data = this.formEmpleado.value;

    if (this.isEditing && this.empleadoSeleccionadoId) {
      // EDITAR
      this.api.updateEmpleado(this.empleadoSeleccionadoId, data)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            alert('✅ Empleado actualizado');
            this.showModal = false;
            this.cargarEmpleados();
          },
          error: (e) => alert('Error: ' + (e.error?.error || 'No se pudo actualizar'))
        });
    } else {
      // CREAR
      this.api.createEmpleado(data)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            alert('✅ Empleado creado exitosamente');
            this.showModal = false;
            this.cargarEmpleados();
          },
          error: (e) => alert('Error: ' + (e.error?.error || 'No se pudo crear'))
        });
    }
  }

  // --- MÉTODOS PARA REPORTES DE ASISTENCIA ---
  cargarReportesAsistencia() {
    const params = {
      fecha_inicio: this.fechaInicioReportes,
      fecha_fin: this.fechaFinReportes
    };

    this.api.get('reportes/asistencia/', params).subscribe({
      next: (res: any) => {
        this.estadisticasAsistencia = res.estadisticas_generales;
        this.reportesEmpleados = res.empleados_stats || [];
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        this.estadisticasAsistencia = null;
        this.reportesEmpleados = [];
      }
    });
  }

  calcularPuntualidadIndividual(empleado: any): number {
    if (!empleado || empleado.jornadas === 0) return 0;
    const jornadasPuntuales = empleado.jornadas - empleado.atrasos;
    return Math.round((jornadasPuntuales / empleado.jornadas) * 100);
  }

  // ==========================================
  // 3. CARGA MASIVA (Lógica Bonita)
  // ==========================================

  // A. Selección de Archivo
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.reporteImport = null; // Limpiamos reporte anterior
    }
  }

  // B. Descargar Plantilla
  bajarPlantilla() {
    this.api.downloadPlantilla();
  }

  // C. Subir al Servidor
  subirArchivo() {
    if (!this.archivoSeleccionado) return;
    
    this.loadingImport = true;
    this.reporteImport = null;

    this.api.uploadEmpleados(this.archivoSeleccionado)
      .pipe(finalize(() => this.loadingImport = false))
      .subscribe({
        next: (res) => {
          this.reporteImport = res; // { total, creados, errores: [] }
          this.archivoSeleccionado = null; // Limpiar input para permitir otro
          this.cargarEmpleados(); // Refrescar tabla de fondo
        },
        error: (e) => {
          alert('Error crítico en la carga: ' + (e.error?.error || e.message));
        }
      });
  }

  cerrarModalImport() {
    this.showModalImport = false;
    this.reporteImport = null;
    this.archivoSeleccionado = null;
  }
}