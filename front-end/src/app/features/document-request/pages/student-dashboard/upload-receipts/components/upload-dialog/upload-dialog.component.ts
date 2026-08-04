import { Component, inject, computed, model } from "@angular/core";

import { DialogModule } from "primeng/dialog";

import { ReceiptUploadComponent } from "./receipt-upload/receipt-upload.component";

import { RequestedReceipt } from "@src/app/features/document-request/student-request.model";
import { ReceiptInfo } from "@src/app/features/document-request/receipts/receipt.model";

import { UploadService } from "@src/app/features/document-request/pages/student-dashboard/upload-receipts/upload.service";
import { DocumentRequest } from '../../../../../request.model';


@Component({
  selector: 'upload-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ReceiptUploadComponent
  ],
  templateUrl: './upload-dialog.component.html'
})
export class UploadDialogComponent {
  selectedRequestForReceipt = model<DocumentRequest | null>();

  protected uploadService = inject(UploadService);
}
