import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 Importante para *ngIf, *ngFor, titlecase
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms'; // 👈 Importante para formularios
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2'; // 👈 Importación correcta

@Component({
  selector: 'app-organizacion',
  templateUrl: './organizacion.component.html',
  standalone: true, // 👈 ESTO ARREGLA LOS ERRORES NG8xxx
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule
  ] 
})
export class OrganizacionComponent implements OnInit {
  
  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'ESTRUCTURA'; 
  activeSubTab: string = 'SUCURSALES';
  isSuperAdmin: boolean = false;
  loading: boolean = false;

  // --- DATOS ---
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

  selectedId: number | null = null;

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
    this.formEmpresa = this.fb.group({
      nombre_comercial: ['', Validators.required],
      razon_social: ['', Validators.required],
      ruc: ['', [Validators.required, Validators.minLength(10)]],
      admin_email: [''],
      admin_password: ['']
    });

    this.sucursalForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: [''],
      es_matriz: [false],
      responsable: [null]
    });

    this.areaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    this.deptoForm = this.fb.group({
      nombre: ['', Validators.required],
      area: [null, Validators.required],
      sucursal: [null, Validators.required]
    });

    this.puestoForm = this.fb.group({
      nombre: ['', Validators.required],
      area: [null],
      es_supervision: [false]
    });

    this.turnoForm = this.fb.group({
      nombre: ['', Validators.required],
      tipo_jornada: ['RIGIDO'],
      hora_entrada: ['09:00'],
      hora_salida: ['18:00'],
      horas_semanales_meta: [40],
      dias_laborables: [[]]
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

  // --- GESTIÓN DE EMPRESAS ---
  abrirModalEmpresa(emp: any = null) {
    this.selectedId = emp ? emp.id : null;
    if (emp) {
      this.formEmpresa.patchValue(emp);
    } else {
      this.formEmpresa.reset();
    }
    this.showModalEmpresa = true;
  }

  guardarEmpresa() {
    if (this.formEmpresa.invalid) return;
    const data = this.formEmpresa.value;
    if (this.selectedId) {
      this.api.updateEmpresa(this.selectedId, data).subscribe(() => {
        this.cargarTodo();
        this.showModalEmpresa = false;
        Swal.fire('Éxito', 'Empresa actualizada', 'success');
      });
    } else {
      this.api.createEmpresa(data).subscribe(() => {
        this.cargarTodo();
        this.showModalEmpresa = false;
        Swal.fire('Éxito', 'Empresa creada', 'success');
      });
    }
  }

  cambiarEstadoEmpresa(emp: any, event: any) {
    const nuevoEstado = event.target.checked;
    this.api.updateEmpresa(emp.id, { estado: nuevoEstado }).subscribe(() => {
      emp.estado = nuevoEstado;
    });
  }

  eliminarEmpresa(emp: any) { /* Pendiente */ }
  onLogoSelect(event: any) { /* Pendiente */ }

  // --- GESTIÓN DE SUCURSALES ---
  abrirModalSucursal(item: any = null) {
    this.selectedId = item ? item.id : null;
    if (item) {
      this.sucursalForm.patchValue({
        nombre: item.nombre,
        direccion: item.direccion,
        es_matriz: item.es_matriz,
        responsable: item.responsable
      });
    } else {
      this.sucursalForm.reset({ es_matriz: false });
    }
    this.showModalSucursal = true;
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    const data = this.sucursalForm.value;
    const req = this.selectedId 
      ? this.api.updateSucursal(this.selectedId, data)
      : this.api.createSucursal(data);

    req.subscribe(() => {
      this.cargarTodo();
      this.showModalSucursal = false;
      Swal.fire('Guardado', 'Sucursal procesada correctamente', 'success');
    });
  }

  eliminarSucursal(item: any) {
    Swal.fire({
      title: '¿Eliminar?',
      text: "Se borrarán los departamentos asociados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.deleteSucursal(item.id).subscribe(() => {
          this.cargarTodo();
          Swal.fire('Borrado', '', 'success');
        });
      }
    });
  }

  // --- GESTIÓN DE ÁREAS ---
  abrirModalArea(item: any = null) {
    this.selectedId = item ? item.id : null;
    item ? this.areaForm.patchValue(item) : this.areaForm.reset();
    this.showModalArea = true;
  }

  guardarArea() {
    if (this.areaForm.invalid) return;
    const req = this.selectedId 
      ? this.api.updateArea(this.selectedId, this.areaForm.value)
      : this.api.createArea(this.areaForm.value);

    req.subscribe(() => {
      this.cargarTodo();
      this.showModalArea = false;
    });
  }

  eliminarArea(item: any) {
    if(confirm('¿Borrar Área?')) {
        this.api.deleteArea(item.id).subscribe(() => this.cargarTodo());
    }
  }

  // --- GESTIÓN DE DEPARTAMENTOS ---
  abrirModalDepto(item: any = null) {
    this.selectedId = item ? item.id : null;
    item ? this.deptoForm.patchValue(item) : this.deptoForm.reset();
    this.showModalDepto = true;
  }

  guardarDepto() {
    if (this.deptoForm.invalid) return;
    const req = this.selectedId 
      ? this.api.updateDepartamento(this.selectedId, this.deptoForm.value)
      : this.api.createDepartamento(this.deptoForm.value);

    req.subscribe(() => {
      this.cargarTodo();
      this.showModalDepto = false;
    });
  }

  eliminarDepto(item: any) {
    if(confirm('¿Borrar Departamento?')) {
        this.api.deleteDepartamento(item.id).subscribe(() => this.cargarTodo());
    }
  }

  // --- GESTIÓN DE PUESTOS ---
  abrirModalPuesto(item: any = null) {
    this.selectedId = item ? item.id : null;
    item ? this.puestoForm.patchValue(item) : this.puestoForm.reset();
    this.showModalPuesto = true;
  }

  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    const req = this.selectedId 
      ? this.api.updatePuesto(this.selectedId, this.puestoForm.value)
      : this.api.createPuesto(this.puestoForm.value);

    req.subscribe(() => {
      this.cargarTodo();
      this.showModalPuesto = false;
    });
  }

  eliminarPuesto(item: any) {
    if(confirm('¿Borrar Cargo?')) {
        this.api.deletePuesto(item.id).subscribe(() => this.cargarTodo());
    }
  }

  // --- GESTIÓN DE TURNOS ---
  abrirModalTurno(item: any = null) {
    this.selectedId = item ? item.id : null;
    if (item) {
      this.turnoForm.patchValue({
        nombre: item.nombre,
        tipo_jornada: item.tipo_jornada,
        hora_entrada: item.hora_entrada,
        hora_salida: item.hora_salida,
        horas_semanales_meta: item.horas_semanales_meta,
        dias_laborables: item.dias_laborables
      });
    } else {
      this.turnoForm.reset({ 
        tipo_jornada: 'RIGIDO', 
        hora_entrada: '09:00', 
        hora_salida: '18:00',
        dias_laborables: [] 
      });
    }
    this.showModalTurno = true;
  }

  guardarTurno() {
    if (this.turnoForm.invalid) return;
    const req = this.selectedId 
      ? this.api.updateTurno(this.selectedId, this.turnoForm.value)
      : this.api.createTurno(this.turnoForm.value);

    req.subscribe(() => {
      this.cargarTodo();
      this.showModalTurno = false;
    });
  }

  eliminarTurno(item: any) {
    if(confirm('¿Borrar Turno?')) {
        this.api.deleteTurno(item.id).subscribe(() => this.cargarTodo());
    }
  }

  // --- HELPERS ---
  isDiaChecked(diaId: string): boolean {
    const dias = this.turnoForm.get('dias_laborables')?.value || [];
    return dias.includes(diaId);
  }

  onDiaChange(event: any, diaId: string) {
    const checked = event.target.checked;
    const current = this.turnoForm.get('dias_laborables')?.value || [];
    
    if (checked) {
      this.turnoForm.patchValue({ dias_laborables: [...current, diaId] });
    } else {
      this.turnoForm.patchValue({ dias_laborables: current.filter((d: string) => d !== diaId) });
    }
  }

  getNombreArea(areaId: any): string {
    const a = this.areas.find(x => x.id === areaId || x.id === areaId?.id);
    return a ? a.nombre : '---';
  }

  getNombreSucursal(sucursalId: any): string {
    const s = this.sucursales.find(x => x.id === sucursalId || x.id === sucursalId?.id);
    return s ? s.nombre : '---';
  }

  getDiasStr(dias: string[]): string {
    if (!dias || dias.length === 0) return 'Sin asignar';
    return dias.join(', ');
  }
}