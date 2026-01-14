import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carga-masiva.component.html',
  styleUrl: './carga-masiva.component.css'
})
export class CargaMasivaComponent {

  archivoSeleccionado: File | null = null;
  loading = false;
  
  // Estado del resultado
  reporte: any = null; // { total: 10, creados: 8, errores: ['Fila 3: Email inválido'] }
  errorGeneral = '';

  constructor(private api: ApiService, private router: Router) {}

  // 1. Selección de Archivo con Validación
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    
    if (file) {
      // Validar extensión
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(extension)) {
        this.errorGeneral = '⚠️ Formato no válido. Solo se aceptan archivos Excel (.xlsx)';
        this.archivoSeleccionado = null;
        return;
      }

      this.archivoSeleccionado = file;
      this.errorGeneral = '';
      this.reporte = null; // Limpiar reporte anterior
    }
  }

  // 2. Descargar Plantilla (Vital para UX)
  descargarPlantilla() {
    this.api.downloadPlantilla();
  }

  // 3. Subir y Procesar
  subirArchivo() {
    if (!this.archivoSeleccionado) return;

    this.loading = true;
    this.reporte = null;
    this.errorGeneral = '';

    this.api.uploadEmpleados(this.archivoSeleccionado)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          // Asumimos que Django devuelve: { mensaje: '...', creados: 5, errores: [] }
          this.reporte = res;
          
          if (res.creados > 0 && (!res.errores || res.errores.length === 0)) {
             // Si fue perfecto, opcionalmente redirigir o mostrar éxito total
             // setTimeout(() => this.router.navigate(['/empleados']), 3000);
          }
        },
        error: (e) => {
          console.error(e);
          this.errorGeneral = e.error?.error || 'Ocurrió un error inesperado al procesar el archivo.';
        }
      });
  }
}