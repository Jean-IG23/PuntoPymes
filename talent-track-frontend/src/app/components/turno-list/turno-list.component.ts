import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-turno-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './turno-list.component.html'
})
export class TurnoListComponent implements OnInit {
  turnos: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarTurnos();
  }

  cargarTurnos() {
    this.api.getTurnos().subscribe(data => this.turnos = data.results || data);
  }

  borrar(id: number) {
    if(confirm('¿Estás seguro de eliminar este horario?')) {
      this.api.deleteTurno(id).subscribe(() => this.cargarTurnos());
    }
  }
}