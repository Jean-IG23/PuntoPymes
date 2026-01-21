import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking.component.html'
})
export class RankingComponent implements OnInit {
  top3: any[] = [];
  resto: any[] = [];
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarRanking();
  }

  cargarRanking() {
    this.api.getRanking().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res.results;
        
        // Separamos a los ganadores del resto
        this.top3 = data.slice(0, 3);
        this.resto = data.slice(3);
        
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}