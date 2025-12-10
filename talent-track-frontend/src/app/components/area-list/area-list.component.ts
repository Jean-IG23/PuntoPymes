import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-area-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './area-list.component.html',
  styleUrl: './area-list.component.css'
})
export class AreaListComponent implements OnInit {
  areas: any[] = [];
  loading: boolean = true;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    const empresaId = this.auth.getEmpresaId();
    if (empresaId) {
      this.api.getAreas(empresaId).subscribe(
        (data: any) => {
          this.areas = data.results || data;
          this.loading = false;
        },
        (error) => console.error(error)
      );
    }
  }
}