import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-area-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './area-form.component.html',
  styleUrl: './area-form.component.css'
})
export class AreaFormComponent implements OnInit {
  area: any = { nombre: '', descripcion: '', empresa: '' };

  constructor(
    private api: ApiService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Asignar automáticamente la empresa del cliente
    if (this.auth.isCompanyAdmin()) {
      this.area.empresa = this.auth.getEmpresaId();
    }
  }

  guardar() {
    if (!this.area.nombre) {
      alert('El nombre del área es obligatorio.');
      return;
    }

    this.api.saveArea(this.area).subscribe(
      () => {
        alert('¡Área creada!');
        this.router.navigate(['/areas']);
      },
      (error: any) => {
        console.error(error);
        alert('Error al guardar. Es posible que el nombre ya exista.');
      }
    );
  }
}