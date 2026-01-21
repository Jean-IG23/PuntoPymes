import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-nomina',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nomina.component.html'
})
export class NominaComponent implements OnInit {
  fechaInicio: string = '';
  fechaFin: string = '';
  datos: any[] = [];
  loading = false;
  moneda = 'USD';
  
  totalPagina = 0;

  constructor(private api: ApiService) {
    const date = new Date();
    this.fechaInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    this.fechaFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  ngOnInit() {
    this.calcular();
  }

  calcular() {
    this.loading = true;
    this.api.getCalculoNomina(this.fechaInicio, this.fechaFin).subscribe({
      next: (res: any) => {
        this.datos = res.datos;
        if(this.datos.length > 0) this.moneda = this.datos[0].moneda;
        
        // Sumar total de la nómina
        this.totalPagina = this.datos.reduce((acc, curr) => acc + curr.total_a_pagar, 0);
        
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}