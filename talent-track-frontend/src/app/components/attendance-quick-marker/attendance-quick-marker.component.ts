import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attendance-quick-marker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-quick-marker.component.html',
  styleUrl: './attendance-quick-marker.component.css'
})
export class AttendanceQuickMarkerComponent {
  isLoading = false;
  currentTime = new Date();

  constructor() {
    // Update time every second
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  markEntry(): void {
    this.isLoading = true;
    // TODO: Implement entry marking logic
    setTimeout(() => {
      this.isLoading = false;
      console.log('Entry marked at:', this.currentTime);
    }, 1000);
  }

  markExit(): void {
    this.isLoading = true;
    // TODO: Implement exit marking logic
    setTimeout(() => {
      this.isLoading = false;
      console.log('Exit marked at:', this.currentTime);
    }, 1000);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}