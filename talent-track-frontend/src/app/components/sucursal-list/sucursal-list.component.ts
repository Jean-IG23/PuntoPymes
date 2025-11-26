import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sucursal-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sucursal-list.component.html',
  styleUrl: './sucursal-list.component.css'
})
export class SucursalListComponent implements OnInit {
  sucursales: any[] = [];
  empresaId: number = 0;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.empresaId = Number(params.get('id'));
      this.cargarSucursales();
    });
  }

  cargarSucursales() {
    this.api.getSucursales(this.empresaId).subscribe((data: any) => {
      console.log('📍 Sucursales:', data);
      // CORRECCIÓN DE LISTA VACÍA:
      this.sucursales = data.results ? data.results : data;
      this.cd.detectChanges();
    });
  }
}