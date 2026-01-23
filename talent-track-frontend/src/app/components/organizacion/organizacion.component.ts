import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './organizacion.component.html'
})
export class OrganizacionComponent implements OnInit {
  
  // --- ESTADO DE VISTA ---
  activeTab: string = 'ESTRUCTURA'; 
  activeSubTab: string = 'SUCURSALES';
  isSuperAdmin: boolean = false;
  loading: boolean = false;
  isEditing: boolean = false;
  selectedId: number | null = null;

  // --- DATOS ---
  empresas: any[] = [];
  sucursales: any[] = [];
  areas: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];
  empleadosList: any[] = []; 

  // --- FORMULARIOS ---
  formEmpresa: FormGroup;
  sucursalForm: FormGroup;
  areaForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;
  turnoForm: FormGroup;

  // --- VISIBILIDAD DE MODALES ---
  showModalEmpresa = false;
  showModalSucursal = false;
  showModalArea = false;
  showModalDepto = false;
  showModalPuesto = false;
  showModalTurno = false;

  diasSemana = [
    { id: 'LUN', nombre: 'Lunes' }, { id: 'MAR', nombre: 'Martes' },
    { id: 'MIE', nombre: 'Miércoles' }, { id: 'JUE', nombre: 'Jueves' },
    { id: 'VIE', nombre: 'Viernes' }, { id: 'SAB', nombre: 'Sábado' },
    { id: 'DOM', nombre: 'Domingo' }
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {
    // 1. EMPRESA
    this.formEmpresa = this.fb.group({
      nombre_comercial: ['', Validators.required],
      razon_social: ['', Validators.required],
      ruc: ['', [Validators.required, Validators.minLength(10)]],
      admin_email: [''],
      admin_password: ['']
    });

    // 2. SUCURSAL
    this.sucursalForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: [''],
      es_matriz: [false],
      responsable: [null],
      latitud: [null, [Validators.pattern(/^-?[0-9]+(\.[0-9]+)?$/)]], 
      longitud: [null, [Validators.pattern(/^-?[0-9]+(\.[0-9]+)?$/)]], 
      radio_metros: [50, [Validators.required, Validators.min(10), Validators.max(5000), Validators.pattern(/^[0-9]+$/)]]
    });

    // 3. ÁREA
    this.areaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['']
    });

    // 4. DEPARTAMENTO
    this.deptoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      area: [null, Validators.required],
      sucursal: [null, Validators.required]
    });

    // 5. PUESTO
    this.puestoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      area: [null],
      es_supervision: [false]
    });

    // 6. TURNO
    this.turnoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tipo_jornada: ['RIGIDO', Validators.required],
      hora_entrada: ['09:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      hora_salida: ['18:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      horas_semanales_meta: [40, [Validators.required, Validators.min(1), Validators.max(168), Validators.pattern(/^[0-9]{1,3}$/)]],
      dias_laborables: [[]]
    });
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    // Si NO es superadmin, forzamos la vista de estructura
    if (!this.isSuperAdmin) {
      this.activeTab = 'ESTRUCTURA';
    } else {
      this.activeTab = 'EMPRESAS'; // Por defecto para SuperAdmin
    }
    this.cargarTodo();
  }

  cargarTodo() {
    this.loading = true;
    
    const peticiones: any = {};
    
    // Empresas solo para SuperAdmin
    if (this.isSuperAdmin) {
      peticiones.empresas = this.api.getEmpresas();
    }
    
    // Datos que cargamos siempre
    peticiones.sucursales = this.api.getSucursales();
    peticiones.areas = this.api.getAreas();
    peticiones.departamentos = this.api.getDepartamentos();
    peticiones.puestos = this.api.getPuestos();
    peticiones.turnos = this.api.getTurnos();
    peticiones.empleados = this.api.getEmpleadosSimple();

    forkJoin(peticiones).subscribe({
      next: (res: any) => {
        // Procesar empresas
        if (this.isSuperAdmin && res.empresas) {
          this.empresas = Array.isArray(res.empresas) ? res.empresas : (res.empresas.results || []);
        }

        // Procesar otros datos
        this.sucursales = Array.isArray(res.sucursales) ? res.sucursales : (res.sucursales.results || []);
        this.areas = Array.isArray(res.areas) ? res.areas : (res.areas.results || []);
        this.departamentos = Array.isArray(res.departamentos) ? res.departamentos : (res.departamentos.results || []);
        this.puestos = Array.isArray(res.puestos) ? res.puestos : (res.puestos.results || []);
        this.turnos = Array.isArray(res.turnos) ? res.turnos : (res.turnos.results || []);
        this.empleadosList = Array.isArray(res.empleados) ? res.empleados : (res.empleados.results || []);
        
        this.loading = false;
        
        // Forzar detección de cambios para actualizar la vista
        this.cd.detectChanges();
      },
      error: (e) => {
        console.error('Error cargando datos de organización:', e);
        Swal.fire('Error', 'No se pudieron cargar los datos de la organización', 'error');
        this.loading = false;
      }
    });
  }

  // ==========================================================
  // 🏢 GESTIÓN DE EMPRESAS
  // ==========================================================
  abrirModalEmpresa(emp: any = null) {
    this.selectedId = emp ? emp.id : null;
    this.isEditing = !!emp;
    
    if (emp) {
      this.formEmpresa.patchValue(emp);
      this.formEmpresa.get('admin_email')?.clearValidators();
      this.formEmpresa.get('admin_password')?.clearValidators();
    } else {
      this.formEmpresa.reset();
      this.formEmpresa.get('admin_email')?.setValidators([Validators.required, Validators.email]);
      this.formEmpresa.get('admin_password')?.setValidators([Validators.required]);
    }
    this.formEmpresa.get('admin_email')?.updateValueAndValidity();
    this.formEmpresa.get('admin_password')?.updateValueAndValidity();
    this.showModalEmpresa = true;
  }

  guardarEmpresa() {
    if (this.formEmpresa.invalid) return;
    this.loading = true;
    
    const req = this.selectedId 
      ? this.api.updateEmpresa(this.selectedId, this.formEmpresa.value)
      : this.api.createEmpresa(this.formEmpresa.value);

    req.subscribe({
      next: () => {
        this.finishSave('Empresa guardada');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarEmpresa(emp: any) {
    Swal.fire({
      title: '¿Dar de baja?',
      text: `Se desactivará la empresa ${emp.nombre_comercial}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar'
    }).then((r) => {
      if (r.isConfirmed) {
        this.api.updateEmpresa(emp.id, { estado: false }).subscribe(() => {
          this.cargarTodo();
          Swal.fire('Listo', 'Empresa desactivada', 'success');
        });
      }
    });
  }

  cambiarEstadoEmpresa(emp: any, event: any) {
    const nuevoEstado = event.target.checked;
    this.api.updateEmpresa(emp.id, { estado: nuevoEstado }).subscribe({
      next: () => Swal.fire({
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Estado actualizado', showConfirmButton: false, timer: 1500
      }),
      error: () => {
        event.target.checked = !nuevoEstado;
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
      }
    });
  }

  // ==========================================================
  // 📍 GESTIÓN DE SUCURSALES (CON GEOLOCALIZACIÓN)
  // ==========================================================
  abrirModalSucursal(sucursal?: any) {
    this.showModalSucursal = true;
    if (sucursal) {
      this.isEditing = true;
      this.selectedId = sucursal.id;
      this.sucursalForm.patchValue(sucursal);
    } else {
      this.isEditing = false;
      this.selectedId = null;
      this.sucursalForm.reset({ 
        es_matriz: false, 
        radio_metros: 50 
      });
    }
  }

  cerrarModalSucursal() {
    this.showModalSucursal = false;
  }

  obtenerUbicacionActual() {
    if (navigator.geolocation) {
      // Mostrar loading temporal si deseas
      const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      toast.fire({ icon: 'info', title: 'Obteniendo GPS...' });

      navigator.geolocation.getCurrentPosition((position) => {
        this.sucursalForm.patchValue({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        });
        toast.fire({ icon: 'success', title: 'Ubicación capturada' });
      }, (error) => {
        console.error(error);
        alert('No se pudo obtener la ubicación. Verifique los permisos del navegador.');
      }, {
        enableHighAccuracy: true
      });
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    this.loading = true;
    
    const data = this.sucursalForm.value;
    // Asignar empresa actual si no eres superadmin gestionando otra
    if (!this.isSuperAdmin) {
       data.empresa = this.auth.getEmpresaId(); 
    }

    const request = this.isEditing && this.selectedId
      ? this.api.updateSucursal(this.selectedId, data)
      : this.api.createSucursal(data);

    request.subscribe({
      next: () => {
        this.finishSave('Sucursal guardada');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarSucursal(item: any) {
    this.confirmDelete(item.id, this.api.deleteSucursal.bind(this.api), 'Sucursal');
  }

  // ==========================================================
  // 🏷️ GESTIÓN DE ÁREAS
  // ==========================================================
  abrirModalArea(item: any = null) {
    this.selectedId = item ? item.id : null;
    this.isEditing = !!item;
    item ? this.areaForm.patchValue(item) : this.areaForm.reset();
    this.showModalArea = true;
  }

  guardarArea() {
    if (this.areaForm.invalid) return;
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updateArea(this.selectedId, this.areaForm.value)
      : this.api.createArea(this.areaForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Área guardada');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarArea(item: any) {
    this.confirmDelete(item.id, this.api.deleteArea.bind(this.api), 'Área');
  }

  // ==========================================================
  // 📂 GESTIÓN DE DEPARTAMENTOS
  // ==========================================================
  abrirModalDepto(item: any = null) {
    this.selectedId = item ? item.id : null;
    this.isEditing = !!item;
    item ? this.deptoForm.patchValue(item) : this.deptoForm.reset();
    this.showModalDepto = true;
  }

  guardarDepto() {
    if (this.deptoForm.invalid) return;
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updateDepartamento(this.selectedId, this.deptoForm.value)
      : this.api.createDepartamento(this.deptoForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Departamento guardado');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarDepto(item: any) {
    this.confirmDelete(item.id, this.api.deleteDepartamento.bind(this.api), 'Departamento');
  }

  // ==========================================================
  // 💼 GESTIÓN DE PUESTOS
  // ==========================================================
  abrirModalPuesto(item: any = null) {
    this.selectedId = item ? item.id : null;
    this.isEditing = !!item;
    item ? this.puestoForm.patchValue(item) : this.puestoForm.reset({ es_supervision: false });
    this.showModalPuesto = true;
  }

  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updatePuesto(this.selectedId, this.puestoForm.value)
      : this.api.createPuesto(this.puestoForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Cargo guardado');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarPuesto(item: any) {
    this.confirmDelete(item.id, this.api.deletePuesto.bind(this.api), 'Cargo');
  }

  // ==========================================================
  // ⏰ GESTIÓN DE TURNOS
  // ==========================================================
  abrirModalTurno(item: any = null) {
    this.selectedId = item ? item.id : null;
    this.isEditing = !!item;
    if (item) {
      this.turnoForm.patchValue(item);
    } else {
      this.turnoForm.reset({ 
        tipo_jornada: 'RIGIDO', 
        hora_entrada: '09:00', 
        hora_salida: '18:00',
        horas_semanales_meta: 40,
        dias_laborables: [] 
      });
    }
    this.showModalTurno = true;
  }

  guardarTurno() {
    if (this.turnoForm.invalid) {
      Swal.fire('Atención', 'Verifica los campos obligatorios', 'warning');
      return;
    }
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updateTurno(this.selectedId, this.turnoForm.value)
      : this.api.createTurno(this.turnoForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Turno configurado');
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarTurno(item: any) {
    this.confirmDelete(item.id, this.api.deleteTurno.bind(this.api), 'Turno');
  }

  isDiaChecked(diaId: string): boolean {
    const dias = this.turnoForm.get('dias_laborables')?.value || [];
    return dias.includes(diaId);
  }

  onDiaChange(event: any, diaId: string) {
    const checked = event.target.checked;
    const current = this.turnoForm.get('dias_laborables')?.value || [];
    let nuevosDias: string[]= [];

    if (checked) {
      nuevosDias = [...current, diaId];
    } else {
      nuevosDias = current.filter((d: string) => d !== diaId);
    }
    this.turnoForm.patchValue({ dias_laborables: nuevosDias });
  }

  // ==========================================================
  // 🔧 HELPERS Y UTILIDADES
  // ==========================================================
  private finishSave(msg: string) {
    this.loading = false;
    this.selectedId = null;
    
    // Cerrar automáticamente los modales después de guardar
    this.showModalEmpresa = false;
    this.showModalSucursal = false;
    this.showModalArea = false;
    this.showModalDepto = false;
    this.showModalPuesto = false;
    this.showModalTurno = false;
    
    // Mostrar éxito
    Swal.fire('¡Éxito!', msg, 'success');
    
    // Recargar datos en background (sin bloquear)
    setTimeout(() => {
      this.cargarTodo();
      // Forzar change detection después de cargar
      this.cd.detectChanges();
    }, 500);
  }

  private handleError(e: any) {
    this.loading = false;
    console.error('Error completo:', e);
    
    // Extraer mensaje de error del servidor
    let msg = 'Error en el servidor';
    
    // Intentar obtener el mensaje de diferentes formatos
    if (e.error?.error) msg = e.error.error;
    else if (e.error?.detail) msg = e.error.detail;
    else if (e.error?.non_field_errors?.[0]) msg = e.error.non_field_errors[0];
    else if (typeof e.error === 'string') msg = e.error;
    else if (e.statusText) msg = e.statusText;
    
    // Si hay errores de campos específicos, mostrarlos
    let detalles = '';
    if (e.error && typeof e.error === 'object') {
      const campos = Object.keys(e.error)
        .filter(k => k !== 'error' && k !== 'detail' && k !== 'non_field_errors')
        .map(k => {
          const valor = e.error[k];
          const txtError = Array.isArray(valor) ? valor[0] : valor;
          return `<strong>${k}:</strong> ${txtError}`;
        });
      if (campos.length > 0) {
        detalles = '<div class="text-left text-sm mt-2 space-y-1">' + campos.join('<br/>') + '</div>';
      }
    }
    
    Swal.fire({
      title: '❌ Error',
      html: msg + detalles,
      icon: 'error',
      confirmButtonColor: '#d33'
    });
  }

  private confirmDelete(id: number, deleteFn: (id: number) => any, entityName: string) {
    Swal.fire({
      title: `¿Eliminar ${entityName}?`,
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteFn(id).subscribe({
          next: () => {
            this.finishSave('Registro eliminado');
          },
          error: (e: any) => this.handleError(e)
        });
      }
    });
  }

  getEstiloArea(nombre: string): { color: string, icono: string } {
    const n = (nombre || '').toLowerCase();
    if (n.includes('admin') || n.includes('gerencia')) return { color: 'bg-blue-500', icono: 'bi-building' };
    if (n.includes('comercial') || n.includes('venta')) return { color: 'bg-green-500', icono: 'bi-graph-up-arrow' };
    if (n.includes('tecno') || n.includes('sist')) return { color: 'bg-purple-500', icono: 'bi-laptop' };
    if (n.includes('opera') || n.includes('logis')) return { color: 'bg-orange-500', icono: 'bi-gear' };
    if (n.includes('human') || n.includes('rrhh')) return { color: 'bg-pink-500', icono: 'bi-people' };
    return { color: 'bg-gray-500', icono: 'bi-layers' };
  }

  getNombreArea(areaId: any): string {
    if (!areaId) return '---';
    const id = typeof areaId === 'object' ? areaId.id : areaId;
    const a = this.areas.find(x => x.id === id);
    return a ? a.nombre : '---';
  }

  getNombreSucursal(sucursalId: any): string {
    if (!sucursalId) return '---';
    const id = typeof sucursalId === 'object' ? sucursalId.id : sucursalId;
    const s = this.sucursales.find(x => x.id === id);
    return s ? s.nombre : '---';
  }

  getDiasStr(dias: string[]): string {
    if (!dias || dias.length === 0) return 'Sin asignar';
    return dias.join(', ');
  }
}