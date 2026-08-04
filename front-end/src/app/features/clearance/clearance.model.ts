// clearance/clearance.model.ts
export interface ClearanceRequest {
  id: number;
  requestId: string;
  studentName: string;
  studentId: string;
  course: string;
  year?: number;
  documentList: Documents[];
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'COMPLETED';
  type: string;
  createdAt: Date;
  updatedAt?: Date;
  student?: StudentInfo;
  approvals?: ClearanceApproval[];
  totalApprovals?: number;
  approvedCount?: number;
  requestorSign?: string;
  requestorSignedOn?: Date;
}

export interface Documents {
  id: number;
  name: string;
}

export interface ClearanceApproval {
  id: number;
  clearanceId: number;
  office: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD';
  signedBy?: string;
  signedOn?: Date;
  remarks?: string;
  createdAt: Date;
}

export interface StudentInfo {
  id: string;
  name: string;
  course: string;
  year: string;
  email: string;
  contact: string;
}

export interface ApprovalStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
  stats?: {
    total: number;
    pending: number;
    inReview: number;
    approved: number;
    rejected: number;
  };
}

export interface ClearanceLog {
  id: number;
  clearanceId: number;
  action: string;
  userId: string;
  metadata?: any;
  date: Date;
}

export interface PaginatedClearanceResponse {
  items: ClearanceRequest[];
  meta: PaginationMeta;
}