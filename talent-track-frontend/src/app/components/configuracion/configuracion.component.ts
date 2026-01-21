import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html'
})
export class ConfiguracionComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      // General
      moneda: ['USD', [Validators.required, Validators.maxLength(5)]],
      divisor_hora_mensual: [240, [Validators.required, Validators.min(1)]],
      
      // Horas Extras
      factor_he_diurna: [1.50, [Validators.required, Validators.min(1)]],
      factor_he_nocturna: [2.00, [Validators.required, Validators.min(1)]],
      hora_inicio_nocturna: ['19:00:00', Validators.required],
      
      // Políticas
      descontar_atrasos: [true],
      tolerancia_remunerada: [true]
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.api.getConfiguracion().subscribe({
      next: (res: any) => {
        // Ajustamos la hora para que el input type="time" la lea bien (HH:MM)
        if (res.hora_inicio_nocturna && res.hora_inicio_nocturna.length > 5) {
            res.hora_inicio_nocturna = res.hora_inicio_nocturna.substring(0, 5);
        }
        this.form.patchValue(res);
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
      }
    });
  }

  guardar() {
    if (this.form.invalid) return;

    this.saving = true;
    this.api.updateConfiguracion(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
            title: 'Configuración Guardada',
            text: 'Las reglas de nómina se han actualizado correctamente.',
            icon: 'success',
            confirmButtonColor: '#e11d48' // Color Rose-600
        });
      },
      error: (e) => {
        this.saving = false;
        Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
      }
    });
  }
}