import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-perfil',
  standalone: true,
  templateUrl: './perfil.component.html',
})
export class PerfilComponent {
  user = signal({
    name: 'John Doe',
    email: 'john@talenttrack.com',
    avatar: '/assets/avatar.png',
    position: 'Líder de Proyecto',
    department: 'Tecnología'
  });
}
