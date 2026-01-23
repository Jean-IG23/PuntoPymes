import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-objetivo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './objetivo-form.component.html',
  styleUrl: './objetivo-form.component.css'
})
export class ObjetivoFormComponent implements OnInit {

  form!: FormGroup;
  empleados: any[] = [];
  empleadoSeleccionado: any = null;
  loading = false;
  guardando = false;
  titulo = '🎯 Nuevo Objetivo';
  id: any = null;
  esEdicion = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initForm();
    this.cargarEmpleados();
    
    // Listener para cuando cambia el empleado seleccionado
    this.form.get('empleado')?.valueChanges.subscribe((empleadoId: any) => {
      if (empleadoId) {
        this.empleadoSeleccionado = this.empleados.find(e => e.id === Number(empleadoId)) || null;
      } else {
        this.empleadoSeleccionado = null;
      }
      this.cdr.markForCheck();
    });
    
    // Verificar si es edición
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.esEdicion = true;
      this.titulo = '✏️ Editar Objetivo';
      this.cargarObjetivo(this.id);
    }
  }

  initForm() {
    this.form = this.fb.group({
      empleado: [null, Validators.required],
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', Validators.required],
      fecha_limite: ['', Validators.required],
      prioridad: ['MEDIA', Validators.required],
      estado: ['PENDIENTE', Validators.required],
      meta_numerica: [100, [Validators.required, Validators.min(1)]],
      avance_actual: [0, [Validators.required, Validators.min(0)]]
    });
  }

  // Manejo de error de imagen
  onFotoError(event: any) {
    event.target.style.display = 'none';
  }

  cargarEmpleados() {
    this.api.getEmpleados().subscribe({
      next: (res: any) => {
        this.empleados = res.results || res;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Error al cargar empleados:', e);
        this.error = 'No se pudieron cargar los empleados';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los empleados'
        });
      }
    });
  }

  cargarObjetivo(id: number) {
    this.loading = true;
    this.error = null;
    
    this.api.getObjetivoById(id).subscribe({
      next: (objetivo: any) => {
        this.form.patchValue({
          empleado: objetivo.empleado,
          titulo: objetivo.titulo,
          descripcion: objetivo.descripcion,
          fecha_limite: this.formatoFecha(objetivo.fecha_limite),
          prioridad: objetivo.prioridad,
          estado: objetivo.estado,
          meta_numerica: objetivo.meta_numerica || 100,
          avance_actual: objetivo.avance_actual || 0
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Error al cargar objetivo:', e);
        this.error = 'No se pudo cargar el objetivo';
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el objetivo solicitado'
        }).then(() => {
          this.router.navigate(['/gestion/objetivos']);
        });
      }
    });
  }

  formatoFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toISOString().split('T')[0];
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Validación',
        text: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    this.guardando = true;
    const data = {
      ...this.form.value,
      empleado: Number(this.form.get('empleado')?.value) // Asegurar que es número
    };
    
    // Si es edición, agregar el ID
    if (this.esEdicion) {
      data.id = this.id;
    }
    
    this.api.saveObjetivo(data).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: this.esEdicion ? 'Objetivo actualizado correctamente' : 'Objetivo creado correctamente',
          timer: 1500
        }).then(() => {
          this.router.navigate(['/gestion/objetivos']);
        });
      },
      error: (e) => {
        this.guardando = false;
        console.error('Error al guardar objetivo:', e);
        
        // Extraer mensaje de error del backend
        let errorMsg = 'No se pudo guardar el objetivo';
        if (e.error?.empleado) {
          errorMsg = Array.isArray(e.error.empleado) ? e.error.empleado[0] : e.error.empleado;
        } else if (e.error?.titulo) {
          errorMsg = Array.isArray(e.error.titulo) ? e.error.titulo[0] : e.error.titulo;
        } else if (e.error?.detail) {
          errorMsg = e.error.detail;
        }
        
        this.error = errorMsg;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg
        });
      }
    });
  }

  cancelar() {
    this.router.navigate(['/gestion/objetivos']);
  }
}