import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR ESTO
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; // Importar ActivatedRoute
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './empleado-list.component.html',
  styleUrl: './empleado-list.component.css'
})
export class EmpleadoListComponent implements OnInit {
  empleados: any[] = [];
  empresaId: number | null = null;
  // INYECTAR ChangeDetectorRef AQUÍ 👇
  constructor(
    private api: ApiService, 
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Leemos el ID de la URL
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.empresaId = Number(id);
        this.cargarDatos(this.empresaId);
      } else {
        // Si no hay ID, cargamos todos (modo super admin global)
        this.cargarDatos(); 
      }
    });
  }

  cargarDatos(empresaId?: number) {
    this.api.getEmpleados(empresaId).subscribe(
      (data: any) => {
        this.empleados = data.results || data;
        this.cd.detectChanges();
      }
    );
  }
}