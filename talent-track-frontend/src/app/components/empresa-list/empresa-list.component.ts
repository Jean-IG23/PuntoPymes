import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- 1. ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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
    private cd: ChangeDetectorRef // <--- 2. Inyectarlo
  ) {}

  ngOnInit() {
    this.cargarEmpresas();
  }

  cargarEmpresas() {
    this.api.getEmpresas().subscribe(
      (data: any) => {
        console.log('🏢 Datos de Empresas recibidos:', data); // <--- 3. Espiar los datos

        // Lógica inteligente para paginación
        if (data.results) {
          this.empresas = data.results;
        } else {
          this.empresas = data;
        }

        console.log('✅ Lista final:', this.empresas);
        
        // Forzar a Angular a pintar la pantalla
        this.cd.detectChanges();
      },
      (error) => console.error('❌ Error cargando empresas:', error)
    );
  }
}