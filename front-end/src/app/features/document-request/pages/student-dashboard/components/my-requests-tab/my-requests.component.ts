import { Component, input, computed, signal, model } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ButtonModule } from "primeng/button";

import { SelectButton } from "primeng/selectbutton";

import { DocumentRequest } from "@src/app/features/document-request/request.model";

import { RequestsTableComponent } from "./table/requests-table.component";


@Component({
  selector: 'my-requests-tab',
  standalone: true,
  imports: [
    RequestsTableComponent,
    FormsModule,
    SelectButton,
    ButtonModule,
  ],
  templateUrl: './my-requests.component.html'
})
export class MyRequestsTabComponent {
  readonly studentId = input<string>('');
  readonly highlight = input<boolean>(false);
  readonly requestId = input<number>(0);
  readonly requests = input<DocumentRequest[]>([]);
  selectedStatusFilter = model<string>('active');

  callbacks = input<Record<string, () => void>>({});

  // Data
  filteredRequests = computed<DocumentRequest[]>(() => {
    const data = this.requests();
    const status = this.selectedStatusFilter();

    if (status === 'active') {
      return data.filter(r => ['Pending', 'Approved', 'Processing', 'Available for Claiming', 'UNDER_REVIEW', 'ACTION_REQUIRED'].includes(r.status));
    }
    return data.filter(r => r.status.toLowerCase() === status.toLowerCase());
  });
  //Filter
  statusFilterOptions: any[] = [
    { label: 'Active', value: 'active', icon: 'pi pi-spinner' },
    { label: 'Declined', value: 'declined', icon: 'pi pi-times-circle' },
    { label: 'Completed', value: 'completed', icon: 'pi pi-check-circle' }
  ];

  loading: boolean = false;

  // ========== FILTER METHODS ==========

  onCallback(view: string) {
    const callback = this.callbacks()[view];
    if (callback) {
      callback();
    }
  }

  changeFilter(event: any) {
    this.selectedStatusFilter.set(event.value);
  }

  highlightRequest(requestId: number): void {
    // Find and scroll to the request row/card
    const element = document.getElementById(`request-${requestId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-request');

      // Remove highlight after animation
      setTimeout(() => {
        element.classList.remove('highlight-request');
      }, 3000);
    }
  }

}