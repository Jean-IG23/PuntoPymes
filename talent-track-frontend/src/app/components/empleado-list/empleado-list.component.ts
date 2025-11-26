import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR ESTO
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  // INYECTAR ChangeDetectorRef AQUÍ 👇
  constructor(private api: ApiService, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getEmpleados().subscribe(
      (data: any) => {
        console.log('📦 Datos llegando:', data);
        
        // Asignar datos (soportando paginación o lista directa)
        if (data.results) {
          this.empleados = data.results;
        } else {
          this.empleados = data;
        }

        // OBLIGAR A ANGULAR A ACTUALIZAR LA PANTALLA 👇
        this.cd.detectChanges(); 
      },
      (error) => console.error('❌ ERROR:', error)
    );
  }
}