import { Component, ChangeDetectorRef} from '@angular/core';
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

  constructor(private api: ApiService, private router: Router, private cdr: ChangeDetectorRef) {}

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

    // 1. YA NO ACTIVAMOS EL LOADING (Pantalla desbloqueada)
    // this.loading = true;  <-- Comentado o borrado
    
    // 2. Avisamos que empezó (opcional, una alerta rápida)
    console.log("Subida iniciada en segundo plano...");
    alert("El archivo se está procesando en segundo plano. Puedes seguir trabajando. Te avisaremos al terminar.");

    this.reporte = null;
    this.errorGeneral = '';

    this.api.uploadEmpleados(this.archivoSeleccionado)
      .pipe(finalize(() => {
          // Ya no hace falta apagar loading porque nunca lo prendimos
          this.cdr.detectChanges(); 
      }))
      .subscribe({
        next: (res: any) => {
          console.log("Respuesta recibida:", res);
          this.reporte = res;
          
          // 3. AVISO FINAL (Cuando Django termine)
          if (res.creados > 0) {
             alert(`¡Proceso terminado! Se crearon ${res.creados} empleados correctamente.`);
          } else if (res.errores.length > 0) {
             alert(`Proceso terminado con ${res.errores.length} errores. Revisa la lista.`);
          }
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error(e);
          // Si da error (incluso Broken Pipe), avisamos
          alert('Hubo un error en la carga o se perdió la conexión.');
          this.errorGeneral = 'Error de conexión o timeout.';
          this.cdr.detectChanges();
        }
      });
  }
}