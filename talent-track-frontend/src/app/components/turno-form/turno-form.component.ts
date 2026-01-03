import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './turno-form.component.html'
})
export class TurnoFormComponent {
  
  // CORRECCIÓN 1: Usamos ': any' aquí
  turno: any = {
    nombre: '',
    hora_entrada: '08:00',
    hora_salida: '17:00',
    tolerancia_minutos: 10,
    empresa: null
  };

  constructor(private api: ApiService, private router: Router, private auth: AuthService) {
    // CORRECCIÓN 2: Asegúrate de haber agregado getEmpresaId en auth.service.ts
    const empresaId = this.auth.getEmpresaId();
    
    if (empresaId) {
        this.turno.empresa = empresaId;
    }
  }

  guardar() {
    this.api.saveTurno(this.turno).subscribe({
      next: () => {
        alert('✅ Horario creado correctamente');
        this.router.navigate(['/turnos']);
      },
      error: (e) => {
        console.error(e);
        alert('Error al guardar. Revisa los datos.');
      }
    });
  }
}