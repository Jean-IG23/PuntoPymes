import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './empleado-form.component.html',
  styleUrl: './empleado-form.component.css'
})
export class EmpleadoFormComponent implements OnInit {
  
  empleadoForm!: FormGroup;
  
  // Listas
  empresas: any[] = [];
  allSucursales: any[] = [];
  allDepartamentos: any[] = []; 
  allPuestos: any[] = [];
  allTurnos: any[] = [];

  // Filtradas
  filteredSucursales: any[] = [];
  filteredDepartamentos: any[] = [];
  filteredPuestos: any[] = [];
  filteredTurnos: any[] = [];

  // Estado
  isContextual: boolean = false;
  esCliente: boolean = false;
  esEdicion: boolean = false; // <--- Nuevo
  empleadoId: number | null = null; // <--- Nuevo

  constructor(
    private fb: FormBuilder,
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private auth: AuthService
  ) {}
  
  ngOnInit() {
    this.inicializarFormulario();
    this.cargarDatosIniciales(); 
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
      
      empresa: ['', Validators.required],
      sucursal: ['', Validators.required],
      departamento: ['', Validators.required],
      puesto: ['', Validators.required],
      turno: ['', Validators.required],
      
      salario_base: [460], // Agregado campo faltante en TS
      estado: ['ACTIVO'],  // Agregado
      crear_usuario_admin: [false]
    });
  }

  cargarDatosIniciales() {
    const miEmpresaId = this.auth.getEmpresaId();
    this.esCliente = (miEmpresaId && !this.auth.isSuperAdmin()) ? true : false;

    // 1. Preparamos todas las peticiones en paralelo
    const peticiones: any = {
        sucursales: this.api.getSucursales(),
        turnos: this.api.getTurnos(),
        departamentos: this.api.getDepartamentos(),
        // Si es cliente, filtramos puestos de una vez, si no, traemos todos
        puestos: this.api.getPuestos(undefined, this.esCliente ? Number(miEmpresaId) : undefined)
    };

    if (!this.esCliente) {
        peticiones.empresas = this.api.getEmpresas();
    }

    // 2. Ejecutamos todo junto (Adiós setTimeout)
    forkJoin(peticiones).subscribe((res: any) => {
        // Asignamos resultados
        this.allSucursales = res.sucursales.results || res.sucursales;
        this.allTurnos = res.turnos.results || res.turnos;
        this.allDepartamentos = res.departamentos.results || res.departamentos;
        this.allPuestos = res.puestos.results || res.puestos;
        
        if (res.empresas) {
            this.empresas = res.empresas.results || res.empresas;
        }

        // 3. Configuración Inicial
        if (this.esCliente) {
            this.empleadoForm.patchValue({ empresa: miEmpresaId });
            this.empleadoForm.get('empresa')?.disable();
            this.onSelectEmpresa(true); // Filtrar listas iniciales
        }

        // 4. VERIFICAR: ¿Edición o Creación Contextual?
        this.verificarRuta();
    });
  }

  verificarRuta() {
    this.route.params.subscribe(params => {
        // CASO A: EDICIÓN (/empleados/editar/5)
        if (params['id']) {
            this.esEdicion = true;
            this.empleadoId = params['id'];
            this.cargarEmpleadoParaEditar(this.empleadoId!);
        } 
        // CASO B: CREACIÓN CONTEXTUAL (/departamentos/5/empleados/nuevo)
        else {
             this.verificarContextoURL();
        }
    });
  }

  cargarEmpleadoParaEditar(id: number) {
      this.api.getEmpleados().subscribe((res: any) => {
          const lista = res.results || res;
          const emp = lista.find((e: any) => e.id == id);
          if (emp) {
            // Llenamos datos básicos
            this.empleadoForm.patchValue(emp);
            
            // Lógica crítica: IDs vs Objetos
            // Si el backend devuelve objeto {id:1, nombre: 'A'}, extraemos ID
            const empId = (typeof emp.empresa === 'object') ? emp.empresa.id : emp.empresa;
            const sucId = (typeof emp.sucursal === 'object') ? emp.sucursal.id : emp.sucursal;
            const depId = (typeof emp.departamento === 'object') ? emp.departamento.id : emp.departamento;
            const ptoId = (typeof emp.puesto === 'object') ? emp.puesto.id : emp.puesto;
            const trnId = (typeof emp.turno === 'object') ? emp.turno.id : emp.turno;

            // Disparamos las cascadas manualmente en orden
            this.empleadoForm.patchValue({ empresa: empId });
            this.onSelectEmpresa(true); // Filtra sucursales

            this.empleadoForm.patchValue({ sucursal: sucId });
            this.onSelectSucursal(true); // Filtra deptos

            this.empleadoForm.patchValue({ 
                departamento: depId,
                puesto: ptoId,
                turno: trnId
            });
            this.filtrarPuestos(); // Filtra puestos por área
            this.cd.detectChanges();
          }
      });
  }

  // ... (Tus métodos onSelectEmpresa, onSelectSucursal, filtrarPuestos quedan IGUAL) ...
  // ... (Copia y pega los métodos que ya tenías bien hechos aquí abajo) ...

  onSelectEmpresa(mantenerHijos = false) {
    const empresaId = Number(this.empleadoForm.get('empresa')?.value);
    
    if (!mantenerHijos) {
      this.empleadoForm.patchValue({
        sucursal: '', departamento: '', puesto: '', turno: ''
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

  onSelectDepartamento() { this.filtrarPuestos(); }

  filtrarPuestos() {
    const deptoId = this.empleadoForm.get('departamento')?.value;
    const empresaId = this.empleadoForm.get('empresa')?.value || (this.esCliente ? this.auth.getEmpresaId() : null);

    if (!empresaId) return;
    let basePuestos = this.allPuestos.filter(p => Number(p.empresa) == Number(empresaId));

    if (!deptoId) {
        this.filteredPuestos = basePuestos; 
    } else {
        const deptoSeleccionado = this.allDepartamentos.find(d => d.id == deptoId);
        if (deptoSeleccionado) {
            const areaId = deptoSeleccionado.area; 
            this.filteredPuestos = basePuestos.filter(p => p.area === null || p.area === areaId);
        } else {
            this.filteredPuestos = basePuestos;
        }
    }
    this.cd.detectChanges();
  }

  verificarContextoURL() {
    const url = this.router.url;
    if (url.includes('/departamentos/')) {
      const partes = url.split('/');
      const indexDepto = partes.indexOf('departamentos');
      const deptoId = Number(partes[indexDepto + 1]);
      if (deptoId) this.autoLlenarPorDepartamento(deptoId);
    }
  }

  autoLlenarPorDepartamento(deptoId: number) {
    const depto = this.allDepartamentos.find(d => d.id === deptoId);
    if (!depto) return;

    const sucursalId = depto.sucursal; 
    const suc = this.allSucursales.find(s => s.id === sucursalId);

    if (suc) {
      this.empleadoForm.patchValue({
          empresa: suc.empresa,
          sucursal: sucursalId,
          departamento: depto.id
      });
      
      this.onSelectEmpresa(true); 
      this.onSelectSucursal(true); 
      this.filtrarPuestos(); 
      
      this.empleadoForm.get('empresa')?.disable();
      this.empleadoForm.get('sucursal')?.disable();
      this.empleadoForm.get('departamento')?.disable();

      this.isContextual = true; 
      this.cd.detectChanges();
    }
  }

  guardar() {
    if(this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      alert("Faltan datos obligatorios.");
      return;
    }

    const datos = this.empleadoForm.getRawValue();
    
    // DECISIÓN: EDITAR O CREAR
    let peticion;
    if (this.esEdicion && this.empleadoId) {
        peticion = this.api.updateEmpleado(this.empleadoId, datos);
    } else {
        peticion = this.api.saveEmpleado(datos);
    }

    peticion.subscribe({
      next: () => {
        alert(this.esEdicion ? 'Actualizado correctamente' : 'Creado correctamente');
        if (this.isContextual) {
            this.router.navigate(['/departamentos', datos.departamento, 'empleados']);
        } else {
            this.router.navigate(['/empleados']);
        }
      },
      error: (err) => {
          console.error(err);
          alert('Error al guardar. Verifica los datos.');
      }
    });
  }
}