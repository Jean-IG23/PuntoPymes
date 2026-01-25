import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './empresa-list.component.html',
  styleUrl: './empresa-list.component.css'
})
export class EmpresaListComponent implements OnInit {
  
  empresas: any[] = [];

  constructor(
    private api: ApiService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarEmpresas();
  }

  cargarEmpresas() {
    this.api.getEmpresas().subscribe(
      (data: any) => {
        console.log('Empresas recibidas:', data);

        // Lógica para detectar si Django envía paginación (results) o lista plana
        if (data.results) {
          this.empresas = data.results;
        } else {
          this.empresas = data;
        }

        // Forzar actualización visual por si acaso
        this.cd.detectChanges();
      },
      (error) => {
        console.error('Error al cargar empresas:', error);
      }
    );
  }

  toggleEstado(empresa: any) {
    Swal.fire({
      title: '¿Cambiar estado?',
      text: `¿Estás seguro de que deseas ${empresa.estado ? 'desactivar' : 'activar'} la empresa "${empresa.nombre_comercial || empresa.razon_social}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: empresa.estado ? '#dc2626' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: empresa.estado ? 'Desactivar' : 'Activar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.toggleEstadoEmpresa(empresa.id).subscribe({
          next: (res: any) => {
            empresa.estado = res.estado;
            const msg = res.estado ? 'activada' : 'desactivada';
            Swal.fire({
              title: 'Listo',
              text: `Empresa ${msg} correctamente`,
              icon: 'success',
              timer: 2000
            });
            this.cd.detectChanges();
          },
          error: (e) => {
            console.error(e);
            const errorMsg = e.error?.error || 'No se pudo cambiar el estado de la empresa';
            Swal.fire('Error', errorMsg, 'error');
          }
        });
      }
    });
  }
}