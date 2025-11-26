import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empresa-form.component.html',
  styleUrl: './empresa-form.component.css'
})
export class EmpresaFormComponent {
  empresa: any = { razon_social: '', ruc: '', pais: 'Ecuador', estado: 'ACTIVO' };

  constructor(private api: ApiService, private router: Router) {}

  guardar() {
    this.api.saveEmpresa(this.empresa).subscribe(
      () => { alert('Empresa creada!'); this.router.navigate(['/empresas']); },
      (err) => alert('Error al guardar empresa.')
    );
  }
}