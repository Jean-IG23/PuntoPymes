import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-organizacion',
  templateUrl: './organizacion.component.html',
  
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class OrganizacionComponent implements OnInit {
  
  // --- ESTADO ---
  activeTab: string = 'ESTRUCTURA'; 
  activeSubTab: string = 'SUCURSALES';
  isSuperAdmin: boolean = false;
  loading: boolean = false;
  selectedId: number | null = null; // ID del elemento que se está editando

  // --- DATA ---
  empresas: any[] = [];
  sucursales: any[] = [];
  areas: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];
  empleadosList: any[] = []; 

  // --- FORMS ---
  formEmpresa: FormGroup;
  sucursalForm: FormGroup;
  areaForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;
  turnoForm: FormGroup;

  // --- MODALES ---
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
    private auth: AuthService
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
      nombre: ['', Validators.required],
      direccion: [''],
      es_matriz: [false],
      responsable: [null]
    });

    // 3. ÁREA
    this.areaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    // 4. DEPARTAMENTO
    this.deptoForm = this.fb.group({
      nombre: ['', Validators.required],
      area: [null, Validators.required],
      sucursal: [null, Validators.required]
    });

    // 5. PUESTO
    this.puestoForm = this.fb.group({
      nombre: ['', Validators.required],
      area: [null],
      es_supervision: [false]
    });

    // 6. TURNO
    this.turnoForm = this.fb.group({
      nombre: ['', Validators.required],
      tipo_jornada: ['RIGIDO'],
      hora_entrada: ['09:00'],
      hora_salida: ['18:00'],
      horas_semanales_meta: [40],
      dias_laborables: [[]] // Array de días
    });
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    if (!this.isSuperAdmin) {
      this.activeTab = 'ESTRUCTURA';
    }
    this.cargarTodo();
  }

  cargarTodo() {
    this.loading = true;
    if (this.isSuperAdmin) {
        this.api.getEmpresas().subscribe(res => this.empresas = res);
    }
    this.api.getSucursales().subscribe(res => this.sucursales = res);
    this.api.getAreas().subscribe(res => this.areas = res);
    this.api.getDepartamentos().subscribe(res => this.departamentos = res);
    this.api.getPuestos().subscribe(res => this.puestos = res);
    this.api.getTurnos().subscribe(res => this.turnos = res);
    
    this.api.getEmpleadosSimple().subscribe(res => {
      this.empleadosList = Array.isArray(res) ? res : res.results;
      this.loading = false;
    }, () => this.loading = false);
  }
  // ==========================================================
  // 🏢 GESTIÓN DE EMPRESAS
  // ==========================================================
  abrirModalEmpresa(emp: any = null) {
    this.selectedId = emp ? emp.id : null;
    if (emp) {
      this.formEmpresa.patchValue(emp);
      // Desactivar validación de password al editar
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
        this.showModalEmpresa = false;
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
      next: () => Swal.fire('Estado Actualizado', '', 'success'),
      error: () => {
        event.target.checked = !nuevoEstado; // Revertir si falla
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
      }
    });
  }

  // ==========================================================
  // 📍 GESTIÓN DE SUCURSALES
  // ==========================================================
  abrirModalSucursal(item: any = null) {
    this.selectedId = item ? item.id : null;
    if (item) {
      this.sucursalForm.patchValue(item);
    } else {
      this.sucursalForm.reset({ es_matriz: false });
    }
    this.showModalSucursal = true;
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updateSucursal(this.selectedId, this.sucursalForm.value)
      : this.api.createSucursal(this.sucursalForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Sucursal guardada');
        this.showModalSucursal = false;
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
        this.showModalArea = false;
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
        this.showModalDepto = false;
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
        this.showModalPuesto = false;
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
      Swal.fire('Atención', 'Verifica los campos obligatorios del turno', 'warning');
      return;
    }
    this.loading = true;
    const req = this.selectedId 
      ? this.api.updateTurno(this.selectedId, this.turnoForm.value)
      : this.api.createTurno(this.turnoForm.value);

    req.subscribe({
      next: () => {
        this.finishSave('Turno configurado');
        this.showModalTurno = false;
      },
      error: (e) => this.handleError(e)
    });
  }

  eliminarTurno(item: any) {
    this.confirmDelete(item.id, this.api.deleteTurno.bind(this.api), 'Turno');
  }

  // --- HELPERS PARA TURNOS (DÍAS) ---
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

  // --- HELPERS GENERALES ---
  private finishSave(msg: string) {
    this.loading = false;
    this.selectedId = null; // LIMPIEZA CRÍTICA
    this.cargarTodo();
    Swal.fire('¡Éxito!', msg, 'success');
  }

  private handleError(e: any) {
    this.loading = false;
    console.error(e);
    const msg = e.error?.error || e.error?.detail || 'Ocurrió un error en el servidor';
    Swal.fire('Error', msg, 'error');
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
            this.cargarTodo();
            Swal.fire('Eliminado', 'El registro ha sido borrado.', 'success');
          },
          error: (e: any) => this.handleError(e)
        });
      }
    });
  }

  getEstiloArea(nombre: string): { color: string, icono: string } {
    const n = (nombre || '').toLowerCase();
    if (n.includes('admin') || n.includes('gerencia')) return { color: 'bg-blue-500', icono: 'bi-building' };
    if (n.includes('comercial') || n.includes('venta') || n.includes('marketing')) return { color: 'bg-green-500', icono: 'bi-graph-up-arrow' };
    if (n.includes('tecno') || n.includes('sist') || n.includes('dev')) return { color: 'bg-purple-500', icono: 'bi-laptop' };
    if (n.includes('opera') || n.includes('logis') || n.includes('seguridad') || n.includes('bodega')) return { color: 'bg-orange-500', icono: 'bi-gear' };
    if (n.includes('legal')) return { color: 'bg-yellow-500', icono: 'bi-briefcase' };
    if (n.includes('human') || n.includes('rrhh') || n.includes('talento')) return { color: 'bg-pink-500', icono: 'bi-people' };
    return { color: 'bg-gray-500', icono: 'bi-layers' };
  }

  getNombreArea(areaId: any): string {
    if (!areaId) return '---';
    // Maneja si areaId es el objeto completo o solo el ID
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

  onLogoSelect(event: any) {
    // Implementar si usas subida de archivos real
    // const file = event.target.files[0];
    // this.formEmpresa.patchValue({ logo: file });
  }
}