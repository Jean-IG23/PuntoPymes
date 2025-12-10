import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarEmpresas();
  }

  cargarEmpresas() {
    this.api.getEmpresas().subscribe(
      (data: any) => {
        console.log('🏢 Empresas recibidas:', data);

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
        console.error('❌ Error al cargar empresas:', error);
      }
    );
  }
}