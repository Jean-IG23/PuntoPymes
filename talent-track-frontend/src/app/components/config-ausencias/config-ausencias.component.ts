import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-config-ausencias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './config-ausencias.component.html',
  styleUrls: ['./config-ausencias.component.css']
})
export class ConfigAusenciasComponent implements OnInit {

  tipos: any[] = [];
  formTipo: FormGroup;
  loading = false;
  procesandoTipo = false;
  editandoTipo: any = null;
  mostrarFormulario = false;

  constructor(private api: ApiService, private fb: FormBuilder) {
    // FIX: El modelo TipoAusencia solo tiene: nombre, afecta_sueldo, empresa
    this.formTipo = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      afecta_sueldo: [false]
    });
  }

  ngOnInit() {
    this.cargarTipos();
  }

  cargarTipos() {
    this.loading = true;
    this.api.getTiposAusencia()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          // FIX: Manejar ambos formatos de respuesta (array directo o dentro de .results)
          if (Array.isArray(res)) {
            this.tipos = res;
          } else if (res?.results && Array.isArray(res.results)) {
            this.tipos = res.results;
          } else {
            console.warn('Formato de respuesta inesperado:', res);
            this.tipos = [];
          }
          
          // Ordenar alfabéticamente con Vacaciones primero
          this.tipos = this.tipos.sort((a, b) => {
            if (a.nombre.toLowerCase().includes('vacaciones')) return -1;
            if (b.nombre.toLowerCase().includes('vacaciones')) return 1;
            return a.nombre.localeCompare(b.nombre);
          });
        },
        error: (e) => {
          console.error('Error cargando tipos de ausencia:', e);
          Swal.fire('Error', 'No se pudieron cargar los tipos de ausencia', 'error');
          this.tipos = [];
        }
      });
  }

  crearTipo() {
    // FIX: Validar antes de enviar
    if (this.formTipo.invalid) {
      Swal.fire('Error', 'Por favor completa los campos requeridos', 'error');
      return;
    }

    // Prevenir duplicados (buscar por nombre similar)
    const nombreNuevo = this.formTipo.value.nombre.toLowerCase().trim();
    if (this.tipos.some(t => t.nombre.toLowerCase().trim() === nombreNuevo)) {
      Swal.fire('Error', 'Ya existe un tipo de ausencia con ese nombre', 'error');
      return;
    }

    this.procesandoTipo = true;
    const payload = this.formTipo.value;

    this.api.createTipoAusencia(payload)
      .pipe(finalize(() => this.procesandoTipo = false))
      .subscribe({
        next: () => {
          Swal.fire('✅ Creado', 'Tipo de ausencia agregado correctamente.', 'success');
          this.formTipo.reset({ afecta_sueldo: false });
          this.mostrarFormulario = false;
          this.cargarTipos(); // Recargar lista
        },
        error: (e) => {
          console.error('Error al crear tipo:', e);
          const mensaje = e.error?.error || e.error?.nombre?.[0] || 'No se pudo crear el tipo';
          Swal.fire('Error', mensaje, 'error');
        }
      });
  }

  eliminarTipo(id: number) {
    const tipo = this.tipos.find(t => t.id === id);
    
    if (!tipo) {
      Swal.fire('Error', 'Tipo de ausencia no encontrado', 'error');
      return;
    }
    
    // Proteger tipo "Vacaciones"
    if (tipo.nombre.toLowerCase().includes('vacaciones')) {
      Swal.fire('⛔ Protegido', 'No puedes eliminar el tipo "Vacaciones". Es crítico para el sistema.', 'warning');
      return;
    }

    Swal.fire({
        title: '¿Eliminar tipo de ausencia?',
        html: `<p>Se eliminará permanentemente: <strong>"${tipo.nombre}"</strong></p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="bi bi-trash-fill"></i> Sí, Eliminar',
        cancelButtonText: 'Cancelar'
    }).then((r) => {
        if(r.isConfirmed) {
            this.api.deleteTipoAusencia(id).subscribe({
                next: () => {
                    Swal.fire('✅ Eliminado', 'Tipo de ausencia borrado correctamente.', 'success');
                    this.cargarTipos(); // Recargar lista
                },
                error: (e) => {
                    const mensaje = e.error?.error || e.error?.detail || 'No se pudo eliminar (probablemente está en uso)';
                    Swal.fire('Error', mensaje, 'error');
                }
            });
        }
    });
  }

  abrirFormulario() {
    this.mostrarFormulario = true;
    this.editandoTipo = null;
    this.formTipo.reset();
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.editandoTipo = null;
    this.formTipo.reset();
  }

  obtenerColorTipo(nombre: string): string {
    if (nombre.toLowerCase().includes('vacaciones')) return 'bg-yellow-100 text-yellow-700';
    if (nombre.toLowerCase().includes('enfermedad') || nombre.toLowerCase().includes('licencia')) return 'bg-red-100 text-red-700';
    if (nombre.toLowerCase().includes('calamidad') || nombre.toLowerCase().includes('emergencia')) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  }

  obtenerIconoTipo(nombre: string): string {
    if (nombre.toLowerCase().includes('vacaciones')) return 'bi-sun-fill';
    if (nombre.toLowerCase().includes('enfermedad') || nombre.toLowerCase().includes('licencia')) return 'bi-hospital';
    if (nombre.toLowerCase().includes('calamidad') || nombre.toLowerCase().includes('emergencia')) return 'bi-exclamation-circle-fill';
    return 'bi-calendar-event';
  }
}