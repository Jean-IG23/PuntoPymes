import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-kpi-score',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // 👇 CAMBIA ESTO TAMBIÉN:
  templateUrl: './kpi-score.component.html',
  styleUrl: './kpi-score.component.css'
})

export class KpiScoreComponent implements OnInit {
  empleados: any[] = [];
  kpis: any[] = [];
  
  // Datos del formulario
  evaluacion = {
    empleado: '',
    kpi: '',
    periodo: '2026-01', 
    valor_obtenido: 0
  };

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    // 1. Obtener ID de mi empresa
    const empresaId = this.auth.getEmpresaId();

    // 2. Cargar empleados de MI empresa
    this.api.getEmpleados(empresaId).subscribe(
      res => this.empleados = res.results || res
    );

    // 3. Cargar KPIs definidos
    this.api.getKPIs().subscribe(
      res => this.kpis = res.results || res
    );
  }

  guardarNota() {
    if (!this.evaluacion.empleado || !this.evaluacion.kpi) {
      alert('Debes seleccionar un empleado y un indicador.');
      return;
    }

    // Preparar datos (inyectando empresaId para seguridad extra)
    const payload = {
      ...this.evaluacion,
      empresa: this.auth.getEmpresaId()
    };

    this.api.saveResultadoKPI(payload).subscribe({
      next: () => {
        alert('✅ Evaluación guardada correctamente');
        this.evaluacion.valor_obtenido = 0; // Resetear solo la nota
      },
      error: (e) => {
        console.error(e);
        alert('Error al guardar. Revisa la consola.');
      }
    });
  }
}