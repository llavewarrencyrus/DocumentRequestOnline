import { DocumentRequest } from "@src/app/features/document-request/request.model";

export interface ReceiptInfo {
  id: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
  fileHash: string;
  metadata?: any;
}

export interface DocumentSection {
  title: string;
  items: DocumentOption[];
}

export interface CreateDocumentRequest {
  studentId: string;
  requestorLastName: string;
  requestorFirstName: string;
  requestorMiddleName?: string;
  requestorCourseId: number;
  requestorId: string;
  email: string;
  contact: string;
  requestCategory: string;
  needsClearance: boolean;
  documents: { id: number; name: string; }[];
  quantity: number;
  purpose: string;
  estimatedClaimDate?: string;
  price: number;
  year: number;
}

//================= REFERENCE ===================

export interface DocumentOption {
  id: number;
  name: string;
  fee: number;
  processingPeriod: number;
  category: string;
  description?: string;
  createdAt?: string;
}

export interface Course {
  id: number;
  code: string;
  description: string;
  departmentId: number;
}

//================= DIALOG ===================

export interface RequestedReceipt {
  id: number;
  documentsName?: string;
  status: DocumentRequest['status'];
  quantity: number;
}

export interface Decline {
  id: number;
  documents?: string;
  reason: string | null;
}