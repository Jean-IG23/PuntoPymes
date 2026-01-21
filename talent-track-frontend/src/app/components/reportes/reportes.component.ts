import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html'
})
export class ReportesComponent implements OnInit {

  // Filtros
  fechaInicio: string = '';
  fechaFin: string = '';
  empleadoId: string = '';
  
  // Datos
  asistencias: any[] = [];
  empleados: any[] = [];
  loading: boolean = false;

  // Resumen
  totalHoras: number = 0;
  totalAtrasos: number = 0;

  constructor(private api: ApiService) {
    // Por defecto: Mes actual
    const date = new Date();
    this.fechaInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    this.fechaFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.buscar();
  }

  cargarEmpleados() {
    this.api.getEmpleadosSimple().subscribe((res: any) => {
      this.empleados = Array.isArray(res) ? res : res.results;
    });
  }

  buscar() {
    this.loading = true;
    const params = {
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      empleado: this.empleadoId || null
    };

    this.api.get('jornadas/', params).subscribe({
      next: (res: any) => {
        this.asistencias = Array.isArray(res) ? res : res.results;
        this.calcularResumen();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  calcularResumen() {
    this.totalHoras = this.asistencias.reduce((acc, curr) => acc + (parseFloat(curr.horas_trabajadas) || 0), 0);
    this.totalAtrasos = this.asistencias.filter(a => a.es_atraso).length;
  }

  verMapa(lat: number, lng: number) {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  }

  exportarExcel() {
  this.loading = true; // Reutilizamos el spinner o creamos uno nuevo
  
  const params = {
    fecha_inicio: this.fechaInicio,
    fecha_fin: this.fechaFin,
    empleado: this.empleadoId || null
  };

  this.api.download('jornadas/exportar_excel/', params).subscribe({
    next: (blob: Blob) => {
      // Truco para descargar el archivo en el navegador
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Asistencia_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.loading = false;
      Swal.fire('Descargado', 'El reporte se ha generado correctamente.', 'success');
    },
    error: (err) => {
      console.error(err);
      this.loading = false;
      Swal.fire('Error', 'No se pudo generar el Excel.', 'error');
    }
  });
}
  verDetalle(item: any) {
  // Por ahora mostramos un resumen rápido, luego podría ser un modal
  Swal.fire({
    title: item.empleado_detalle?.nombres,
    html: `
      <p><strong>Entrada:</strong> ${item.entrada}</p>
      <p><strong>Salida:</strong> ${item.salida || 'Pendiente'}</p>
      <hr class="my-2">
      <p class="text-sm">${item.es_atraso ? '🛑 Llegó Tarde' : '✅ Puntual'}</p>
    `,
    icon: 'info'
  });
  }
  
}