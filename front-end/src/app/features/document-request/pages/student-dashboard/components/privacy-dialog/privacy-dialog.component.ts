import { Component, input, output, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'privacy-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule
  ],
  templateUrl: './privacy-dialog.component.html'
})
export class PrivacyDialogComponent implements AfterViewInit, OnDestroy {
  visible = input.required<boolean>();
  visibleChange = output<boolean>();
  confirm = output<void>();
  cancel = output<void>();

  @ViewChild('actionBox', { static: true }) actionBox!: ElementRef<HTMLDivElement>;

  canConfirm = false;
  isConfirming = false;
  private intersectionObserver?: IntersectionObserver;

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.canConfirm = true;
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '0px'
      }
    );

    if (this.actionBox) {
      this.intersectionObserver.observe(this.actionBox.nativeElement);
    }
  }

  onConfirm(): void {
    this.isConfirming = true;
    this.confirm.emit();
  }

  onCancel(): void {
    this.visibleChange.emit(false);
    this.cancel.emit();
    this.canConfirm = false;
    this.isConfirming = false;
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}