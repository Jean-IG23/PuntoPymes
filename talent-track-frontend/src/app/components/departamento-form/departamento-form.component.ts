import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-departamento-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './departamento-form.component.html',
  styleUrl: './departamento-form.component.css'
})
export class DepartamentoFormComponent implements OnInit {
  depto: any = { nombre: '', sucursal: '' };
  
  // Filtros
  empresaTemp: any = '';
  empresas: any[] = [];
  allSucursales: any[] = [];
  filteredSucursales: any[] = [];
  
  sucursalPreseleccionada: boolean = false; // Contexto

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    // Cargar catálogos
    this.api.getEmpresas().subscribe((data: any) => this.empresas = data.results || data);
    this.api.getSucursales().subscribe((data: any) => {
        this.allSucursales = data.results || data;
        this.checkContexto(); // Verificar URL después de cargar
    });
  }

  checkContexto() {
    // URL: /sucursales/:id/departamentos/nuevo
    const urlSegments = this.router.url.split('/');
    const sucIndex = urlSegments.indexOf('sucursales');
    
    if (sucIndex !== -1 && urlSegments[sucIndex + 1]) {
      const sucId = Number(urlSegments[sucIndex + 1]);
      if (!isNaN(sucId)) {
        this.depto.sucursal = sucId;
        this.sucursalPreseleccionada = true;
        
        // Truco visual: Encontrar a qué empresa pertenece esa sucursal para llenar el campo 1
        const sucEncontrada = this.allSucursales.find(s => s.id === sucId);
        if (sucEncontrada) {
            this.empresaTemp = sucEncontrada.empresa;
            this.onSelectEmpresa(); // Filtrar la lista
        }
      }
    }
  }

  onSelectEmpresa() {
    const empId = Number(this.empresaTemp);
    this.filteredSucursales = this.allSucursales.filter(s => Number(s.empresa) === empId);
  }

  guardar() {
    this.api.saveDepartamento(this.depto).subscribe(
      () => {
        alert('Departamento creado!');
        // Volver al contexto
        if (this.sucursalPreseleccionada) {
            this.router.navigate(['/sucursales', this.depto.sucursal, 'departamentos']);
        } else {
            this.router.navigate(['/empresas']);
        }
      },
      (error) => alert('Error al guardar departamento')
    );
  }
}