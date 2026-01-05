import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organizacion.component.html',
  styleUrl: './organizacion.component.css'
})
export class OrganizacionComponent implements OnInit {
  
  // Pestaña inicial: ÁREAS (La base de la pirámide lógica)
  activeTab: 'AREAS' | 'ESTRUCTURA' | 'PUESTOS' = 'AREAS'; 
  loading = true;

  // --- DATOS MAESTROS ---
  areas: any[] = [];
  sucursales: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];

  // --- FORMULARIOS ---
  areaForm: FormGroup;
  sucursalForm: FormGroup;
  deptoForm: FormGroup;
  puestoForm: FormGroup;

  // --- MODALES / UI ---
  showAreaForm = false;
  showSucursalForm = false;
  showDeptoForm = false;
  
  empresaId: number | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef
  ) {
    // 1. Formulario de ÁREA (Global)
    this.areaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      empresa: [null]
    });

    // 2. Formulario de SUCURSAL (Física)
    this.sucursalForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: [''],
      latitud: [-3.99313],
      longitud: [-79.20422],
      empresa: [null]
    });

    // 3. Formulario de DEPARTAMENTO (Intersección)
    this.deptoForm = this.fb.group({
      nombre: ['', Validators.required], // Ej: "Ventas Mostrador"
      sucursal: [null, Validators.required], // ID Sucursal
      area: [null, Validators.required],     // ID Área <--- VITAL PARA LA MATRIZ
      empresa: [null]
    });

    // 4. Formulario de PUESTO
    this.puestoForm = this.fb.group({
      nombre: ['', Validators.required],
      es_supervisor: [false],
      area: [null], // Puede ser null (Universal) o ID de Área
      salario_minimo: [460],
      salario_maximo: [1000],
      empresa: [null]
    });
  }

  ngOnInit() {
    this.empresaId = this.auth.getEmpresaId();
    if (this.empresaId) {
        this.cargarDatos();
    }
  }

  cargarDatos() {
    this.loading = true;
    
    // Carga paralela eficiente
    forkJoin({
      areas: this.api.getAreas(this.empresaId!), // Asegúrate que ApiService tenga getAreas
      sucursales: this.api.getSucursales(this.empresaId!),
      departamentos: this.api.getDepartamentos(), 
      puestos: this.api.getPuestos(undefined, this.empresaId!)
    }).subscribe({
      next: (res: any) => {
        this.areas = res.areas.results || res.areas;
        this.sucursales = res.sucursales.results || res.sucursales;
        this.departamentos = res.departamentos.results || res.departamentos;
        this.puestos = res.puestos.results || res.puestos;
        
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // --- HELPERS PARA VISTA ---
  getDeptosBySucursal(sucursalId: number) {
    return this.departamentos.filter(d => d.sucursal === sucursalId);
  }
  
  getNombreArea(areaId: number) {
      const area = this.areas.find(a => a.id === areaId);
      return area ? area.nombre : 'Sin Área';
  }

  // --- LÓGICA DE GUARDADO ---

  guardarArea() {
    if (this.areaForm.invalid) return;
    const data = { ...this.areaForm.value, empresa: this.empresaId };
    this.api.saveArea(data).subscribe(() => {
      this.cargarDatos();
      this.showAreaForm = false;
      this.areaForm.reset();
    });
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) return;
    const data = { ...this.sucursalForm.value, empresa: this.empresaId };
    this.api.saveSucursal(data).subscribe(() => {
      this.cargarDatos();
      this.showSucursalForm = false;
      this.sucursalForm.reset({ latitud: -3.99313, longitud: -79.20422 });
    });
  }

  // Al abrir el modal de depto, fijamos la sucursal pero pedimos el Área
  abrirModalDepto(sucursalId: number) {
    this.showDeptoForm = true;
    this.deptoForm.patchValue({ sucursal: sucursalId });
  }

  guardarDepto() {
    if (this.deptoForm.invalid) return;
    // El backend necesita saber la empresa también
    const data = { ...this.deptoForm.value, empresa: this.empresaId };
    this.api.saveDepartamento(data).subscribe(() => {
      this.cargarDatos();
      this.showDeptoForm = false;
      this.deptoForm.reset();
    });
  }

  guardarPuesto() {
    if (this.puestoForm.invalid) return;
    const data = { ...this.puestoForm.value, empresa: this.empresaId };
    this.api.savePuesto(data).subscribe(() => {
      this.cargarDatos();
      // No cerramos el form, solo limpiamos campos clave
      this.puestoForm.patchValue({ nombre: '', es_supervisor: false });
    });
  }
}