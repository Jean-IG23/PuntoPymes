import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresa-form.component.html',
  styleUrl: './empresa-form.component.css'
})
export class EmpresaFormComponent {
  empresa: any = { 
    razon_social: '',
    ruc: '', 
    pais: 'Ecuador', 
    estado: 'ACTIVO',
    admin_nombre: '',  
    admin_email: '',  
    admin_password: ''
   };

  constructor(private api: ApiService, private router: Router) {}

  guardar() {
    this.api.saveEmpresa(this.empresa).subscribe(
      () => {
        alert('Empresa creada con éxito');
        this.router.navigate(['/empresas']);
      },
      (error) => {
        // Muestra el error real en la consola
        console.error('❌ ERROR AL GUARDAR:', error);
        
        if (error.status === 401) {
            alert('Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.');
        } else if (error.status === 400) {
            alert('Datos incorrectos. Revisa que el RUC no esté repetido.');
        } else {
            alert('Error del servidor: ' + error.status);
        }
      }
    );
  }
}