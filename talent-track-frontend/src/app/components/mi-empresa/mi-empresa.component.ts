import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mi-empresa',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mi-empresa.component.html',
  styleUrl: './mi-empresa.component.css'
})
export class MiEmpresaComponent implements OnInit {
  
  empresa: any = null;
  empresaId: number | null = null;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.empresaId = this.auth.getEmpresaId();
    
    if (this.empresaId) {
      // CORRECCIÓN: Usamos el método oficial que acabamos de crear
      this.api.getEmpresaById(this.empresaId).subscribe(
        (data) => this.empresa = data,
        (error) => console.error(error)
      );
    }
  }
}