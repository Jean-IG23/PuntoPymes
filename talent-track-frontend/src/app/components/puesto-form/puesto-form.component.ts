import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-puesto-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './puesto-form.component.html',
  styleUrl: './puesto-form.component.css'
})
export class PuestoFormComponent implements OnInit {

  puesto: any = {
    nombre: '',
    descripcion: '',
    es_supervisor: false,
    empresa: '',
    area: null // null = Puesto Universal
  };

  areas: any[] = [];
  empresas: any[] = [];
  esCliente: boolean = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.esCliente = this.auth.isCompanyAdmin();

    if (this.esCliente) {
      // 1. SI ES CLIENTE:
      const myEmpresaId = this.auth.getEmpresaId();

      // CORRECCIÓN: Validamos que exista el ID antes de usarlo
      if (myEmpresaId) {
        this.puesto.empresa = myEmpresaId;
        this.cargarAreas(myEmpresaId);
      }

    } else {
      // 2. SI ES SUPER ADMIN:
      this.api.getEmpresas().subscribe(
        (data: any) => {
          this.empresas = data.results || data;
        },
        (error: any) => console.error('Error cargando empresas', error) // CORRECCIÓN: (error: any)
      );
    }
  }

  cargarAreas(empresaId: number) {
    if (!empresaId) return;

    this.api.getAreas(empresaId).subscribe(
      (data: any) => {
        this.areas = data.results || data;
      },
      (error: any) => console.error('Error cargando áreas', error) // CORRECCIÓN: (error: any)
    );
  }

  // Detectar cambio de empresa (Solo Super Admin)
  onEmpresaChange() {
    const id = Number(this.puesto.empresa);
    this.puesto.area = null;
    if (id) {
        this.cargarAreas(id);
    }
  }

  guardar() {
    if (!this.puesto.nombre || !this.puesto.empresa) {
      alert('Por favor completa el nombre del cargo y la empresa.');
      return;
    }

    this.api.savePuesto(this.puesto).subscribe(
      () => {
        alert('¡Cargo creado con éxito!');
        if (this.esCliente) {
            this.router.navigate(['/mi-empresa']);
        } else {
            this.router.navigate(['/empresas']);
        }
      },
      (err: any) => { // CORRECCIÓN: (err: any)
        console.error(err);
        alert('Ocurrió un error al guardar el puesto.');
      }
    );
  }
}