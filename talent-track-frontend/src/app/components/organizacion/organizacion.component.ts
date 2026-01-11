import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray, FormControl } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './organizacion.component.html',
  styleUrls: ['./organizacion.component.css']
})
export class OrganizacionComponent implements OnInit {
  
  // --- 1. ESTADO Y CONTROL ---
  isSuperAdmin = false;
  empresaId: number | null = null;
  loading = true;
  activeTab: 'AREAS' | 'TURNOS' | 'ESTRUCTURA' | 'PUESTOS' | 'EMPRESAS' = 'EMPRESAS'; // Agregué EMPRESAS por defecto si es Admin

  // Modales
  showModalEmpresa = false;
  empresaSeleccionadaId: number | null = null; 

  // Modales de Configuración Interna
  showAreaForm = false;
  showSucursalForm = false;
  showDeptoForm = false;
  showPuestoModal = false;
  showTurnoModal = false;

  // --- 2. DATOS ---
  empresas: any[] = [];
  areas: any[] = [];
  sucursales: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  diasSemana = [
    { id: 0, nombre: 'Lunes' }, { id: 1, nombre: 'Martes' }, { id: 2, nombre: 'Miércoles' },
    { id: 3, nombre: 'Jueves' }, { id: 4, nombre: 'Viernes' }, { id: 5, nombre: 'Sábado' }, { id: 6, nombre: 'Domingo' }
  ];

  // --- 3. FORMULARIOS ---
  formEmpresa: FormGroup; // Unificado (antes tenías empresaForm y formEmpresa)
  areaForm: FormGroup;
  sucursalForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;
  turnoForm: FormGroup;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {
    // A. Formulario de Empresas (SaaS)
    this.formEmpresa = this.fb.group({
      nombre: ['', Validators.required], // Cambiado a 'nombre' para coincidir con tu HTML anterior
      direccion: [''],
      telefono: [''],
      razon_social: ['', Validators.required],
      ruc: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(13)]],
      admin_nombre: [''],
      admin_email: [''],
      admin_password: ['']
    });

    // B. Formularios de Estructura Organizacional
    this.areaForm = this.fb.group({ nombre: ['', Validators.required], descripcion: [''], empresa: [null] });
    this.sucursalForm = this.fb.group({ nombre: ['', Validators.required], direccion: ['', Validators.required], telefono: [''], empresa: [null] });
    this.deptoForm = this.fb.group({ nombre: ['', Validators.required], sucursal: [null, Validators.required], area: [null, Validators.required], empresa: [null] });
    this.puestoForm = this.fb.group({ nombre: ['', Validators.required], es_supervisor: [false], area: [null], salario_minimo: [460], salario_maximo: [1000], empresa: [null] });

    // C. Formulario de Turnos
    this.turnoForm = this.fb.group({
      nombre: ['', Validators.required],
      tipo_jornada: ['RIGIDO', Validators.required],
      hora_entrada: ['09:00'], 
      hora_salida: ['18:00'],
      min_tolerancia: [10],
      horas_semanales_meta: [40],
      dias_seleccionados: this.fb.array([], Validators.required),
      empresa: [null]
    });
    this.initDiasLaborables();
  }

  ngOnInit() {
    this.isSuperAdmin = this.auth.isSuperAdmin();
    this.empresaId = this.auth.getEmpresaId();

    // Si es SuperAdmin, por defecto mostramos la gestión de empresas
    if (this.isSuperAdmin) {
        this.activeTab = 'EMPRESAS';
        this.cargarEmpresas();
    } else {
        // Si es un cliente normal, va directo a su estructura
        this.activeTab = 'ESTRUCTURA';
        this.cargarDatosEstructura();
    }
  }

  // --- LÓGICA DE SUPER ADMIN (GESTIÓN EMPRESAS) ---

  cargarEmpresas() {
    this.loading = true;
    this.api.getEmpresas().subscribe((res: any) => {
      this.empresas = res.results || res;
      this.loading = false;
    });
  }

  abrirModalEmpresa(modoCliente: boolean) {
    this.esModoCliente = modoCliente;
    this.empresaSeleccionadaId = null;
    this.showModalEmpresa = true;
    this.formEmpresa.reset();
  this.configurarValidadores(modoCliente);
    const emailControl = this.formEmpresa.get('admin_email');
    const passControl = this.formEmpresa.get('admin_password');
    const nombreControl = this.formEmpresa.get('admin_nombre');

    if (this.esModoCliente) {
      // Validaciones para CLIENTE (requiere crear usuario)
      emailControl?.setValidators([Validators.required, Validators.email]);
      passControl?.setValidators([Validators.required, Validators.minLength(6)]);
      nombreControl?.setValidators([Validators.required]);
    } else {
      // Validaciones para MI EMPRESA (se vincula a mi usuario actual)
      emailControl?.clearValidators();
      passControl?.clearValidators();
      nombreControl?.clearValidators();
    }
    
    emailControl?.updateValueAndValidity();
    passControl?.updateValueAndValidity();
    nombreControl?.updateValueAndValidity();
  }

  guardarEmpresa() {
    if (this.formEmpresa.invalid) return;

    this.api.createEmpresa(this.formEmpresa.value).subscribe({
      next: (res) => {
        const tipo = this.esModoCliente ? 'Cliente' : 'Propia';
        alert(`✅ Empresa ${tipo} "${res.nombre}" creada exitosamente.`);
        
        this.showModalEmpresa = false;
        this.cargarEmpresas();

        // Si creé mi propia empresa, recargo para actualizar mi perfil
        if (!this.esModoCliente) {
             window.location.reload(); 
        }
      },
      error: (e) => {
        const msg = e.error?.error || e.message || 'Error al guardar';
        alert('⛔ Error: ' + msg);
      }
    });
  }
  eliminarEmpresa(empresa: any) {
    if (!confirm(`¿Estás seguro de ELIMINAR la empresa "${empresa.nombre}"?\nEsta acción borrará sus sucursales y empleados.`)) {
        return;
    }

    this.api.deleteEmpresa(empresa.id).subscribe({
        next: () => {
            alert('🗑️ Empresa eliminada.');
            this.cargarEmpresas();
            // Si borré mi propia empresa, recargo para evitar inconsistencias
            if (this.esMiEmpresa(empresa.id)) window.location.reload();
        },
        error: (e) => alert('Error al eliminar: ' + e.message)
    });
  }

  // AUXILIAR (Para no repetir código en abrir y editar)
  configurarValidadores(esCliente: boolean) {
    const emailControl = this.formEmpresa.get('admin_email');
    const passControl = this.formEmpresa.get('admin_password');
    const nombreControl = this.formEmpresa.get('admin_nombre');

    if (esCliente) {
      emailControl?.setValidators([Validators.required, Validators.email]);
      passControl?.setValidators([Validators.required, Validators.minLength(6)]);
      nombreControl?.setValidators([Validators.required]);
    } else {
      emailControl?.clearValidators();
      passControl?.clearValidators();
      nombreControl?.clearValidators();
    }
    emailControl?.updateValueAndValidity();
    passControl?.updateValueAndValidity();
    nombreControl?.updateValueAndValidity();
  }

  esMiEmpresa(empresaId: number): boolean {
    const user = this.auth.getUser();
    if (!user || !user.empresa) return false;
    const miEmpresaId = user.empresa.id || user.empresa; 
    return miEmpresaId == empresaId;

  }
  // --- LÓGICA DE CLIENTE (ESTRUCTURA ORGANIZACIONAL) ---
editarEmpresa(empresa: any) {
    this.empresaSeleccionadaId = empresa.id;
    this.esModoCliente = !this.esMiEmpresa(empresa.id); // Detecta si es cliente o propia
    this.showModalEmpresa = true;

    // Llenamos el formulario con los datos existentes
    this.formEmpresa.patchValue({
        nombre: empresa.nombre,
        razon_social: empresa.razon_social,
        ruc: empresa.ruc,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        // No llenamos password/email admin al editar para no sobreescribir
    });

    this.configurarValidadores(this.esModoCliente);
    
    // Al editar, el password no es obligatorio (si lo dejan vacío, no se cambia)
    this.formEmpresa.get('admin_password')?.clearValidators();
    this.formEmpresa.get('admin_password')?.updateValueAndValidity();
    this.formEmpresa.get('admin_email')?.clearValidators(); // El email usualmente no se edita aquí
    this.formEmpresa.get('admin_email')?.updateValueAndValidity();
  }
  cargarDatosEstructura() {
    if (!this.empresaId) return;
    this.loading = true;

    forkJoin({
        areas: this.api.getAreas(this.empresaId),
        sucursales: this.api.getSucursales(this.empresaId),
        departamentos: this.api.getDepartamentos(), // Backend ya debe filtrar por usuario/empresa
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
        error: (e) => { 
            console.error(e); 
            this.loading = false; 
        }
    });
  }

  // --- GESTIÓN DE TURNOS (DÍAS) ---

  initDiasLaborables() {
    const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
    checkArray.clear();
    // Por defecto Lunes(0) a Viernes(4)
    [0, 1, 2, 3, 4].forEach(dia => checkArray.push(new FormControl(dia)));
  }

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

  isDiaChecked(diaId: number): boolean {
    const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
    return checkArray.value.includes(diaId);
  }

  getDiasStr(dias: number[]) {
    if (!dias || dias.length === 0) return 'Sin días';
    if (dias.length === 5 && dias.includes(0) && dias.includes(4)) return 'L-V';
    const names = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    return dias.map(d => names[d]).join(', ');
  }

  // --- CRUD FUNCTIONS (MODALES INTERNOS) ---

  guardarTurno() {
    if (this.turnoForm.invalid) return;
    
    const fValue = this.turnoForm.value;
    const payload: any = {
        nombre: fValue.nombre,
        tipo_jornada: fValue.tipo_jornada,
        dias_laborables: fValue.dias_seleccionados,
        empresa: this.empresaId
    };

    if (fValue.tipo_jornada === 'RIGIDO') {
        payload.hora_entrada = fValue.hora_entrada;
        payload.hora_salida = fValue.hora_salida;
        payload.min_tolerancia = fValue.min_tolerancia;
    } else {
        payload.horas_semanales_meta = fValue.horas_semanales_meta;
        // Limpiamos datos de rígido
        payload.hora_entrada = null;
        payload.hora_salida = null;
    }

    this.api.saveTurno(payload).subscribe(() => {
        this.cargarDatosEstructura();
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
      this.cargarDatosEstructura(); this.showAreaForm = false; this.areaForm.reset();
    });
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    this.api.saveSucursal({ ...this.sucursalForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatosEstructura(); this.showSucursalForm = false; this.sucursalForm.reset();
    });
  }

  guardarDepto() {
    if (this.deptoForm.invalid) return;
    this.api.saveDepartamento({ ...this.deptoForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatosEstructura(); this.showDeptoForm = false; this.deptoForm.reset();
    });
  }

  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    this.api.savePuesto({ ...this.puestoForm.value, empresa: this.empresaId }).subscribe(() => {
      this.cargarDatosEstructura(); this.showPuestoModal = false; this.puestoForm.reset({es_supervisor: false, salario_minimo: 460});
    });
  }

  // Helpers de UI
  abrirModalDepto(sucursalId: number) { 
      this.showDeptoForm = true; 
      this.deptoForm.patchValue({ sucursal: sucursalId }); 
  }
  
  getDeptosBySucursal(sucId: number) { 
      return this.departamentos.filter(d => d.sucursal === sucId); 
  }
  
  getNombreArea(areaId: number) { 
      return this.areas.find(a => a.id === areaId)?.nombre || '---'; 
  }
}