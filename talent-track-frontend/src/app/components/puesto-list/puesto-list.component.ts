import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Para el botón de "Nuevo"
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
  error: string = '';

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarPuestos();
  }

  cargarPuestos() {
    this.loading = true;
    
    // 1. Obtenemos el ID de la empresa del usuario logueado
    const empresaId = this.auth.getEmpresaId();

    // 2. Si por alguna razón es 0 o null (ej. SuperAdmin sin filtrar), manejamos el caso
    //    Pero para tu caso de uso normal, enviaremos ese ID.
    
    this.api.getPuestos(undefined, empresaId).subscribe({
      next: (data: any) => {
        // El backend puede devolver un array directo o un objeto con "results"
        this.puestos = data.results || data;
        this.loading = false;
        console.log('✅ Puestos cargados:', this.puestos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar puestos:', err);
        this.error = 'No se pudieron cargar los cargos.';
        this.loading = false;
      }
    });
  }
}