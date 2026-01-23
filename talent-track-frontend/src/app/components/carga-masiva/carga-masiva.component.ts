import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

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
  reporte: any = null;
  errorGeneral = '';
  descargandoPlantilla = false;
  
  // Array auxiliar para la tabla de errores
  erroresParseados: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.errorGeneral = '';
      this.reporte = null;
      this.erroresParseados = [];
    }
  }

  descargarPlantilla() {
    this.descargandoPlantilla = true;
    
    Swal.fire({
      title: 'Descargando...',
      html: 'Por favor espera mientras se descarga la plantilla',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Pequeño delay para mejorar UX
    setTimeout(() => {
      this.api.downloadPlantilla();
      this.descargandoPlantilla = false;
      Swal.close();
      
      // Mostrar confirmación
      Swal.fire({
        title: '✅ Descarga Completada',
        html: 'La plantilla se ha descargado correctamente. Abre el archivo y rellénalo con tus datos.',
        icon: 'success',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#2563eb'
      });
    }, 800);
  }

  subirArchivo() {
    if (!this.archivoSeleccionado) return;

    this.loading = true;
    this.reporte = null;
    this.errorGeneral = '';
    this.erroresParseados = [];

    this.api.uploadEmpleados(this.archivoSeleccionado)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          this.reporte = res;
          // Parseamos los errores para la tabla bonita
          if (res.errores && res.errores.length > 0) {
            this.erroresParseados = res.errores.map((errString: string) => {
              // Formato esperado backend: "Fila 5: Mensaje de error"
              const partes = errString.split(':');
              if (partes.length >= 2) {
                return { fila: partes[0].trim(), mensaje: partes.slice(1).join(':').trim() };
              }
              return { fila: '-', mensaje: errString };
            });
          }
        },
        error: (e) => {
          console.error(e);
          const msg = e.error?.error || 'Error desconocido de conexión.';
          this.errorGeneral = msg;
        }
      });
  }
}