import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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
  resultado: any = null; // Aquí guardamos lo que responda Django (creados, errores)
  errorGeneral = '';

  constructor(private api: ApiService, private router: Router) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validar que sea Excel
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        this.archivoSeleccionado = file;
        this.errorGeneral = '';
      } else {
        this.errorGeneral = 'Por favor selecciona un archivo Excel (.xlsx)';
        this.archivoSeleccionado = null;
      }
    }
  }

  subirArchivo() {
    if (!this.archivoSeleccionado) return;

    this.loading = true;
    this.resultado = null;
    this.errorGeneral = '';

    this.api.uploadEmpleados(this.archivoSeleccionado).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.resultado = res; // { status: 'OK', creados: 10, errores: [] }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorGeneral = 'Error al procesar el archivo. Revisa que el formato sea correcto.';
      }
    });
  }

  descargarPlantilla() {
    // Puedes crear un link a un archivo estático en assets
    const link = document.createElement('a');
    link.href = 'assets/plantilla_empleados.xlsx';
    link.download = 'plantilla_empleados.xlsx';
    link.click();
  }
}