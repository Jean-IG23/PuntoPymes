import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carga-masiva.component.html',
  styleUrl: './carga-masiva.component.css' // Asegúrate que exista o bórralo
})
export class CargaMasivaComponent {

  archivoSeleccionado: File | null = null;
  loading = false;
  reporte: any = null;
  errorGeneral = '';
  
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
    this.api.downloadPlantilla();
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