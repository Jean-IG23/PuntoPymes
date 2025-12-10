import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service'; // <--- Importar Auth

@Component({
  selector: 'app-sucursal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sucursal-form.component.html',
  styleUrl: './sucursal-form.component.css'
})
export class SucursalFormComponent implements OnInit {
  sucursal: any = { 
    nombre: '', direccion: '', empresa: '', tipo: 'SEDE', 
    latitud: -3.99313, longitud: -79.20422, radio_metros: 50 
  };
  
  empresas: any[] = [];
  empresaPreseleccionada: boolean = false;
  esCliente: boolean = false; // <--- Bandera para saber si es cliente

  constructor(
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService // <--- Inyectar Auth
  ) {}

  ngOnInit() {
    // 1. Verificar Rol
    this.esCliente = this.auth.isCompanyAdmin();

    if (this.esCliente) {
      // SI ES CLIENTE: Asignar su empresa automáticamente y bloquear
      const miEmpresaId = this.auth.getEmpresaId();
      if (miEmpresaId) {
        this.sucursal.empresa = miEmpresaId;
        this.empresaPreseleccionada = true;
        // Cargamos solo su empresa para que el select no quede vacío visualmente
        this.api.getEmpresaById(miEmpresaId).subscribe(data => {
          this.empresas = [data]; 
        });
      }
    } else {
      // SI ES SUPER ADMIN: Cargar todas las empresas
      this.api.getEmpresas().subscribe((data: any) => {
        this.empresas = data.results || data;
        this.verificarContextoURL(); // Solo verificamos URL si es super admin navegando
      });
    }
  }

  verificarContextoURL() {
    const urlSegments = this.router.url.split('/');
    const empresaIndex = urlSegments.indexOf('empresas');
    if (empresaIndex !== -1 && urlSegments[empresaIndex + 1]) {
      const id = Number(urlSegments[empresaIndex + 1]);
      if (!isNaN(id)) {
        this.sucursal.empresa = id;
        this.empresaPreseleccionada = true;
      }
    }
  }

  guardar() {
    if (!this.sucursal.nombre || !this.sucursal.direccion || !this.sucursal.empresa) {
        alert('Por favor completa todos los campos obligatorios.');
        return;
    }

    this.api.saveSucursal(this.sucursal).subscribe(
      () => {
        alert('¡Sucursal creada con éxito!');
        // Redirección inteligente
        if (this.esCliente) {
            this.router.navigate(['/mi-empresa']);
        } else {
            this.router.navigate(['/empresas', this.sucursal.empresa, 'sucursales']);
        }
      },
      (error) => {
        console.error('Error:', error);
        alert('Error al guardar. Revisa la consola.');
      }
    );
  }
}