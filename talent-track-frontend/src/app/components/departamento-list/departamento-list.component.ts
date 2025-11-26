import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-departamento-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './departamento-list.component.html',
  styleUrl: './departamento-list.component.css'
})
export class DepartamentoListComponent implements OnInit {
  departamentos: any[] = [];
  sucursalId: number = 0;

  constructor(private api: ApiService, private route: ActivatedRoute, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.sucursalId = Number(params.get('id'));
      this.cargarDeptos();
    });
  }

  cargarDeptos() {
    this.api.getDepartamentos(this.sucursalId).subscribe((data: any) => {
      this.departamentos = data.results ? data.results : data;
      this.cd.detectChanges();
    });
  }
}