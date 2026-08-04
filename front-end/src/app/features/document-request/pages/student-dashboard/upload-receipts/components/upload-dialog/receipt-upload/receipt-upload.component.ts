// receipt-upload.component.ts
import { Component, input, effect, signal, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

import { ReceiptInfo } from '@src/app/features/document-request/receipts/receipt.model';

import { ReceiptListComponent } from '@src/app/features/document-request/receipts/components/receipt-list-dialog/list/receipt-list.component';

import { UploadService } from '@src/app/features/document-request/pages/student-dashboard/upload-receipts/upload.service';

import { ReceiptService } from '@features/document-request/receipts/receipt.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'app-receipt-upload',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    ProgressBarModule,
    TooltipModule,
    ReceiptListComponent
  ],
  templateUrl: './receipt-upload.component.html',
  styleUrls: ['./receipt-upload.component.css']
})
export class ReceiptUploadComponent {
  readonly requestId = input<number | null>(null);

  uploadError = output<string>();

  isLoading: boolean = false;
  isDragover = false;
  isUploading = false;
  selectedFiles: File[] = [];
  errorMessage: string = '';

  uploadProgress = {
    current: 0,
    total: 0,
    percentage: 0
  };

  // Allowed file types
  private allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxFiles = 3;

  private uploadService = inject(UploadService);
  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  protected receipts = signal<ReceiptInfo[]>(
    this.uploadService.selectedRequestForReceipt().receipts
  );

  private loadReceiptsFromService(id: number) {
    this.receiptService.getReceiptsForRequest(id)
      .subscribe(receipts => this.receipts.set(receipts));
  }

  uploadSelectedFiles() {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.uploadProgress = {
      current: 0,
      total: this.selectedFiles.length,
      percentage: 0
    };

    this.uploadService.uploadMultipleReceipts(this.requestId()!, this.selectedFiles).subscribe({
      next: (response) => {
        this.isUploading = false;

        const mappedReceipts: ReceiptInfo[] = response.receipts.map((r: any) => ({
          id: r.receiptId,
          fileName: r.fileName,
          fileSize: r.fileSize,
          uploadedAt: r.uploadedAt,
          mimeType: r.mimeType,
          fileHash: ''
        }));

        this.receiptService.addReceiptsToCache(this.requestId()!, mappedReceipts);
        this.receipts.update(current => [...mappedReceipts, ...current]);

        this.messageService.add({
          severity: 'success',
          summary: 'Upload Successful',
          detail: `${this.selectedFiles.length} receipt(s) uploaded successfully`,
          life: 3000
        });

        this.selectedFiles = [];
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = error.message || 'Upload failed. Please try again.';
        this.uploadError.emit(this.errorMessage);

        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: this.errorMessage,
          life: 5000
        });
      }
    });
  }

  removeReceipt(receipt: ReceiptInfo) {
    this.receiptService.deleteReceiptById(receipt.id).subscribe({
      next: () => {
        this.receiptService.removeReceiptFromCache(this.requestId()!, receipt.id);
        this.loadReceiptsFromService(this.requestId()!);

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

  viewReceipt(receipt: ReceiptInfo) {
    this.receiptService.viewReceiptById(receipt.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to view receipt',
          life: 3000
        });
      }
    });
  }

  downloadReceipt(receipt: ReceiptInfo) {
    this.receiptService.downloadReceiptById(receipt.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: error.message || 'Failed to download receipt',
          life: 5000
        });
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files.length > this.maxFiles) {
      this.errorMessage = `Maximum ${this.maxFiles} files allowed.`;
      return;
    }
    this.handleFiles(Array.from(files));
  }

  async handleFiles(files: File[]) {
    this.errorMessage = '';
    const validFiles: File[] = [];
    const duplicateFiles: File[] = [];

    for (const file of files) {
      // 1. Basic Size Check (Keep your existing 10MB limit)
      if (file.size > this.maxFileSize) {
        this.errorMessage = `File too large: ${file.name}`;
        continue;
      }

      // 2. Deep Content Validation (Magic Bytes)
      const isValid = await this.validateFileSignature(file);
      if (!isValid) {
        this.errorMessage = `Security Alert: File ${file.name} content does not match its extension.`;
        this.uploadError.emit(this.errorMessage);
        continue;
      }

      // 3. Filename Sanitization
      const secureName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9.\-_]/g, '');

      const sanitizedFile = new File([file], secureName, { type: file.type });

      // 4. Check for duplicates AFTER sanitization
      const isDuplicate = this.checkForDuplicate(sanitizedFile);
      if (isDuplicate) {
        duplicateFiles.push(sanitizedFile);
        continue;
      }

      validFiles.push(sanitizedFile);
    }

    // Add valid files immediately
    if (validFiles.length > 0) {
      this.selectedFiles = [...this.selectedFiles, ...validFiles];
    }

    // Handle duplicates with confirmation dialog
    if (duplicateFiles.length > 0) {
      await this.handleDuplicateFiles(duplicateFiles);
    }
  }

  private async validateFileSignature(file: File): Promise<boolean> {
    const bitmap = {
      'ffd8ff': 'image/jpeg',
      '89504e47': 'image/png',
      '25504446': 'application/pdf'
    };

    const reader = file.slice(0, 4).stream().getReader();
    const { value } = await reader.read();
    const header = Array.from(value!)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return Object.keys(bitmap).some(key => header.startsWith(key));
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  clearSelectedFiles() {
    this.selectedFiles = [];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return 'pi pi-file-pdf text-red-500';
    }
    return 'pi pi-image text-blue-500';
  }

  getFileIconFromName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return 'pi pi-file-pdf text-red-500';
    }
    return 'pi pi-image text-blue-500';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async handleDuplicateFiles(duplicateFiles: File[]): Promise<void> {
    const fileNames = duplicateFiles.map(f => f.name).join(', ');
    const message = `The following file(s) already exist: ${fileNames}. Do you want to continue uploading them with incremented names?`;

    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: message,
        header: 'Duplicate Files Detected',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Upload with New Names',
        rejectLabel: 'Cancel',
        accept: () => {
          // User confirmed, add files with incremented names
          const incrementedFiles = duplicateFiles.map(file =>
            new File([file], this.getIncrementedFileName(file.name), { type: file.type })
          );
          this.selectedFiles = [...this.selectedFiles, ...incrementedFiles];
          resolve();
        },
        reject: () => {
          // User cancelled, don't add the files
          resolve();
        }
      });
    });
  }

  private checkForDuplicate(file: File): boolean {
    // Check against already uploaded receipts
    const existingReceipts = this.receipts();
    const receiptExists = existingReceipts.some(receipt =>
      receipt.fileName === file.name
    );

    // Check against selected files (not yet uploaded)
    const selectedFileExists = this.selectedFiles.some(selectedFile =>
      selectedFile.name === file.name
    );

    return receiptExists || selectedFileExists;
  }

  private getIncrementedFileName(originalName: string): string {
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension, just add number
      return `${originalName}_1`;
    }

    const nameWithoutExt = originalName.substring(0, lastDotIndex);
    const extension = originalName.substring(lastDotIndex);

    // Check for existing increment pattern at the end
    const incrementMatch = nameWithoutExt.match(/(.*?)(\d+)$/);
    if (incrementMatch) {
      const baseName = incrementMatch[1];
      const currentNumber = parseInt(incrementMatch[2]);

      // Check if this incremented name already exists
      const newName = `${baseName}${currentNumber + 1}${extension}`;
      if (!this.checkForDuplicateByName(newName)) {
        return newName;
      }

      // If it exists, add a new increment level
      return `${nameWithoutExt}_1${extension}`;
    } else {
      // No existing increment, add _1
      const newName = `${nameWithoutExt}_1${extension}`;
      if (!this.checkForDuplicateByName(newName)) {
        return newName;
      }

      // If _1 already exists, try _2, _3, etc.
      let counter = 2;
      while (true) {
        const candidateName = `${nameWithoutExt}_${counter}${extension}`;
        if (!this.checkForDuplicateByName(candidateName)) {
          return candidateName;
        }
        counter++;
      }
    }
  }

  private checkForDuplicateByName(fileName: string): boolean {
    // Check against already uploaded receipts
    const existingReceipts = this.receipts();
    const receiptExists = existingReceipts.some(receipt =>
      receipt.fileName === fileName
    );

    // Check against selected files (not yet uploaded)
    const selectedFileExists = this.selectedFiles.some(selectedFile =>
      selectedFile.name === fileName
    );

    return receiptExists || selectedFileExists;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}