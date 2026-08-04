import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { PanelModule } from 'primeng/panel';
import { MessageModule } from 'primeng/message';

import { ClearanceService } from '@clearance/clearance.service';
import { ProgressBarModule } from "primeng/progressbar";

@Component({
  selector: 'app-public-status',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ChipModule,
    TagModule,
    TimelineModule,
    ProgressSpinnerModule,
    ButtonModule,
    ProgressBarModule,
    PanelModule,
    MessageModule,
  ],
  templateUrl: './public.page.html'
})
export class PublicPage implements OnInit {
  cashierRecord = computed(() => {
    return this.data()?.approvals?.find((a: any) => a.office.toUpperCase() === 'CASHIER');
  });

  filteredApprovals = computed(() => {
    return this.data()?.approvals?.filter((a: any) => a.office.toUpperCase() !== 'CASHIER') || [];
  });

  loading = signal(true);
  error = signal(false);
  data = signal<any>(null);

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  protected clearanceService = inject(ClearanceService);
  private location = inject(Location);


  completionPercent = computed(() => {
    const res = this.data();
    if (!res || !res.approvals?.length) return 0;
    const approved = res.approvals.filter((a: any) => a.status === 'APPROVED').length;
    return Math.round((approved / res.approvals.length) * 100);
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.fetchStatus(id);
    });
  }

  fetchStatus(id: string) {
    this.clearanceService.getPublicStatus(id)
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
  }

  getStatusCashier(): string | undefined {
    return this.data().approvals.find((a: any) => a.office === 'CASHIER')?.status;
  }

  getStatusSeverity(status: string) {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'ON_HOLD': return 'warn';
      case 'PENDING': return 'secondary';
      default: return 'info';
    }
  }

  getCashierStatus(item: any): string {
    if (item.office.toUpperCase() === 'CASHIER') {
      return item.status === 'APPROVED' ? 'Payment Verified' : 'Awaiting Payment';
    }
    return item.status;
  }

  goBack() {
    this.location.back();
  }
} 