import { ReceiptInfo } from "./receipts/receipt.model";

export interface DocumentRequest {
  id: number;
  requestNumber: string;
  studentId: string;
  requestorLastName: string;
  requestorFirstName: string;
  requestorMiddleName: string | null;
  requestorCourseId: number;
  year: number;
  contact: string | null;
  email: string | null;
  quantity: number;
  requestCategory: string;
  needsClearance: boolean;
  purpose: string | null;
  price: number;
  hasReceipt?: boolean;
  receiptCount: number;
  receipts: ReceiptInfo[] | null;
  receiptInfo?: ReceiptInfo | null;
  estimatedClaimDate: string | null;
  dateRequested: string;
  status: 'Pending' | 'Processing' | 'Available for Claiming' | 'Approved' | 'Completed' | 'Declined' | 'UNDER_REVIEW' | 'ACTION_REQUIRED';
  notes: string | null;
  declineReason: string | null;
  approvedBy: string | null;
  dateApproved: string | null;
  shortCode: string | null;
  claimDate: string | null;
  type: 'ONLINE';
  documentsDisplayName?: string,
  documents?: RequestDocument[];
  updatedAt?: string;
  createdAt?: string;
}

export interface RequestDocument {
  requestId: number;
  documentId: number;
  documentName: string;
}