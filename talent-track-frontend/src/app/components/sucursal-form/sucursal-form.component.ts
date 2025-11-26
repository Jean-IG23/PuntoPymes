import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sucursal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sucursal-form.component.html',
  styleUrl: './sucursal-form.component.css'
})
export class SucursalFormComponent implements OnInit {
  sucursal: any = { nombre: '', direccion: '', latitud: 0, longitud: 0, empresa: '' };
  empresas: any[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getEmpresas().subscribe((data: any) => this.empresas = data.results || data);
  }

  guardar() {
    this.api.saveSucursal(this.sucursal).subscribe(
      () => { alert('Sucursal creada!'); this.router.navigate(['/empresas']); }, // O volver a donde quieras
      (err) => alert('Error al guardar sucursal.')
    );
  }
}