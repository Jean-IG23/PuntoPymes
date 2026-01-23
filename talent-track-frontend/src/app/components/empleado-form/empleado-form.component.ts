import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { soloLetras, soloNumeros, documentoValido, telefonoValido, getErrorMessage } from '../../services/custom-validators';
import { forkJoin } from 'rxjs'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './empleado-form.component.html',
  styleUrls: ['./empleado-form.component.css']
})
export class EmpleadoFormComponent implements OnInit {
  
  empleadoForm!: FormGroup;
  
  // --- ESTADO ---
  isEditing: boolean = false;
  loading: boolean = false; // Carga general (catálogos)
  saving: boolean = false;  // Carga al guardar
  empleadoId: number | null = null;
  titulo = 'Nuevo Colaborador';

  // --- CATÁLOGOS ---
  sucursales: any[] = [];
  departamentos: any[] = []; // Lista completa
  puestos: any[] = [];
  turnos: any[] = [];

  // --- LISTAS FILTRADAS ---
  departamentosFiltrados: any[] = []; // Lista reducida según sucursal
  
  // --- FOTO DE PERFIL ---
  selectedFoto: File | null = null;
  fotoPreview: string | ArrayBuffer | null = null;
  
  constructor(
    private fb: FormBuilder,
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cd: ChangeDetectorRef
  ) {}
  
  // Helper para mensajes de error
  getErrorMessage(fieldName: string, controlName: string): string {
    const control = this.empleadoForm.get(controlName);
    if (!control?.errors || !control?.touched) return '';
    return getErrorMessage(fieldName, control.errors);
  }
  
  ngOnInit(): void {
    this.initForm();       // 1. Crear el cascarón del formulario
    this.cargarCatalogos(); // 2. Traer listas del backend
  }

  // 1. INICIALIZAR FORMULARIO
  initForm() {
    this.empleadoForm = this.fb.group({
      // Datos Personales
      nombres: ['', [Validators.required, Validators.minLength(3), soloLetras()]],
      apellidos: ['', [Validators.required, Validators.minLength(3), soloLetras()]],
      documento: ['', [Validators.required, Validators.minLength(5), soloNumeros()]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [telefonoValido()]],
      direccion: [''],
      
      // Estructura (IDs)
      sucursal: [null, Validators.required],
      departamento: [null, Validators.required],
      puesto: [null, Validators.required],
      turno_asignado: [null], // Opcional
      
      // Contratación
      fecha_ingreso: [new Date().toISOString().substring(0, 10), Validators.required],
      sueldo: [460, [Validators.required, Validators.min(260)]],
      rol: ['EMPLEADO', Validators.required],
      estado: ['ACTIVO']
    });
  }

  // 2. CARGA DE DATOS MAESTROS
  cargarCatalogos() {
    this.loading = true;
    this.cd.detectChanges();
    const empresaId = this.auth.getEmpresaId();

    forkJoin({
      sucursales: this.api.getSucursales(empresaId || undefined),
      deptos: this.api.getDepartamentos(empresaId || undefined),
      puestos: this.api.getPuestos(undefined, empresaId || undefined),
      turnos: this.api.getTurnos()
    }).subscribe({
      next: (res: any) => {
        // Manejo robusto (por si viene paginado o array directo)
        this.sucursales = res.sucursales.results || res.sucursales;
        this.departamentos = res.deptos.results || res.deptos;
        this.puestos = res.puestos.results || res.puestos;
        this.turnos = res.turnos.results || res.turnos;
        
        // Debug: Mostrar estructura COMPLETA de departamentos
        console.log('=== DEPARTAMENTOS CARGADOS ===');
        console.log('Total:', this.departamentos.length);
        this.departamentos.forEach((d: any, i: number) => {
          console.log(`[${i}] ID:${d.id} Nombre:"${d.nombre}" sucursal:${d.sucursal} sucursal_id:${d.sucursal_id}`, d);
        });
        
        console.log('=== SUCURSALES CARGADAS ===');
        console.log('Total:', this.sucursales.length);
        this.sucursales.forEach((s: any, i: number) => {
          console.log(`[${i}] ID:${s.id} Nombre:"${s.nombre}"`);
        });
        
        // Una vez tenemos los catálogos, verificamos si es edición
        this.verificarRuta(); 
      },
      error: (e) => {
        console.error("Error cargando catálogos", e);
        Swal.fire('Error', 'No se pudieron cargar los datos necesarios.', 'error');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  // 3. VERIFICAR SI ESTAMOS EDITANDO
  verificarRuta() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditing = true;
        this.titulo = 'Editar Colaborador';
        this.empleadoId = Number(id);
        this.cargarEmpleado(this.empleadoId);
      } else {
        this.loading = false; 
        this.cd.detectChanges();
      }
    });
  }

  // 4. CARGAR DATOS DEL EMPLEADO (Modo Edición)
  cargarEmpleado(id: number) {
    this.api.getEmpleado(id).subscribe({
      next: (data: any) => {
        // PREPARACIÓN DE DATOS (Normalización ID vs Objeto)
        // El backend puede devolver { sucursal: {id: 1, nombre...} } o { sucursal: 1 }
        // El formulario necesita el ID (1).
        
        const sucursalId = (typeof data.sucursal === 'object' && data.sucursal) ? data.sucursal.id : data.sucursal;
        const deptoId = (typeof data.departamento === 'object' && data.departamento) ? data.departamento.id : data.departamento;
        const puestoId = (typeof data.puesto === 'object' && data.puesto) ? data.puesto.id : data.puesto;
        const turnoId = (typeof data.turno_asignado === 'object' && data.turno_asignado) ? data.turno_asignado.id : data.turno_asignado;

        // Llenar formulario
        this.empleadoForm.patchValue({
            nombres: data.nombres,
            apellidos: data.apellidos,
            documento: data.documento,
            email: data.email,
            telefono: data.telefono,
            direccion: data.direccion,
            sucursal: sucursalId,
            puesto: puestoId,
            turno_asignado: turnoId,
            fecha_ingreso: data.fecha_ingreso,
            sueldo: data.sueldo,
            rol: data.rol,
            estado: data.estado
        });

        // IMPORTANTE: Filtrar departamentos antes de setear el valor
        this.filtrarDepartamentos(sucursalId);
        
        // Setear departamento (después de filtrar, si no, el select estaría vacío)
        this.empleadoForm.patchValue({ departamento: deptoId });

        this.loading = false;
        this.cd.detectChanges();
      },
      error: (e) => {
        console.error(e);
        Swal.fire('Error', 'No se encontró la ficha del empleado', 'error');
        this.router.navigate(['/empleados']);
      }
    });
  }

  // 5. EVENTOS: CAMBIO DE SUCURSAL
  onSucursalChange() {
    const sucursalId = this.empleadoForm.get('sucursal')?.value;
    
    // 1. Resetear departamento (porque cambió la sucursal padre)
    this.empleadoForm.patchValue({ departamento: null });
    
    // 2. Filtrar lista
    this.filtrarDepartamentos(sucursalId);
  }

  filtrarDepartamentos(sucursalId: number | null) {
    if (!sucursalId) {
        this.departamentosFiltrados = [];
        console.log('❌ Sucursal no seleccionada');
        return;
    }
    
    console.log(`\n🔍 FILTRANDO para sucursal ID: ${sucursalId}`);
    console.log(`Total departamentos disponibles: ${this.departamentos.length}`);
    
    // Filtramos la lista maestra
    this.departamentosFiltrados = this.departamentos.filter(d => {
        // Obtener ID de sucursal del departamento
        let dSucId: any;
        let source = '';
        
        if (d.sucursal_id !== undefined && d.sucursal_id !== null) {
            dSucId = d.sucursal_id;
            source = 'sucursal_id';
        } else if (typeof d.sucursal === 'object' && d.sucursal && d.sucursal.id !== undefined) {
            dSucId = d.sucursal.id;
            source = 'sucursal.id';
        } else if (typeof d.sucursal === 'number') {
            dSucId = d.sucursal;
            source = 'sucursal (directo)';
        } else {
            console.warn(`⚠️ Departamento "${d.nombre}" (ID ${d.id}) NO tiene sucursal asociada:`, d);
            return false;
        }
        
        const match = Number(dSucId) === Number(sucursalId);
        const status = match ? '✓' : '✗';
        console.log(`${status} [${d.id}] "${d.nombre}" → sucursal=${dSucId} (${source})`);
        
        return match;
    });
    
    console.log(`\n📊 RESULTADO: ${this.departamentosFiltrados.length} departamentos encontrados`);
    if (this.departamentosFiltrados.length === 0) {
        console.warn(`⚠️ NO hay departamentos para la sucursal ${sucursalId}`);
        console.log('Posibles causas:');
        console.log('  1. Los departamentos no existen en la BD');
        console.log('  2. Los departamentos existen pero tienen otra sucursal asignada');
        console.log('  3. El serializer no está incluyendo el campo sucursal correctamente');
    }
  }

  // MANEJO DE FOTO
  onFotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFoto = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreview = reader.result;
        this.cd.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  // FILTRAR DOCUMENTO: solo permitir números
  onDocumentoInput(event: any) {
    const input = event.target;
    const value = input.value.replace(/[^0-9]/g, ''); // Remover todo lo que no sea número
    this.empleadoForm.patchValue({ documento: value }, { emitEvent: false });
    input.value = value;
  }

  // 6. GUARDAR DATOS
  guardar() {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      // Toast suave para avisar
      const toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
      });
      toast.fire({ icon: 'warning', title: 'Complete los campos obligatorios' });
      return;
    }

    this.saving = true;
    this.cd.detectChanges();
    
    // Preparar datos: si hay foto, usar FormData, sino objeto normal
    let dataToSend: any = this.empleadoForm.value;
    
    if (this.selectedFoto) {
      const formData = new FormData();
      // Añadir todos los campos del formulario
      Object.keys(this.empleadoForm.value).forEach(key => {
        const value = this.empleadoForm.value[key];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      // Añadir foto
      formData.append('foto', this.selectedFoto);
      dataToSend = formData;
    }
    
    // Inyectar empresa si es nuevo
    const empresaId: string = String(this.auth.getEmpresaId() ?? '');
    if (!this.isEditing && !(dataToSend instanceof FormData)) {
      dataToSend.empresa = empresaId;
    } else if (!this.isEditing && dataToSend instanceof FormData) {
      dataToSend.append('empresa', empresaId);
    }

    const request = this.isEditing && this.empleadoId
      ? this.api.updateEmpleado(this.empleadoId, dataToSend)
      : this.api.createEmpleado(dataToSend);

    request.subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
            title: '¡Excelente!',
            text: this.isEditing ? 'Datos actualizados correctamente' : 'Colaborador registrado con éxito',
            icon: 'success',
            confirmButtonText: 'Volver al Directorio',
            confirmButtonColor: '#4F46E5'
        }).then((result) => {
            if (result.isConfirmed) {
                this.router.navigate(['/empleados']);
            }
        });
      },
      error: (e) => {
        this.saving = false;
        this.cd.detectChanges();
        console.error(e);
        // Manejo de errores comunes
        let msg = 'Ocurrió un error al procesar la solicitud.';
        if (e.error?.email) msg = 'El correo electrónico ya está registrado.';
        if (e.error?.documento) msg = 'El número de documento ya existe en esta empresa.';
        
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}