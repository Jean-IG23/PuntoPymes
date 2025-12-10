import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carga-masiva.component.html',
  styleUrl: './carga-masiva.component.css'
})
export class CargaMasivaComponent {
  
  archivoSeleccionado: File | null = null;
  cargando: boolean = false;
  reporte: any = null;

  constructor(private api: ApiService) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.reporte = null; // Limpiar reporte anterior
    }
  }

  subirArchivo() {
    if (!this.archivoSeleccionado) return;

    this.cargando = true;
    this.api.uploadEmpleados(this.archivoSeleccionado).subscribe(
      (data) => {
        this.cargando = false;
        this.reporte = data;
        if (this.reporte.exitosos > 0) {
          alert(`¡Se cargaron ${this.reporte.exitosos} empleados correctamente!`);
        }
      },
      (error) => {
        this.cargando = false;
        console.error(error);
        alert('Error al subir el archivo.');
      }
    );
  }
}