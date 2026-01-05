import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-objetivo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './objetivo-form.component.html',
  styleUrl: './objetivo-form.component.css'
})
export class ObjetivoFormComponent implements OnInit {
  
  form: FormGroup;
  loading = false;
  esEdicion = false;
  objetivoId: number | null = null;
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef //Inyección para actualizar vista
  ) {
    // Definimos el formulario
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', Validators.required],
      meta_numerica: [100, [Validators.required, Validators.min(1)]],
      fecha_limite: ['', Validators.required],
      // Campos ocultos
      empleado: [null],
      estado: ['PENDIENTE'] 
    });
  }

  ngOnInit() {
    // 1. Asignar ID del empleado al formulario (Para cuando guardemos)
    const user = this.auth.getUser();
    if (user && user.id) {
      this.form.patchValue({ empleado: user.id });
    }

    // 2. Revisar URL: ¿Estamos editando? (ej: /objetivos/editar/5)
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.esEdicion = true;
        this.objetivoId = params['id'];
        this.cargarDatos(this.objetivoId!);
      }
    });
  }

  // Carga un SOLO objetivo para editarlo
  cargarDatos(id: number) {
    this.loading = true;
    
    // Reutilizamos getObjetivos y buscamos el específico
    this.api.getObjetivos().subscribe({
      next: (res: any) => {
        const lista = res.results || res;
        const objetivo = lista.find((o: any) => o.id == id);
        
        if (objetivo) {
          this.form.patchValue({
            titulo: objetivo.titulo,
            descripcion: objetivo.descripcion,
            meta_numerica: objetivo.meta_numerica,
            fecha_limite: objetivo.fecha_limite,
            estado: objetivo.estado,
            empleado: objetivo.empleado
          });
        }
        
        this.loading = false;
        this.cd.detectChanges(); // <--- IMPORTANTE: Actualizar vista
      },
      error: (err) => {
        console.error(err);
        this.mensajeError = 'No se pudo cargar el objetivo.';
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.mensajeError = '';
    const data = this.form.value;

    let peticion;
    if (this.esEdicion && this.objetivoId) {
      peticion = this.api.updateObjetivo(this.objetivoId, data);
    } else {
      peticion = this.api.saveObjetivo(data);
    }

    peticion.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/objetivos']);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.mensajeError = 'Ocurrió un error al guardar. Verifica los datos.';
        this.cd.detectChanges(); // <--- Mostrar error visualmente
      }
    });
  }
  
  eliminar() {
    if (!this.esEdicion || !this.objetivoId) return;
    
    if (confirm('¿Estás seguro de eliminar este objetivo?')) {
      this.loading = true;
      this.api.deleteObjetivo(this.objetivoId).subscribe({
        next: () => {
             this.loading = false;
             this.router.navigate(['/objetivos']);
        },
        error: () => {
            this.loading = false;
            alert("Error al eliminar");
        }
      });
    }
  }
}