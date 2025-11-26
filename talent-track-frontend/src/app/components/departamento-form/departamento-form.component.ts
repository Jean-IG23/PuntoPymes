import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  empresaTemp: string = ''; // Solo para filtrar

  empresas: any[] = [];
  allSucursales: any[] = [];
  filteredSucursales: any[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getEmpresas().subscribe((data: any) => this.empresas = data.results || data);
    this.api.getSucursales().subscribe((data: any) => this.allSucursales = data.results || data);
  }

  onSelectEmpresa() {
    const empId = Number(this.empresaTemp);
    this.filteredSucursales = this.allSucursales.filter(s => Number(s.empresa) === empId);
  }

  guardar() {
    this.api.saveDepartamento(this.depto).subscribe(
      () => { alert('Departamento creado!'); this.router.navigate(['/empresas']); },
      (err) => alert('Error al guardar departamento.')
    );
  }
}