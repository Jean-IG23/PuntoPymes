import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
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

  // Modal
  showModal = false;
  form: FormGroup;
  loading = false;
  isEditing = false;
  selectedId: number | null = null;

  constructor(private api: ApiService, private fb: FormBuilder) {
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
    this.cargarEmpleados();
    this.cargarTareas();
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
        this.todasLasTareas = Array.isArray(res) ? res : res.results;
        this.loading = false;
      },
      error: () => this.loading = false
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

    this.api.actualizarTarea(tarea.id, { estado: nuevoEstado, asignado_a: tarea.asignado_a }).subscribe({
      error: () => {
        tarea.estado = estadoAnterior; // Revertir si falla
        Swal.fire('Error', 'No se pudo mover la tarea', 'error');
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
    if (this.form.invalid) return;
    
    const req = this.isEditing 
      ? this.api.actualizarTarea(this.selectedId!, this.form.value)
      : this.api.crearTarea(this.form.value);

    req.subscribe({
      next: () => {
        this.showModal = false;
        this.cargarTareas();
        Swal.fire('Éxito', 'Tarea guardada correctamente', 'success');
      },
      error: (e) => Swal.fire('Error', e.error?.detail || 'Error al guardar', 'error')
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
}