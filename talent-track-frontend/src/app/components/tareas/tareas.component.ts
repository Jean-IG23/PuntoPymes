import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './tareas.component.html'
})
export class TareasComponent implements OnInit {
  
  // Columnas del Kanban
  columnas = [
    { id: 'PENDIENTE', titulo: 'Por Hacer', color: 'bg-gray-100 border-gray-200' },
    { id: 'PROGRESO', titulo: 'En Curso', color: 'bg-blue-50 border-blue-100' },
    { id: 'REVISION', titulo: 'Revisión', color: 'bg-yellow-50 border-yellow-100' },
    { id: 'COMPLETADA', titulo: 'Listo', color: 'bg-green-50 border-green-100' }
  ];

  // Datos
  todasLasTareas: any[] = [];
  empleados: any[] = []; // Para el select de asignar
  
  // Filtros
  verMisTareas: boolean = false; // Toggle para ver solo mías o de todo el equipo
  
  // Rol actual
  rolActual: string = '';
  esGerente: boolean = false;
  esAdmin: boolean = false;
  esRRHH: boolean = false;

  // Modal
  showModal = false;
  form: FormGroup;
  loading = false;
  isEditing = false;
  selectedId: number | null = null;

  constructor(
    private api: ApiService, 
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      asignado_a: ['', Validators.required],
      fecha_limite: ['', Validators.required],
      prioridad: ['MEDIA', Validators.required],
      puntos_valor: [1, [Validators.min(1), Validators.max(10)]]
    });
  }

  ngOnInit() {
    // Obtener rol actual
    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.rolActual = perfil.rol;
        this.esGerente = ['GERENTE', 'ADMIN', 'RRHH', 'SUPERADMIN'].includes(perfil.rol);
        this.esAdmin = ['ADMIN', 'SUPERADMIN'].includes(perfil.rol);
        this.esRRHH = ['RRHH', 'SUPERADMIN'].includes(perfil.rol);
        console.log('Rol cargado:', this.rolActual);
      }
    });
    
    this.cargarEmpleados();
    this.cargarTareas();
  }

  // Manejo de error de imagen
  onFotoError(event: any) {
    event.target.style.display = 'none';
  }

  cargarEmpleados() {
    this.api.getEmpleadosSimple().subscribe((res: any) => {
      this.empleados = Array.isArray(res) ? res : res.results;
    });
  }

  cargarTareas() {
    this.loading = true;
    this.api.getTareas(this.verMisTareas).subscribe({
      next: (res: any) => {
        this.todasLasTareas = Array.isArray(res) ? res : res.results || [];
        this.loading = false;
        this.cdr.markForCheck(); // Force change detection
        console.log('✓ Tareas cargadas:', this.todasLasTareas.length);
      },
      error: (err: any) => {
        console.error('Error al cargar tareas:', err);
        this.loading = false;
        this.todasLasTareas = [];
        this.cdr.markForCheck();
        Swal.fire('Error', 'No se pudieron cargar las tareas', 'error');
      }
    });
  }

  // Filtra las tareas para pintar cada columna
  getTareasPorEstado(estado: string) {
    return this.todasLasTareas.filter(t => t.estado === estado);
  }

  cambiarEstado(tarea: any, nuevoEstado: string) {
    // Optimistic UI: Actualizamos visualmente antes de que responda el servidor
    const estadoAnterior = tarea.estado;
    tarea.estado = nuevoEstado;

    // Enviar el objeto completo para que el serializer valide correctamente
    const datosActualizados = {
      ...tarea,
      estado: nuevoEstado,
      asignado_a: Number(tarea.asignado_a) || tarea.asignado_a.id // Asegurar que es ID numérico
    };

    this.api.actualizarTarea(tarea.id, datosActualizados).subscribe({
      next: (response: any) => {
        // Éxito silencioso - la UI ya está actualizada
        console.log('✓ Tarea actualizada:', tarea.titulo);
      },
      error: (err: any) => {
        // Revertir si falla
        tarea.estado = estadoAnterior;
        console.error('Error al cambiar estado:', err);
        
        let mensajeError = 'No se pudo mover la tarea';
        if (err.error?.detail) {
          mensajeError = err.error.detail;
        } else if (err.error?.estado) {
          mensajeError = Array.isArray(err.error.estado) ? err.error.estado[0] : err.error.estado;
        } else if (err.error?.titulo) {
          mensajeError = Array.isArray(err.error.titulo) ? err.error.titulo[0] : err.error.titulo;
        }
        
        Swal.fire('Error', mensajeError, 'error');
      }
    });
  }

  abrirModal(tarea: any = null) {
    this.isEditing = !!tarea;
    this.showModal = true;
    if (tarea) {
      this.selectedId = tarea.id;
      // Ajuste de fecha para input datetime-local o date
      let fecha = tarea.fecha_limite;
      if (fecha && fecha.includes('T')) fecha = fecha.split('T')[0]; // Simple date
      
      this.form.patchValue({
        ...tarea,
        fecha_limite: fecha,
        asignado_a: tarea.asignado_a
      });
    } else {
      this.selectedId = null;
      this.form.reset({ prioridad: 'MEDIA', puntos_valor: 1 });
    }
  }

  guardar() {
    if (this.form.invalid) {
      Swal.fire('Validación', 'Por favor completa todos los campos requeridos', 'warning');
      return;
    }
    
    const formData = {
      ...this.form.value,
      asignado_a: Number(this.form.get('asignado_a')?.value) // Asegurar que es número
    };
    
    const req = this.isEditing 
      ? this.api.actualizarTarea(this.selectedId!, formData)
      : this.api.crearTarea(formData);

    req.subscribe({
      next: () => {
        this.showModal = false;
        this.form.reset({ prioridad: 'MEDIA', puntos_valor: 1 });
        this.cargarTareas();
        Swal.fire('Éxito', 'Tarea guardada correctamente', 'success');
      },
      error: (err: any) => {
        console.error('Error al guardar tarea:', err);
        let mensajeError = 'Error al guardar la tarea';
        
        if (err.error?.detail) {
          mensajeError = err.error.detail;
        } else if (err.error?.titulo) {
          mensajeError = Array.isArray(err.error.titulo) ? err.error.titulo[0] : err.error.titulo;
        } else if (err.error?.asignado_a) {
          mensajeError = Array.isArray(err.error.asignado_a) ? err.error.asignado_a[0] : err.error.asignado_a;
        }
        
        Swal.fire('Error', mensajeError, 'error');
      }
    });
  }

  eliminar(id: number) {
    Swal.fire({
      title: '¿Eliminar tarea?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444'
    }).then((r) => {
      if (r.isConfirmed) {
        this.api.eliminarTarea(id).subscribe(() => this.cargarTareas());
      }
    });
  }

  aprobarTarea(tarea: any) {
    Swal.fire({
      title: '¿Aprobar tarea?',
      text: `"${tarea.titulo}" será marcada como completada`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      confirmButtonColor: '#22c55e'
    }).then((r) => {
      if (r.isConfirmed) {
        this.api.aprobarTarea(tarea.id).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Tarea aprobada correctamente', 'success');
            this.cargarTareas();
          },
          error: (err: any) => {
            const msg = err.error?.error || 'Error al aprobar la tarea';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  rechazarTarea(tarea: any) {
    Swal.fire({
      title: '¿Rechazar tarea?',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Especifica por qué rechazas esta tarea...',
      inputAttributes: {
        required: 'true'
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes especificar un motivo';
        }
        return null;
      }
    }).then((r) => {
      if (r.isConfirmed && r.value) {
        this.api.rechazarTarea(tarea.id, r.value).subscribe({
          next: () => {
            Swal.fire('Rechazada', 'La tarea fue devuelta al empleado para revisión', 'info');
            this.cargarTareas();
          },
          error: (err: any) => {
            const msg = err.error?.error || 'Error al rechazar la tarea';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }
}