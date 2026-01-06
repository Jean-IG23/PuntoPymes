import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-config-ausencias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './config-ausencias.component.html'
})
export class ConfigAusenciasComponent implements OnInit {

  tipos: any[] = [];
  formTipo: FormGroup;
  loading = false;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.formTipo = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });
  }

  ngOnInit() {
    this.cargarTipos();
  }

  cargarTipos() {
    this.loading = true;
    this.api.getTiposAusencia().subscribe((res: any) => {
      this.tipos = res.results || res;
      this.loading = false;
    });
  }

  crearTipo() {
    if (this.formTipo.invalid) return;

    this.api.createTipoAusencia(this.formTipo.value).subscribe({
      next: () => {
        alert('Tipo de ausencia creado.');
        this.formTipo.reset();
        this.cargarTipos();
      },
      error: (e) => alert('Error: ' + (e.error?.error || 'No se pudo crear'))
    });
  }

  eliminarTipo(id: number) {
    if(!confirm('¿Estás seguro de eliminar este tipo?')) return;
    
    this.api.deleteTipoAusencia(id).subscribe({
      next: () => {
        this.cargarTipos();
      },
      error: () => alert('No se puede eliminar porque ya hay solicitudes usándolo.')
    });
  }
}