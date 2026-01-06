import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'; // Importante
import { AuthService } from '../../../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';


@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  
  userRole: string = '';
  userName: string = '';

  constructor(private auth: AuthService) {
    const user = this.auth.getUser();
    this.userRole = this.auth.getRole(); // 'CLIENT', 'SUPERADMIN', etc.
    this.userName = user ? user.nombres : 'Usuario';
  }

  logout() {
    this.auth.logout();
  }
}