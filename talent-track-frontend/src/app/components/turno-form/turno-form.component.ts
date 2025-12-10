import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turno-form.component.html',
  styleUrl: './turno-form.component.css'
})
export class TurnoFormComponent implements OnInit {
  
  turno: any = { 
    nombre: '', 
    hora_entrada: '08:00', 
    hora_salida: '17:00', 
    minutos_descanso: 60, 
    min_tolerancia: 10, 
    empresa: '' 
  };
  
  empresas: any[] = [];
  horasCalculadas: number = 8; 

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getEmpresas().subscribe(
        (data: any) => this.empresas = data.results || data
    );
    this.calcularHoras();
  }

  calcularHoras() {
    // Cálculo visual simple
    const inicio = parseInt(this.turno.hora_entrada.split(':')[0]);
    const fin = parseInt(this.turno.hora_salida.split(':')[0]);
    const descansoHoras = this.turno.minutos_descanso / 60;
    
    // Si el turno cruza la medianoche o cálculo básico
    let total = fin - inicio;
    if (total < 0) total += 24; // Ajuste si termina al día siguiente
    
    this.horasCalculadas = total - descansoHoras;
  }

  guardar() {
    if (!this.turno.nombre || !this.turno.empresa) {
        alert("Completa los campos obligatorios");
        return;
    }
    this.api.saveTurno(this.turno).subscribe(
      () => { 
          alert('Turno creado!'); 
          this.router.navigate(['/empresas']); 
      },
      (err: any) => alert('Error al guardar turno.')
    );
  }
}