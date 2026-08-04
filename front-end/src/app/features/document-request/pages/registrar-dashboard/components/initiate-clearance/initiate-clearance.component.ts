import { Component, computed, input, model } from '@angular/core';
import { CardModule } from "primeng/card";

@Component({
  selector: 'app-iniate-clearance',
  standalone: true,
  imports: [
    CardModule
  ],
  templateUrl: 'initiate-clearance.component.html'
})
export class InitiateClearanceComponent {
  selectedCategory = model<'REGULAR' | 'NEWLY_GRADUATE' | 'TRANSFER'>('REGULAR');
  onSelectCategory = input<(type: string) => void>();

  onTypeSelected(type: 'REGULAR' | 'NEWLY_GRADUATE' | 'TRANSFER') {
    this.selectedCategory.set(type);

    const callback = this.onSelectCategory();
    if (callback) {
      callback(type);
    }
  }
}