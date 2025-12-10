import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  isSuperAdmin: boolean = false;
  constructor(public auth: AuthService) {
        this.isSuperAdmin = this.auth.isSuperAdmin();

  } // Inyectar servicio
  logout() {
    this.auth.logout(); // Llamar a la función de salir
  }
}