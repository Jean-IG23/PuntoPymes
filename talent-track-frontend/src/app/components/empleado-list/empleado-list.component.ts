import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './empleado-list.component.html',
  styleUrl: './empleado-list.component.css'
})
export class EmpleadoListComponent implements OnInit {
  currentDeptoId: number | null = null; 
  empleados: any[] = [];
  tituloContexto: string = 'Directorio Global'; // Para cambiar el título dinámicamente

  constructor(
    private api: ApiService, 
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Suscribirse a los cambios de ruta para detectar filtros
    this.route.url.subscribe(segments => {
      const path = segments[0]?.path; // 'empresas', 'departamentos' o 'empleados'
      const id = Number(this.route.snapshot.paramMap.get('id'));

      if (path === 'departamentos' && id) {
        this.tituloContexto = 'Personal del Departamento';
        this.currentDeptoId = id; // 
        this.cargarDatos(undefined, id);
      } else if (path === 'empresas' && id) {
        this.tituloContexto = 'Personal de la Empresa';
        this.cargarDatos(id, undefined); // Filtro por Empresa
      } else {
        this.tituloContexto = 'Directorio Global';
        this.cargarDatos(); // Todos
      }
    });
  }

  cargarDatos(empresaId?: number, deptoId?: number) {
    this.api.getEmpleados(empresaId, deptoId).subscribe(
      (data: any) => {
        console.log('👥 Empleados cargados:', data);
        this.empleados = data.results ? data.results : data;
        this.cd.detectChanges();
      },
      (error) => console.error(error)
    );
  }
}