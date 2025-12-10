import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-puesto-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './puesto-list.component.html',
  styleUrl: './puesto-list.component.css'
})
export class PuestoListComponent implements OnInit {
  puestos: any[] = [];
  loading: boolean = true;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.cargarPuestos();
  }

  cargarPuestos() {
    const empresaId = this.auth.getEmpresaId();

    // SOLUCIÓN AL ERROR DE TIPO:
    // Convertimos 'null' a 'undefined' usando el operador ??
    // Si empresaId es null, la variable idParaEnviar será undefined.
    const idParaEnviar = empresaId ?? undefined;

    this.api.getPuestos(undefined, idParaEnviar).subscribe(
      (data: any) => {
        this.puestos = data.results || data;
        this.loading = false;
        console.log("Puestos cargados:", this.puestos);
      },
      (error: any) => {
        console.error('Error cargando puestos:', error);
        this.loading = false;
      }
    );
  }
}