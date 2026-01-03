import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <--- IMPORTANTE
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // <--- ReactiveFormsModule agregado
  templateUrl: './empleado-form.component.html',
  styleUrl: './empleado-form.component.css'
})
export class EmpleadoFormComponent implements OnInit {
  
  // Usamos FormGroup para control total
  empleadoForm!: FormGroup;

  // Listas Maestras
  empresas: any[] = [];
  allSucursales: any[] = [];
  allDepartamentos: any[] = []; 
  allPuestos: any[] = [];
  allTurnos: any[] = [];

  // Listas Filtradas
  filteredSucursales: any[] = [];
  filteredDepartamentos: any[] = [];
  filteredPuestos: any[] = [];
  filteredTurnos: any[] = [];

  // Variables de control
  isContextual: boolean = false;
  esCliente: boolean = false;

  constructor(
    private fb: FormBuilder, // <--- Necesario para crear el form
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private auth: AuthService
  ) {}
  
  ngOnInit() {
    this.inicializarFormulario();
    this.cargarDatosIniciales(); // <--- Ahora sí se llama correctamente
  }

  inicializarFormulario() {
    this.empleadoForm = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      documento: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      direccion: [''],
      foto_url: [''],
      
      // Selects obligatorios
      empresa: ['', Validators.required],
      sucursal: ['', Validators.required],
      departamento: ['', Validators.required],
      puesto: ['', Validators.required],
      turno: ['', Validators.required],
      
      crear_usuario_admin: [false]
    });
  }

  cargarDatosIniciales() {
    const miEmpresaId = this.auth.getEmpresaId();
    const esSuperAdmin = this.auth.isSuperAdmin();
    
    // Detectar si es cliente
    this.esCliente = (miEmpresaId && !esSuperAdmin) ? true : false;

    // 1. Cargar Empresas
    if (!this.esCliente) {
       this.api.getEmpresas().subscribe((res: any) => this.empresas = res.results || res);
    } else {
       // Si es cliente, fijar empresa y bloquear campo
       this.empleadoForm.patchValue({ empresa: miEmpresaId });
       this.empleadoForm.get('empresa')?.disable();
    }

    // 2. Cargar Catálogos Generales
    this.api.getSucursales().subscribe((res: any) => {
        this.allSucursales = res.results || res;
        // Si ya tenemos empresa fijada, filtramos de una vez
        if (this.esCliente) this.onSelectEmpresa(true);
    });

    this.api.getTurnos().subscribe((res: any) => {
        this.allTurnos = res.results || res;
    });

    this.api.getDepartamentos(undefined).subscribe(data => {
      this.allDepartamentos = data.results || data;
    });

    // 3. Cargar Puestos
    this.api.getPuestos(undefined, this.esCliente ? Number(miEmpresaId) : undefined).subscribe(data => {
      this.allPuestos = data.results || data;
      if (this.esCliente) this.filtrarPuestos();
    });

    // 4. Verificar Contexto (timeout para esperar carga de listas)
    setTimeout(() => {
        this.verificarContexto();
    }, 500);
  }

  // --- FILTROS (Adaptados a Reactive Forms) ---

  onSelectEmpresa(mantenerHijos = false) {
    const empresaId = Number(this.empleadoForm.get('empresa')?.value); // <--- Obtener valor del form
    
    if (!mantenerHijos) {
      this.empleadoForm.patchValue({
        sucursal: '',
        departamento: '',
        puesto: '',
        turno: ''
      });
    }

    this.filteredSucursales = this.allSucursales.filter(s => Number(s.empresa) === empresaId);
    this.filteredPuestos = this.allPuestos.filter(p => Number(p.empresa) === empresaId);
    this.filteredTurnos = this.allTurnos.filter(t => Number(t.empresa) === empresaId);
    
    if (!mantenerHijos) this.filteredDepartamentos = [];
    this.cd.detectChanges();
  }

  onSelectSucursal(mantenerHijos = false) {
    const sucursalId = Number(this.empleadoForm.get('sucursal')?.value);
    
    if (!mantenerHijos) this.empleadoForm.patchValue({ departamento: '' });

    this.filteredDepartamentos = this.allDepartamentos.filter(d => Number(d.sucursal) === sucursalId);
    this.cd.detectChanges();
  }

  onSelectDepartamento() {
    this.filtrarPuestos();
  }

  filtrarPuestos() {
    const deptoId = this.empleadoForm.get('departamento')?.value;
    const empresaId = this.empleadoForm.get('empresa')?.value;

    if (!empresaId) return;

    // Base: Puestos de la empresa
    let basePuestos = this.allPuestos.filter(p => Number(p.empresa) == Number(empresaId));

    if (!deptoId) {
        this.filteredPuestos = basePuestos.filter(p => !p.area);
    } else {
        const deptoSeleccionado = this.allDepartamentos.find(d => d.id == deptoId);
        
        if (deptoSeleccionado) {
            const areaId = deptoSeleccionado.area; 
            this.filteredPuestos = basePuestos.filter(p => p.area === null || p.area === areaId);
        } else {
            this.filteredPuestos = basePuestos;
        }
    }
  }

  // --- CONTEXTO ---

  verificarContexto() {
    const url = this.router.url;
    
    if (url.includes('/departamentos/')) {
      const partes = url.split('/');
      const indexDepto = partes.indexOf('departamentos');
      const deptoId = Number(partes[indexDepto + 1]);

      if (deptoId) {
        this.autoLlenarPorDepartamento(deptoId);
      }
    }
  }

  autoLlenarPorDepartamento(deptoId: number) {
    const depto = this.allDepartamentos.find(d => d.id === deptoId);
    if (!depto) return;

    // Llenamos datos automáticamente
    const sucursalId = depto.sucursal; 
    const suc = this.allSucursales.find(s => s.id === sucursalId);

    if (suc) {
      this.empleadoForm.patchValue({
          empresa: suc.empresa,
          sucursal: sucursalId,
          departamento: depto.id
      });
      
      this.onSelectEmpresa(true); // Refrescar listas
      this.onSelectSucursal(true); // Refrescar listas
      this.filtrarPuestos(); 
      
      // Bloquear campos para que no los cambie
      this.empleadoForm.get('empresa')?.disable();
      this.empleadoForm.get('sucursal')?.disable();
      this.empleadoForm.get('departamento')?.disable();

      this.isContextual = true; 
      this.cd.detectChanges();
    }
  }

  guardar() {
    if(this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched(); // Muestra los campos rojos
      alert("Faltan datos obligatorios. Revisa el formulario.");
      return;
    }

    // getRawValue() es IMPORTANTE para obtener el valor de 'empresa' aunque esté deshabilitado
    const datos = this.empleadoForm.getRawValue();

    this.api.saveEmpleado(datos).subscribe({
      next: () => {
        alert('✅ Empleado guardado correctamente!');
        if (this.isContextual) {
            this.router.navigate(['/departamentos', datos.departamento, 'empleados']);
        } else {
            this.router.navigate(['/empleados']);
        }
      },
      error: (err) => {
          console.error(err);
          alert('Error al guardar. Verifica cédula o email repetidos.');
      }
    });
  }
}