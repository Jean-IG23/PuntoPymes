import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-asistencia-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia-admin.component.html',
  styleUrl: './asistencia-admin.component.css'
})
export class AsistenciaAdminComponent implements OnInit {

  jornadas: any[] = [];
  loading = true;

  // Filtros
  fechaInicio: string = '';
  fechaFin: string = '';
  filtroTexto: string = ''; // Para buscar por nombre
  
  // Estadísticas rápidas
  totalAtrasos = 0;
  totalPresentes = 0;

  // Datos de nómina
  nominaData: any = null;

  constructor(private api: ApiService) {
    // Por defecto, cargar el mes actual
    const hoy = new Date();
    this.fechaFin = hoy.toISOString().split('T')[0];
    
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicio = primerDia.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.cargarReporte();
  }

  cargarReporte() {
    this.loading = true;
    
    const params = {
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin
    };
    
    this.api.get('jornadas/', params).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res.results || res;
        this.procesarDatos(data);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  procesarDatos(data: any[]) {
    // 1. Filtrar por fechas
    let filtrados = data.filter(j => 
        j.fecha >= this.fechaInicio && j.fecha <= this.fechaFin
    );

    // 2. Filtrar por texto (Nombre del empleado)
    if (this.filtroTexto) {
        const term = this.filtroTexto.toLowerCase();
        filtrados = filtrados.filter(j => 
            // Asumiendo que el serializer devuelve el objeto empleado o al menos su nombre
            // Si tu serializer solo devuelve ID, necesitarás ajustar el Backend para devolver nombres.
            // Por ahora asumiremos que devuelve el nombre o string representation
            JSON.stringify(j).toLowerCase().includes(term)
        );
    }

    // 3. Ordenar: Más reciente primero
    this.jornadas = filtrados.sort((a, b) => b.id - a.id);

    // 4. Calcular KPIs
    this.totalPresentes = this.jornadas.length;
    // Lógica simple: Si llegó después de las 09:10 (ejemplo), es atraso.
    // Idealmente esto viene del Turno, pero lo calcularemos visualmente.
    this.totalAtrasos = this.jornadas.filter(j => j.es_atraso).length; 
  }

  // Helper para calcular horas trabajadas
  calcularHoras(entrada: any, salida: any): string {
    if (!entrada || !salida) return '--';

    const d1 = new Date(entrada);
    const d2 = new Date(salida);

    const diffMs = d2.getTime() - d1.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);

    return `${diffHrs}h ${diffMins}m`;
  }

  getEstadoClase(jornada: any): string {
      if (!jornada.salida) return 'bg-yellow-100 text-yellow-800'; // Trabajando
      if (jornada.es_atraso) return 'bg-red-100 text-red-800'; // Atrasado
      return 'bg-green-100 text-green-800'; // OK
  }

  getEstadoTexto(jornada: any): string {
      if (!jornada.salida) return 'En Turno';
      if (jornada.es_atraso) return 'Atrasado';
      return 'Completado';
  }

  verNomina() {
    const params = {
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin
    };

    this.api.get('nomina/calculo/', params).subscribe({
      next: (res: any) => {
        this.nominaData = res;
      },
      error: (err) => {
        console.error('Error al cargar nómina:', err);
        alert('Error al cargar datos de nómina');
      }
    });
  }
}