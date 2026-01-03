import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-kpi-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kpi-manager.component.html'
})
export class KpiManagerComponent implements OnInit {
  kpis: any[] = [];
  
  nuevoKPI = {
    nombre: '',
    unidad: '%', // Valor por defecto
    meta: 0
  };

  // Lista de unidades disponibles para el Select
  tiposUnidad = [
    { label: 'Porcentaje (%)', value: '%' },
    { label: 'Moneda / Dinero ($)', value: 'USD' },
    { label: 'Cantidad (#)', value: 'NUM' },
    { label: 'Escala (1-10)', value: 'PTS' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarKPIs();
  }

  cargarKPIs() {
    this.api.getKPIs().subscribe((data: any) => {
      this.kpis = data.results || data;
    });
  }

  guardar() {
    if (!this.nuevoKPI.nombre) return alert('Ponle un nombre al KPI');

    this.api.saveKPI(this.nuevoKPI).subscribe(() => {
      this.cargarKPIs();
      this.nuevoKPI = { nombre: '', unidad: '%', meta: 0 }; // Limpiar form
      alert('✅ KPI creado con éxito');
    });
  }

  borrar(id: number) {
    if (confirm('¿Borrar este indicador?')) {
      this.api.deleteKPI(id).subscribe(() => this.cargarKPIs());
    }
  }
}