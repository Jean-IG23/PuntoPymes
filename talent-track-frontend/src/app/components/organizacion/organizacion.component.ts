import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray, FormControl } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './organizacion.component.html',
  styleUrls: ['./organizacion.component.css']
})
export class OrganizacionComponent implements OnInit {
  
  // --- CONTROL DE VISTA Y ROLES ---
  isSuperAdmin = false;
  empresaId: number | null = null;
  loading = false;
  activeTab: 'EMPRESAS' | 'ESTRUCTURA' = 'ESTRUCTURA';
  activeSubTab: string = 'SUCURSALES';

  // --- DATOS ---
  empresas: any[] = [];
  sucursales: any[] = [];
  areas: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  diasSemana = [
    { id: 0, nombre: 'Lunes' }, { id: 1, nombre: 'Martes' }, { id: 2, nombre: 'Miércoles' },
    { id: 3, nombre: 'Jueves' }, { id: 4, nombre: 'Viernes' }, { id: 5, nombre: 'Sábado' }, { id: 6, nombre: 'Domingo' }
  ];

  // --- FORMULARIOS ---
  formEmpresa: FormGroup;
  sucursalForm: FormGroup;
  areaForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;
  turnoForm: FormGroup;

  // --- CONTROL DE MODALES ---
  // ID seleccionado: null = Crear, Numero = Editar
  selectedId: number | null = null;

  showModalEmpresa = false;
  showModalSucursal = false;
  showModalArea = false;
  showModalDepto = false;
  showModalPuesto = false;
  showModalTurno = false;

  esModoCliente = false; // Para creación de empresa (si es cliente nuevo)
  logoSeleccionado: File | null = null;
  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // 1. Empresa (SaaS)
    this.formEmpresa = this.fb.group({
      nombre_comercial: ['', Validators.required],
      razon_social: ['', Validators.required],
      ruc: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(13)]],
      direccion: [''],
      telefono: [''],
      admin_nombre: [''],
      admin_email: [''],
      admin_password: ['']
    });

    // 2. Sucursal
    this.sucursalForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: [''],
      es_matriz: [false],
      empresa: [null]
    });

    // 3. Área
    this.areaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      sucursal: [null],
      empresa: [null]
    });

    // 4. Departamento
    this.deptoForm = this.fb.group({
      nombre: ['', Validators.required],
      area: [null, Validators.required], 
      empresa: [null]
    });

    // 5. Puesto
    this.puestoForm = this.fb.group({
      nombre: ['', Validators.required],
      es_supervision: [false],
      area: [null], // Relación opcional
      empresa: [null]
    });

    // 6. Turno
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

    if (this.isSuperAdmin) {
      this.activeTab = 'EMPRESAS';
      this.cargarEmpresas();
    } else {
      this.activeTab = 'ESTRUCTURA';
      this.cargarEstructura();
    }
  }

  onLogoSelect(event: any) {
    if (event.target.files.length > 0) {
      this.logoSeleccionado = event.target.files[0];
    }
  }

  // 4. REEMPLAZA TU FUNCIÓN guardarEmpresa POR ESTA
  guardarEmpresa() {
    if (this.formEmpresa.invalid) {
        this.formEmpresa.markAllAsTouched(); // Para que se vean los errores rojos
        return;
    }
    
    const data = this.formEmpresa.value;

    if (this.selectedId) {
      this.api.updateEmpresa(this.selectedId, data).subscribe(() => {
        this.cargarEmpresas(); 
        this.showModalEmpresa = false;
        this.logoSeleccionado = null;
      });
    } else {
      // AQUÍ ENVIAMOS EL LOGO AL SERVICIO
      this.api.createEmpresa(data, this.logoSeleccionado || undefined).subscribe({
        next: () => {
          this.cargarEmpresas(); 
          this.showModalEmpresa = false;
          this.logoSeleccionado = null;
          alert('Empresa creada correctamente');
        },
        error: (e) => alert('Error: ' + (e.error?.error || e.message))
      });
    }
  }

  // ==========================================
  // 1. GESTIÓN DE EMPRESAS (SUPERADMIN)
  // ==========================================
  cargarEmpresas() {
    this.loading = true;
    this.api.getEmpresas().pipe(finalize(() => this.loading = false))
      .subscribe(res => this.empresas = res.results || res);
  }

  abrirModalEmpresa(empresa: any = null) {
    this.showModalEmpresa = true;
    this.esModoCliente = false; // Reset

    if (empresa) {
      this.selectedId = empresa.id;
      this.formEmpresa.patchValue(empresa);
      // Al editar, quitamos validación de password/email admin
      this.formEmpresa.get('admin_email')?.clearValidators();
      this.formEmpresa.get('admin_password')?.clearValidators();
    } else {
      this.selectedId = null;
      this.formEmpresa.reset();
      this.esModoCliente = true; // Asumimos creación de cliente nuevo
      this.formEmpresa.get('admin_email')?.setValidators([Validators.required, Validators.email]);
      this.formEmpresa.get('admin_password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.formEmpresa.get('admin_email')?.updateValueAndValidity();
    this.formEmpresa.get('admin_password')?.updateValueAndValidity();
  }
  eliminarEmpresa(emp: any) {
    if (confirm(`¿Estás seguro de eliminar la empresa ${emp.nombre_comercial || emp.razon_social}?`)) {
      this.loading = true;
      this.api.deleteEmpresa(emp.id)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.cargarEmpresas();
            alert('Empresa eliminada correctamente.');
          },
          error: (e) => alert('Error al eliminar: ' + (e.error?.detail || e.message))
        });
    }
  }
  

  // ==========================================
  // 2. ESTRUCTURA ORGANIZACIONAL (CLIENTE)
  // ==========================================
  cargarEstructura() {
    if (!this.empresaId && !this.isSuperAdmin) return;
    this.loading = true;
    
    // Si soy SuperAdmin gestionando otra empresa, usaría un ID específico
    const targetId = this.empresaId; 

    forkJoin({
      sucursales: this.api.getSucursales(targetId || undefined),
      areas: this.api.getAreas(targetId || undefined),
      deptos: this.api.getDepartamentos(),
      puestos: this.api.getPuestos(undefined, targetId || undefined),
      turnos: this.api.getTurnos()
    }).pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe((res: any) => {
        this.sucursales = res.sucursales.results || res.sucursales;
        this.areas = res.areas.results || res.areas;
        this.departamentos = res.deptos.results || res.deptos;
        this.puestos = res.puestos.results || res.puestos;
        this.turnos = res.turnos.results || res.turnos;
      });
  }

  // --- SUCURSALES ---
  abrirModalSucursal(suc: any = null) {
    this.showModalSucursal = true;
    if (suc) { this.selectedId = suc.id; this.sucursalForm.patchValue(suc); }
    else { this.selectedId = null; this.sucursalForm.reset({es_matriz: false}); }
  }
  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    const data = { ...this.sucursalForm.value, empresa: this.empresaId };
    const req = this.selectedId ? this.api.updateSucursal(this.selectedId, data) : this.api.saveSucursal(data);
    req.subscribe(() => { this.cargarEstructura(); this.showModalSucursal = false; });
  }
  eliminarSucursal(suc: any) {
    if(confirm('¿Borrar sucursal?')) this.api.deleteSucursal(suc.id).subscribe(() => this.cargarEstructura());
  }

  // --- ÁREAS ---
  abrirModalArea(area: any = null) {
    this.showModalArea = true;
    if (area) { 
        this.selectedId = area.id; 
        this.areaForm.patchValue({
            nombre: area.nombre, 
            descripcion: area.descripcion,
            sucursal: area.sucursal?.id || area.sucursal // Mapeo seguro
        }); 
    }
    else { this.selectedId = null; this.areaForm.reset(); }
  }
  guardarArea() {
  console.log("Estado del Form:", this.areaForm.status); // Ver en consola F12
  console.log("Errores:", this.areaForm.get('nombre')?.errors);

  if (this.areaForm.invalid) {
    alert('⚠️ Formulario Inválido: Escribe un nombre para el área.');
    this.areaForm.markAllAsTouched(); // Pone el campo en rojo
    return;
  }

  const data = { ...this.areaForm.value, empresa: this.empresaId };
  const req = this.selectedId ? this.api.updateArea(this.selectedId, data) : this.api.saveArea(data);
  
  req.subscribe({
    next: () => {
      alert('✅ Área guardada'); 
      this.cargarEstructura(); 
      this.showModalArea = false;
      this.areaForm.reset();
    },
    error: (e) => alert('❌ Error servidor: ' + (e.error?.detail || e.message))
  });
}
  eliminarArea(area: any) {
    if(confirm('¿Borrar área?')) this.api.deleteArea(area.id).subscribe(() => this.cargarEstructura());
  }

  // --- DEPARTAMENTOS ---
  abrirModalDepto(dep: any = null) {
    this.showModalDepto = true;
    if (dep) { 
        this.selectedId = dep.id; 
        this.deptoForm.patchValue({
            nombre: dep.nombre,
            area: dep.area?.id || dep.area
        });
    }
    else { this.selectedId = null; this.deptoForm.reset(); }
  }
  guardarDepto() {
    if (this.deptoForm.invalid) return;
    // Buscamos la sucursal del área seleccionada para mantener consistencia, o dejamos que el backend lo resuelva
    const data = { ...this.deptoForm.value, empresa: this.empresaId };
    const req = this.selectedId ? this.api.updateDepartamento(this.selectedId, data) : this.api.saveDepartamento(data);
    req.subscribe(() => { this.cargarEstructura(); this.showModalDepto = false; });
  }
  eliminarDepto(dep: any) {
    if(confirm('¿Borrar departamento?')) this.api.deleteDepartamento(dep.id).subscribe(() => this.cargarEstructura());
  }

  // --- PUESTOS ---
  abrirModalPuesto(pto: any = null) {
    this.showModalPuesto = true;
    if (pto) {
        this.selectedId = pto.id;
        this.puestoForm.patchValue({
            nombre: pto.nombre,
            es_supervision: pto.es_supervision,
            area: pto.area?.id || pto.area
        });
    } else { this.selectedId = null; this.puestoForm.reset({es_supervision: false}); }
  }
  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    const data = { ...this.puestoForm.value, empresa: this.empresaId };
    const req = this.selectedId ? this.api.updatePuesto(this.selectedId, data) : this.api.savePuesto(data);
    req.subscribe(() => { this.cargarEstructura(); this.showModalPuesto = false; });
  }
  eliminarPuesto(pto: any) {
    if(confirm('¿Borrar puesto?')) this.api.deletePuesto(pto.id).subscribe(() => this.cargarEstructura());
  }

  // --- TURNOS ---
  abrirModalTurno(t: any = null) {
    this.showModalTurno = true;
    this.initDiasLaborables();
    if (t) {
        this.selectedId = t.id;
        this.turnoForm.patchValue({
            nombre: t.nombre,
            tipo_jornada: t.tipo_jornada,
            hora_entrada: t.hora_entrada,
            hora_salida: t.hora_salida,
            min_tolerancia: t.min_tolerancia,
            horas_semanales_meta: t.horas_semanales_meta
        });
        const checkArray: FormArray = this.turnoForm.get('dias_seleccionados') as FormArray;
        checkArray.clear();
        if (t.dias_laborables) t.dias_laborables.forEach((d: number) => checkArray.push(new FormControl(d)));
    } else {
        this.selectedId = null;
        this.turnoForm.reset({ tipo_jornada: 'RIGIDO', hora_entrada: '09:00', hora_salida: '18:00', min_tolerancia: 10, horas_semanales_meta: 40 });
        this.initDiasLaborables();
    }
  }
  guardarTurno() {
    if (this.turnoForm.invalid) return;
    const fVal = this.turnoForm.value;
    const data: any = { 
        nombre: fVal.nombre, tipo_jornada: fVal.tipo_jornada, dias_laborables: fVal.dias_seleccionados, empresa: this.empresaId 
    };
    if (fVal.tipo_jornada === 'RIGIDO') {
        data.hora_entrada = fVal.hora_entrada; data.hora_salida = fVal.hora_salida; data.min_tolerancia = fVal.min_tolerancia;
    } else {
        data.horas_semanales_meta = fVal.horas_semanales_meta;
    }
    const req = this.selectedId ? this.api.updateTurno(this.selectedId, data) : this.api.saveTurno(data);
    req.subscribe(() => { this.cargarEstructura(); this.showModalTurno = false; });
  }
  eliminarTurno(t: any) {
    if(confirm('¿Borrar turno?')) this.api.deleteTurno(t.id).subscribe(() => this.cargarEstructura());
  }

  // --- HELPERS TURNOS ---
  initDiasLaborables() {
    const arr = this.turnoForm.get('dias_seleccionados') as FormArray;
    arr.clear();
    [0, 1, 2, 3, 4].forEach(d => arr.push(new FormControl(d)));
  }
  onDiaChange(e: any, id: number) {
    const arr = this.turnoForm.get('dias_seleccionados') as FormArray;
    if (e.target.checked) arr.push(new FormControl(id));
    else { let i=0; arr.controls.forEach((c: any) => { if (c.value == id) arr.removeAt(i); i++; }); }
  }
  isDiaChecked(id: number) { return (this.turnoForm.get('dias_seleccionados') as FormArray).value.includes(id); }
  getDiasStr(dias: number[]) {
    if(!dias || dias.length === 0) return 'Ninguno';
    if(dias.length === 5 && dias.includes(0) && dias.includes(4)) return 'L-V';
    const n = ['L','M','X','J','V','S','D'];
    return dias.map(d => n[d]).join(', ');
  }

  getNombreSucursal(idOrObj: any) { 
      // Si viene null o undefined
      if (!idOrObj) return '---';
      
      // Si viene el objeto completo, devolvemos su nombre directo
      if (typeof idOrObj === 'object' && idOrObj.nombre) return idOrObj.nombre;

      // Si viene el ID (número), buscamos en el array
      const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
      return this.sucursales.find(s => s.id == id)?.nombre || '---'; 
  }

  getNombreArea(idOrObj: any) { 
      if (!idOrObj) return '---';
      if (typeof idOrObj === 'object' && idOrObj.nombre) return idOrObj.nombre;

      const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
      return this.areas.find(a => a.id == id)?.nombre || '---'; 
  }
}