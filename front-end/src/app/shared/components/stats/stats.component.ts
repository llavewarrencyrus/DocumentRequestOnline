import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatItem {
  title: string;
  value: number | string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
})
export class StatsComponent {
  stats = input.required<StatItem[]>();

  getGridCols(): string {
    const statsCount = this.stats().length;
    // Minimum 4 columns, adjust based on stats count
    if (statsCount <= 4) {
      return 'lg:grid-cols-4';
    } else {
      return `lg:grid-cols-${statsCount}`;
    }
  }
}
