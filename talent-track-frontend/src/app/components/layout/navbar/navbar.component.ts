import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  
  user: any = null;
  mobileMenuOpen = false;
  userDropdownOpen = false;
  notificationCount = 0;

  constructor(
    public auth: AuthService,
    private router: Router
  ) {} 

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadNotifications();
  }

  toggleUserDropdown() {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  closeUserDropdown() {
    this.userDropdownOpen = false;
  }

  goToProfile() {
    this.router.navigate(['/mi-perfil']);
    this.closeUserDropdown();
  }

  goToHome() {
    this.router.navigate(['/dashboard']);
    this.closeMobileMenu();
  }

  loadNotifications() {
    // TODO: Integrar con servicio de notificaciones cuando esté disponible
    this.notificationCount = 0;
  }

  logout() {
    this.auth.logout();
  }
}