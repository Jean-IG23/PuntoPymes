import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organizacion.component.html',
  styleUrls: ['./organizacion.component.css']
})
export class OrganizacionComponent implements OnInit {
  
  // Estado
  isSuperAdmin = false;
  empresaId: number | null = null;
  loading = true;
  activeTab: 'AREAS' | 'TURNOS' | 'ESTRUCTURA' | 'PUESTOS' = 'ESTRUCTURA';

  // Datos
  empresas: any[] = []; // Solo SuperAdmin
  areas: any[] = [];
  sucursales: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  // Formularios
  empresaForm: FormGroup;
  areaForm: FormGroup;
  sucursalForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;
  turnoForm: FormGroup;

  // Modales
  showModalEmpresa = false;
  showAreaForm = false;
  showSucursalForm = false;
  showDeptoForm = false;
  showPuestoModal = false;
  showTurnoModal = false;

  // Días de la semana para el formulario de turnos
  diasSemana = [
    { id: 0, nombre: 'Lunes' },
    { id: 1, nombre: 'Martes' },
    { id: 2, nombre: 'Miércoles' },
    { id: 3, nombre: 'Jueves' },
    { id: 4, nombre: 'Viernes' },
    { id: 5, nombre: 'Sábado' },
    { id: 6, nombre: 'Domingo' }
  ];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef
  ) {
    // 1. SuperAdmin
    this.empresaForm = this.fb.group({
      razon_social: ['', Validators.required],
      nombre_comercial: ['', Validators.required],
      ruc: ['', Validators.required],
      direccion: [''],
      admin_nombre: ['', Validators.required],
      admin_email: ['', [Validators.required, Validators.email]],
      admin_password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // 2. Cliente - Estructura
    this.areaForm = this.fb.group({ nombre: ['', Validators.required], descripcion: [''], empresa: [null] });
    this.sucursalForm = this.fb.group({ nombre: ['', Validators.required], direccion: ['', Validators.required], telefono: [''], empresa: [null] });
    this.deptoForm = this.fb.group({ nombre: ['', Validators.required], sucursal: [null, Validators.required], area: [null, Validators.required], empresa: [null] });
    this.puestoForm = this.fb.group({ nombre: ['', Validators.required], es_supervisor: [false], area: [null], salario_minimo: [460], salario_maximo: [1000], empresa: [null] });

    // 3. Cliente - Turnos (Híbrido)
    this.turnoForm = this.fb.group({
      nombre: ['', Validators.required],
      tipo_jornada: ['RIGIDO', Validators.required],
      // Rígido
      hora_entrada: ['09:00'], 
      hora_salida: ['18:00'],
      min_tolerancia: [10],
      // Flexible
      horas_semanales_meta: [40],
      // Días (Array de checkboxes)
      dias_seleccionados: this.fb.array([], Validators.required),
      empresa: [null]
    });
    // Inicializar días seleccionados (L-V por defecto)
    this.initDiasLaborables();
  }

  ngOnInit() {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    this.empresaId = this.auth.getEmpresaId();
    this.cargarDatos();
  }

  // Inicializa el FormArray de días con L-V marcados
  initDiasLaborables() {
    const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
    checkArray.clear();
    // Por defecto Lunes(0) a Viernes(4) marcados
    [0, 1, 2, 3, 4].forEach(dia => checkArray.push(new FormControl(dia)));
  }

  // Manejo de Checkboxes de Días
  onDiaChange(e: any, diaId: number) {
    const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
    if (e.target.checked) {
      checkArray.push(new FormControl(diaId));
    } else {
      let i = 0;
      checkArray.controls.forEach((item: any) => {
        if (item.value == diaId) {
          checkArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  // Helper para saber si un día está checkeado (para edición futura)
  isDiaChecked(diaId: number): boolean {
    const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
    return checkArray.value.includes(diaId);
  }

  cargarDatos() {
    this.loading = true;

    if (this.isSuperAdmin) {
      this.api.getEmpresas().subscribe({
        next: (res) => { this.empresas = res.results || res; this.loading = false; },
        error: () => this.loading = false
      });
    } else if (this.empresaId) {
      forkJoin({
        areas: this.api.getAreas(this.empresaId),
        sucursales: this.api.getSucursales(this.empresaId),
        departamentos: this.api.getDepartamentos(), // Backend filtra
        puestos: this.api.getPuestos(undefined, this.empresaId),
        turnos: this.api.getTurnos()
      }).subscribe({
        next: (res: any) => {
          this.areas = res.areas.results || res.areas;
          this.sucursales = res.sucursales.results || res.sucursales;
          this.departamentos = res.departamentos.results || res.departamentos;
          this.puestos = res.puestos.results || res.puestos;
          this.turnos = res.turnos.results || res.turnos;
          this.loading = false;
        },
        error: (e) => { console.error(e); this.loading = false; }
      });
    }
  }

  // --- CRUD FUNCTIONS ---

  guardarTurno() {
    if (this.turnoForm.invalid) return;
    
    const fValue = this.turnoForm.value;
    
    // Preparar payload
    const payload: any = {
        nombre: fValue.nombre,
        tipo_jornada: fValue.tipo_jornada,
        dias_laborables: fValue.dias_seleccionados, // Enviamos el array [0, 1, 4...]
        empresa: this.empresaId
    };

    if (fValue.tipo_jornada === 'RIGIDO') {
        payload.hora_entrada = fValue.hora_entrada;
        payload.hora_salida = fValue.hora_salida;
        payload.min_tolerancia = fValue.min_tolerancia;
    } else {
        payload.horas_semanales_meta = fValue.horas_semanales_meta;
        payload.hora_entrada = null;
        payload.hora_salida = null;
    }

    this.api.saveTurno(payload).subscribe(() => {
        this.cargarDatos();
        this.showTurnoModal = false;
        this.turnoForm.reset({ 
            tipo_jornada: 'RIGIDO', 
            hora_entrada: '09:00', 
            hora_salida: '18:00',
            min_tolerancia: 10,
            horas_semanales_meta: 40 
        });
        this.initDiasLaborables();
    });
  }

  guardarArea() {
    if (this.areaForm.invalid) return;
    this.api.saveArea({ ...this.areaForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatos(); this.showAreaForm = false; this.areaForm.reset();
    });
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    this.api.saveSucursal({ ...this.sucursalForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatos(); this.showSucursalForm = false; this.sucursalForm.reset();
    });
  }

  guardarDepto() {
    if (this.deptoForm.invalid) return;
    this.api.saveDepartamento({ ...this.deptoForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatos(); this.showDeptoForm = false; this.deptoForm.reset();
    });
  }

  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    this.api.savePuesto({ ...this.puestoForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatos(); this.showPuestoModal = false; this.puestoForm.reset({es_supervisor: false, salario_minimo: 460});
    });
  }
  
  // Helpers
  abrirModalDepto(sucursalId: number) { this.showDeptoForm = true; this.deptoForm.patchValue({ sucursal: sucursalId }); }
  getDeptosBySucursal(sucId: number) { return this.departamentos.filter(d => d.sucursal === sucId); }
  getNombreArea(areaId: number) { return this.areas.find(a => a.id === areaId)?.nombre || '---'; }
  guardarEmpresa() { /* Misma lógica de antes */ }

  // Helper para mostrar días en la tabla de turnos
  getDiasStr(dias: number[]) {
    if (!dias || dias.length === 0) return 'Sin días';
    if (dias.length === 5 && dias.includes(0) && dias.includes(4)) return 'Lunes a Viernes';
    // Mapeo simple
    const names = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    return dias.map(d => names[d]).join(', ');
  }
}