import { Component, inject, computed, effect } from "@angular/core";

import { DialogModule } from "primeng/dialog";
import { MessageService } from "primeng/api";
import { Button, ButtonModule } from "primeng/button";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { PdfViewerModule } from "ng2-pdf-viewer";

import Panzoom from '@panzoom/panzoom';

import { ReceiptService } from "@features/document-request/receipts/receipt.service";


@Component({
    selector: 'receipt-gallery',
    standalone: true,
    imports: [
        DialogModule,
        ButtonModule,
        ProgressSpinnerModule,
        PdfViewerModule
    ],
    templateUrl: './receipt-gallery.component.html',
    styleUrls: ['./receipt-gallery.component.css']
})
export class ReceiptGalleryComponent {
    protected selectedReceiptUrl: string | null = null;
    protected selectedReceiptType: string | null = null;
    protected selectedReceiptName: string | null = null;

    protected currentReceiptIndex: number = 0;
    protected panZoomInstance: any;
    private wheelHandler: ((event: WheelEvent) => void) | null = null;

    private messageService = inject(MessageService);
    protected receiptService = inject(ReceiptService);

    protected selectedRequestForReceipt = computed(() => {
        return this.receiptService.displayReceiptGallery().gallery;
    });

    private loadReceiptGallery = effect(() => {
        const request = this.selectedRequestForReceipt();
        if (!request) return;

        const id = request.receiptId;

        if (id) {
            const index = request.receipts.findIndex(receipt => receipt.id === id);
            if (index !== -1) {
                this.currentReceiptIndex = index;
                this.loadCurrentReceipt();
            }
        }
    });

    private loadCurrentReceipt(): void {
        const receipt = this.selectedRequestForReceipt()!.receipts[this.currentReceiptIndex];

        // Clean up previous Panzoom instance
        if (this.panZoomInstance) {
            const wrapper = document.getElementById('panzoom-parent');
            if (wrapper && this.wheelHandler) {
                wrapper.removeEventListener('wheel', this.wheelHandler);
                this.wheelHandler = null;
            }
            this.panZoomInstance.destroy();
            this.panZoomInstance = null;
        }

        // Revoke previous URL
        if (this.selectedReceiptUrl) {
            window.URL.revokeObjectURL(this.selectedReceiptUrl);
        }

        // Load new receipt
        this.receiptService.viewReceiptById(receipt.id).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                this.selectedReceiptUrl = url;
                this.selectedReceiptType = blob.type;
                this.selectedReceiptName = receipt.fileName;

                console.log(blob.type);
                if (blob.type.startsWith('image/')) {
                    setTimeout(() => {
                        const element = document.getElementById('receipt-image') as HTMLImageElement;
                        const wrapper = document.getElementById('panzoom-parent');

                        if (element && wrapper) {
                            if (element.complete) {
                                this.initPanzoom(element, wrapper);
                            } else {
                                element.onload = () => this.initPanzoom(element, wrapper);
                            }
                        }
                    }, 500);
                }
            },
            error: (error) => {
                console.error('Error loading receipt:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load receipt',
                    life: 3000
                });
            }
        });
    }

    previousReceipt(): void {
        if (this.currentReceiptIndex > 0) {
            this.currentReceiptIndex--;
            this.loadCurrentReceipt();
        }
    }

    nextReceipt(): void {
        if (this.currentReceiptIndex < this.selectedRequestForReceipt()!.receipts.length - 1) {
            this.currentReceiptIndex++;
            this.loadCurrentReceipt();
        }
    }


    private initPanzoom(element: HTMLElement, wrapper: HTMLElement): void {
        this.panZoomInstance = Panzoom(element, {
            maxScale: 5,
            minScale: 0.5,
            canvas: true,
            startScale: 1,
            startX: 0,
            startY: 0,
        });

        if (this.wheelHandler) {
            wrapper.removeEventListener('wheel', this.wheelHandler);
        }

        const panzoom = this.panZoomInstance;

        this.wheelHandler = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();

            panzoom.zoomWithWheel(event);
        };

        wrapper.addEventListener('wheel', this.wheelHandler, { passive: false });
    }

    downloadReceiptById(receiptId: number, fileName: string): void {
        this.receiptService.downloadReceiptById(receiptId).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                this.messageService.add({
                    severity: 'success',
                    summary: 'Download Started',
                    detail: 'Receipt download has started',
                    life: 2000
                });
            },
            error: (error) => {
                console.error('Error downloading receipt:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to download receipt',
                    life: 3000
                });
            }
        });
    }

    downloadCurrentReceipt(): void {
        if (this.currentReceiptIndex >= 0 && this.currentReceiptIndex < this.selectedRequestForReceipt()!.receipts.length) {
            const receipt = this.selectedRequestForReceipt()!.receipts[this.currentReceiptIndex];
            this.downloadReceiptById(receipt.id, receipt.fileName);
        }
    }

    closeReceiptViewer(): void {
        if (this.panZoomInstance) {
            const wrapper = document.getElementById('panzoom-parent');
            if (wrapper && this.wheelHandler) {
                wrapper.removeEventListener('wheel', this.wheelHandler);
                this.wheelHandler = null;
            }
            this.panZoomInstance.destroy();
            this.panZoomInstance = null;
        }
        if (this.selectedReceiptUrl) {
            window.URL.revokeObjectURL(this.selectedReceiptUrl);
        }
        this.selectedReceiptUrl = null;
        this.selectedReceiptType = null;
        this.selectedReceiptName = null;
        this.currentReceiptIndex = 0;

        this.receiptService.closeReceiptGalleryDialog();
    }
}