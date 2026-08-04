import { Component, inject, input, model, effect,computed } from '@angular/core';

import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { ReceiptInfo } from '@src/app/features/document-request/receipts/receipt.model';

import { ReceiptListComponent } from './list/receipt-list.component';

import { ReceiptService } from '@features/document-request/receipts/receipt.service';



@Component({
    selector: 'receipt-dialog',
    standalone: true,
    imports: [
        DialogModule,
        ReceiptListComponent
    ],
    templateUrl: './receipt-dialog.component.html',
})
export class ReceiptDialogComponent {
    isVisible = model.required<boolean>();
    selectedRequestReceipts = model<{ requestId: number | null, receipts: ReceiptInfo[] }>({ requestId: null, receipts: [] });
    readonly canDelete = input<boolean>(false);

    isLoading: boolean = false;

    protected receiptService = inject(ReceiptService);
    private messageService = inject(MessageService);

    private isOnlyOneReceipt = effect(() => {
        if (this.selectedRequestReceipts().receipts.length === 1) {
            this.isVisible.set(false);

            const receiptGallery = computed(() => ({
                receiptId: this.selectedRequestReceipts().receipts[0].id,
                receipts: this.selectedRequestReceipts().receipts
            }));

            this.receiptService.openReceiptGalleryDialog(receiptGallery());
        }
    })

    removeReceipt(receipt: ReceiptInfo) {
        this.receiptService.deleteReceiptById(receipt.id).subscribe({
            next: () => {

                this.receiptService.removeReceiptFromCache(this.selectedRequestReceipts().requestId!, receipt.id);
                this.selectedRequestReceipts.update(current => ({
                    ...current,
                    receipts: current.receipts.filter(receipt => receipt.id !== receipt.id)
                }));

                this.messageService.add({
                    severity: 'info',
                    summary: 'Removed',
                    detail: 'Receipt removed successfully',
                    life: 3000
                });
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Failed to remove receipt',
                    life: 5000
                });
            }
        });
    }

    closeDialog(): void {
        this.isVisible.set(false);

        setTimeout(() => {
            this.selectedRequestReceipts.set({ requestId: null, receipts: [] });
        }, 300);
    }
}