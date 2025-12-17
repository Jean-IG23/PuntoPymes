import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-solicitud-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitud-admin.component.html'
})
export class SolicitudAdminComponent implements OnInit {
  solicitudes: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarPendientes();
  }

  cargarPendientes() {
    this.api.getSolicitudes().subscribe((data: any) => {
      // El backend ya filtra y muestra las de mi empresa gracias al ViewSet que hicimos en el Módulo 2
      this.solicitudes = data.results || data;
    });
  }

  gestionar(id: number, estado: 'APROBADA' | 'RECHAZADA') {
    if(!confirm(`¿Estás seguro de marcar como ${estado}?`)) return;

    // Usamos patch para actualizar solo el estado
    this.api.updateSolicitud(id, { estado: estado }).subscribe(
      () => {
        alert("Estado actualizado.");
        this.cargarPendientes();
      }
    );
  }
}