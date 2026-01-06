import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  
  user: any = null;
  mobileMenuOpen = false;

  // Inyectamos AuthService como 'public' para usarlo en el HTML
  constructor(public auth: AuthService) {} 

  ngOnInit() {
    this.user = this.auth.getUser();
  }
}