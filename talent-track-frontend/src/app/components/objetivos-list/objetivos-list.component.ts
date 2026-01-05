import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-objetivos-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './objetivos-list.component.html',
  styleUrl: './objetivos-list.component.css'
})
export class ObjetivosListComponent implements OnInit {
  
  objetivos: any[] = [];
  loading = true;
  error = '';
  empleadoId: number | null = null;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    // Obtenemos el ID del usuario actual para filtrar
    const user = this.auth.getUser();
    if (user) {
      this.empleadoId = user.id;
      this.cargarObjetivos();
    } else {
      this.error = 'No se pudo identificar al empleado.';
      this.loading = false;
    }
  }

  cargarObjetivos() {
    this.api.getObjetivos(this.empleadoId!).subscribe({
      next: (res: any) => {
        // DRF a veces devuelve { count: 5, results: [...] } o directo [...]
        this.objetivos = res.results || res;
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.error = 'Error al cargar objetivos.';
        this.loading = false;
      }
    });
  }

  // Método para calcular porcentaje de avance (Estético)
  getAvance(obj: any): number {
    if (obj.meta_numerica <= 0) return 0;
    const porcentaje = (obj.avance_actual / obj.meta_numerica) * 100;
    return Math.min(100, Math.round(porcentaje));
  }
}