export interface ReceiptInfo {
  id: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
  fileHash: string;
  metadata?: any;
}

export interface ReceiptGallery {
  receiptId: number | null;
  receipts: ReceiptInfo[];
}

export interface DisplayReceiptGallery {
  gallery: ReceiptGallery | null;
  show: boolean;
}

export interface DisplayReceiptList {
  requestId: number | null;
  receipts: ReceiptInfo[];
  show: boolean;
}