import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  // CORRECCIÓN: Agregar .component al nombre del archivo
  templateUrl: './dashboard.component.html', 
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // ... (el resto de tu lógica está bien)
  stats: any = {
    total_empleados: 0,
    total_empresas: 0,
    total_sucursales: 0,
    total_departamentos: 0
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStats().subscribe(
      (data) => {
        this.stats = data;
      },
      (error) => console.error(error)
    );
  }
}