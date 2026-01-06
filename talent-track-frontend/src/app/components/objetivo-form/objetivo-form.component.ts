import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-objetivo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './objetivo-form.component.html',
  styleUrl: './objetivo-form.component.css'
})
export class ObjetivoFormComponent implements OnInit {

  form!: FormGroup;
  empleados: any[] = [];
  loading = false;
  titulo = 'Nueva Meta / Objetivo';
  id: any = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initForm();
    this.cargarEmpleados();
    
    // Verificar si es edición
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.titulo = 'Editar Objetivo';
      this.cargarObjetivo(this.id);
    }
  }

  initForm() {
    this.form = this.fb.group({
      empleado: ['', Validators.required],
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', Validators.required],
      fecha_limite: ['', Validators.required], // Deadline
      prioridad: ['MEDIA', Validators.required],
      estado: ['PENDIENTE'] // Por defecto
    });
  }

  cargarEmpleados() {
    // Aquí es donde en el futuro filtraremos: "Dame solo mis subordinados"
    // Por ahora, traemos todos.
    this.api.getEmpleados().subscribe({
      next: (res: any) => {
        this.empleados = res.results || res;
      },
      error: (e) => console.error(e)
    });
  }

  cargarObjetivo(id: number) {
    this.loading = true;
    // Asumiendo que tienes un endpoint getObjetivo(id) o usas getObjetivos filtrado
    // Como en tu API service actual tienes getObjetivos(empleadoId), 
    // tal vez necesites un getObjetivoById(id) en el backend o filtrar en el front.
    // Simularemos carga por ahora o implementa getObjetivoById en ApiService.
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form.value;
    
    // Si es nuevo, lo creamos
    this.api.saveObjetivo(data).subscribe({
      next: () => {
        alert('Objetivo asignado correctamente 🎯');
        this.router.navigate(['/objetivos']);
      },
      error: (e) => {
        console.error(e);
        alert('Error al asignar objetivo.');
      }
    });
  }
}