import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-objetivos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './objetivos-list.component.html',
  styleUrl: './objetivos-list.component.css'
})
export class ObjetivosListComponent implements OnInit {
  
  objetivos: any[] = [];
  objetivosFiltrados: any[] = [];
  loading = true;
  error = '';
  empleadoId: number | null = null;
  
  // Filtros
  filtroEstado = '';
  filtroOrden = 'fecha_limite';
  busqueda = '';

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

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
    this.loading = true;
    this.error = '';
    this.api.getObjetivos(this.empleadoId!).subscribe({
      next: (res: any) => {
        this.objetivos = res.results || res || [];
        this.aplicarFiltros();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error(e);
        this.error = 'Error al cargar objetivos. Por favor intenta nuevamente.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let resultado = [...this.objetivos];

    if (this.filtroEstado) {
      resultado = resultado.filter(obj => obj.estado === this.filtroEstado);
    }

    if (this.busqueda) {
      const termino = this.busqueda.toLowerCase();
      resultado = resultado.filter(obj => 
        obj.titulo.toLowerCase().includes(termino) ||
        (obj.descripcion && obj.descripcion.toLowerCase().includes(termino))
      );
    }

    resultado.sort((a, b) => {
      switch(this.filtroOrden) {
        case 'fecha_limite':
          return new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime();
        case 'prioridad':
          const prioridades: any = { ALTA: 3, MEDIA: 2, BAJA: 1 };
          return (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
        case 'progreso':
          return this.getAvance(b) - this.getAvance(a);
        default:
          return 0;
      }
    });

    this.objetivosFiltrados = resultado;
  }

  getAvance(obj: any): number {
    if (!obj.meta_numerica || obj.meta_numerica <= 0) return 0;
    const porcentaje = (obj.avance_actual / obj.meta_numerica) * 100;
    return Math.min(100, Math.round(porcentaje));
  }

  getEstadoColor(estado: string): string {
    switch(estado) {
      case 'PENDIENTE': return 'bg-blue-50 border-blue-200';
      case 'EN_PROGRESO': return 'bg-yellow-50 border-yellow-200';
      case 'COMPLETADO': return 'bg-green-50 border-green-200';
      case 'CANCELADO': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getPrioridadIcon(prioridad: string): string {
    switch(prioridad) {
      case 'ALTA': return '🔴';
      case 'MEDIA': return '🟡';
      case 'BAJA': return '🟢';
      default: return '⚪';
    }
  }

  eliminarObjetivo(id: number) {
    Swal.fire({
      title: '¿Eliminar Objetivo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.deleteObjetivo(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El objetivo ha sido eliminado.', 'success');
            this.cargarObjetivos();
          },
          error: (e) => {
            console.error(e);
            Swal.fire('Error', 'No se pudo eliminar el objetivo.', 'error');
          }
        });
      }
    });
  }

  cambiarEstado(obj: any, nuevoEstado: string) {
    obj.estado = nuevoEstado;
    this.api.saveObjetivo(obj).subscribe({
      next: () => {
        Swal.fire('Éxito', `Estado actualizado a ${nuevoEstado}`, 'success');
        this.aplicarFiltros();
      },
      error: (e) => {
        console.error(e);
        Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
        this.cargarObjetivos();
      }
    });
  }

  refrescar() {
    this.cargarObjetivos();
  }
}