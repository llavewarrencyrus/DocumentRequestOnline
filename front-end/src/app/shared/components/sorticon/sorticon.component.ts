import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sorticon',
  standalone: true,
  imports: [CommonModule],
  template: `
      <span *ngIf="sortOrder() === 0" class="flex flex-col">
        <i
           class="pi pi-fw pi-sort-up"
           style="font-size: 12px; margin-bottom: -5px;"
           aria-hidden="true"></i>
        <i
           class="pi pi-fw pi-sort-down"
           style="font-size: 12px" a
           ria-hidden="true"></i>
      </span>
      <span *ngIf="sortOrder() === 1" class="flex flex-col">
        <i
           class="pi pi-fw pi-sort-up-fill text-rose-600"
           style="font-size: 12px; margin-bottom: -5px;"
           aria-hidden="true"></i>
        <i
           class="pi pi-fw pi-sort-down text-rose-600"
           style="font-size: 12px"
           aria-hidden="true"></i>
      </span>
      <span *ngIf="sortOrder() === -1" class="flex flex-col">
        <i
           class="pi pi-fw pi-sort-up text-rose-600"
           style="font-size: 12px; margin-bottom: -5px;"
           aria-hidden="true"></i>
        <i
           class="pi pi-fw pi-sort-down-fill text-rose-600"
           style="font-size: 12px"
           aria-hidden="true"></i>
      </span>`,
})
export class SortIcon {
  sortOrder = input.required<number>();
}
