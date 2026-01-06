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
  styleUrls: ['./empleado-form.component.css']
})
export class EmpleadoFormComponent implements OnInit {
  
  empleadoForm!: FormGroup;
  
  // Estado
  isEditing: boolean = false;
  loading: boolean = false;
  empleadoId: number | null = null;
  titulo = 'Nuevo Colaborador';

  // Catálogos (Listas Maestras)
  sucursales: any[] = [];
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  // Listas Filtradas (Para los Selects del HTML)
  departamentosFiltrados: any[] = [];
  
  constructor(
    private fb: FormBuilder,
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // 1. Inicializar Formulario (¡CRUCIAL!)
    this.initForm();

    // 2. Cargar Catálogos
    this.cargarCatalogos();
    
    // 3. Verificar Ruta (Edición o Nuevo)
    this.verificarRuta();
  }

  // --- 1. CONFIGURACIÓN DEL FORMULARIO ---
  initForm() {
    this.empleadoForm = this.fb.group({
      // Datos Personales
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      documento: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      direccion: [''],
      
      // Datos Organizacionales
      sucursal: [null, Validators.required], // ID Sucursal
      departamento: [null, Validators.required], // ID Depto
      puesto: [null, Validators.required], // ID Puesto
      turno_asignado: [null, Validators.required], // ID Turno
      
      // Datos Contractuales
      fecha_ingreso: [new Date().toISOString().substring(0, 10), Validators.required],
      salario: [0], // Opcional
      rol: ['EMPLEADO', Validators.required],
      
      // Estado
      estado: ['ACTIVO']
    });
  }

  // --- 2. CARGA DE CATÁLOGOS ---
  cargarCatalogos() {
    this.loading = true;
    const empresaId = this.auth.getEmpresaId();

    forkJoin({
      sucursales: this.api.getSucursales(empresaId || undefined),
      deptos: this.api.getDepartamentos(empresaId || undefined),
      puestos: this.api.getPuestos(undefined, empresaId || undefined),
      turnos: this.api.getTurnos()
    }).subscribe({
      next: (res: any) => {
        // Manejo robusto (si viene .results o array directo)
        this.sucursales = res.sucursales.results || res.sucursales;
        this.departamentos = res.deptos.results || res.deptos;
        this.puestos = res.puestos.results || res.puestos;
        this.turnos = res.turnos.results || res.turnos;
        this.loading = false;
      },
      error: (e) => {
        console.error("Error cargando catálogos", e);
        this.loading = false;
      }
    });
  }

  // --- 3. LÓGICA DE RUTA Y EDICIÓN ---
  verificarRuta() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      
      // CASO A: EDICIÓN
      if (id) {
        this.isEditing = true;
        this.titulo = 'Editar Colaborador';
        this.empleadoId = Number(id);
        this.cargarEmpleado(this.empleadoId);
      } 
      // CASO B: CONTEXTUAL (Viene desde un departamento específico)
      else if (this.router.url.includes('/departamentos/')) {
         // Lógica opcional si quieres pre-llenar depto desde la URL
      }
    });
  }

  cargarEmpleado(id: number) {
    this.loading = true;
    this.api.getEmpleado(id).subscribe({
      next: (data: any) => {
        // CORRECCIÓN DE OBJETOS vs IDs
        // Si el backend devuelve { id: 1, nombre: 'Norte' }, extraemos el 1.
        const formValues = {
            ...data,
            sucursal: (typeof data.sucursal === 'object' && data.sucursal) ? data.sucursal.id : data.sucursal,
            departamento: (typeof data.departamento === 'object' && data.departamento) ? data.departamento.id : data.departamento,
            puesto: (typeof data.puesto === 'object' && data.puesto) ? data.puesto.id : data.puesto,
            turno_asignado: (typeof data.turno_asignado === 'object' && data.turno_asignado) ? data.turno_asignado.id : data.turno_asignado
        };

        this.empleadoForm.patchValue(formValues);
        
        // Disparamos el filtro manualmente para que el select de Deptos se llene
        this.onSucursalChange(); 
        
        // Volvemos a setear el departamento (porque onSucursalChange lo limpia)
        this.empleadoForm.patchValue({ departamento: formValues.departamento });
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // --- 4. LÓGICA DE INTERACCIÓN (CASCADA) ---
  
  // Cuando cambian la Sucursal -> Filtramos los Departamentos
  onSucursalChange() {
    const sucursalId = this.empleadoForm.get('sucursal')?.value;
    
    if (sucursalId) {
      this.departamentosFiltrados = this.departamentos.filter(d => {
         // Verificamos si d.sucursal es objeto o ID
         const dSucId = (typeof d.sucursal === 'object') ? d.sucursal.id : d.sucursal;
         return Number(dSucId) === Number(sucursalId);
      });
      // Limpiamos el depto seleccionado porque ya no es válido para la nueva sucursal
      this.empleadoForm.patchValue({ departamento: null });
    } else {
      this.departamentosFiltrados = [];
    }
  }

  // --- 5. GUARDAR ---
  guardar() {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const data = this.empleadoForm.value;
    
    // Si es nuevo, aseguramos inyectar la empresa ID del usuario actual
    if (!this.isEditing) {
      data.empresa = this.auth.getEmpresaId();
    }

    const request = this.isEditing && this.empleadoId
      ? this.api.updateEmpleado(this.empleadoId, data)
      : this.api.createEmpleado(data);

    request.subscribe({
      next: () => {
        alert(this.isEditing ? 'Actualizado correctamente' : 'Empleado contratado con éxito');
        this.router.navigate(['/empleados']);
      },
      error: (e) => {
        console.error(e);
        const msg = e.error?.error || 'Error al procesar la solicitud';
        alert(msg);
        this.loading = false;
      }
    });
  }
}