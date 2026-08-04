import { Component, input, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ClearanceLog } from '@clearance/clearance.model';
import { ClearanceService } from '@clearance/clearance.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'clearance-logs-viewer',
  standalone: true,
  imports: [
    CommonModule,
    TimelineModule,
    TagModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './clearance-logs-viewer.component.html',
  styleUrls: ['./clearance-logs-viewer.component.css']
})
export class ClearanceLogsViewerComponent implements OnInit {
  clearanceId = input.required<number>();

  logs = signal<ClearanceLog[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string>('');

  toolTip: string = '';

  private clearanceService = inject(ClearanceService);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.clearanceService.getClearanceLogs(this.clearanceId()).subscribe({
      next: (logs) => {
        this.logs.set(logs);
        console.log('logs: ', this.logs());
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading clearance logs:', err);
        this.error.set('Failed to load logs. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  getActionDisplay(action: string): string {
    return this.clearanceService.getActionDisplay(action);
  }

  getActionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return this.clearanceService.getActionSeverity(action);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimelineEvents(): any[] {
    return this.logs().map(log => ({
      status: this.getActionDisplay(log.action),
      date: this.formatDate(log.date),
      icon: this.getIconForAction(log.action),
      iconBg: this.getIconBgClass(log.action),
      severity: this.getActionSeverity(log.action),
      user: log.userId,
      metadata: log.metadata,
    }));
  }

  getIconForAction(action: string): string {
    if (action.includes('APPROVED')) return 'pi pi-check';
    if (action.includes('SIGNED')) return 'pi pi-pencil';
    if (action.includes('ON_HOLD')) return 'pi pi-pause';
    if (action.includes('COMPLETED')) return 'pi pi-check-circle';
    if (action.includes('CREATED')) return 'pi pi-plus';
    return 'pi pi-info-circle';
  }

  getIconBgClass(action: string): string {
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'bg-emerald-500';
    if (action.includes('ON_HOLD')) return 'bg-rose-500';
    if (action.includes('SIGNED')) return 'bg-blue-500';
    if (action.includes('CREATED')) return 'bg-slate-500';
    return 'bg-slate-400';
  }

  copyValue(value: string) {
    navigator.clipboard.writeText(value);
    this.toolTip = 'Copied!';

    setTimeout(() => {
      this.toolTip = '';
    }, 3000);
  }
}
