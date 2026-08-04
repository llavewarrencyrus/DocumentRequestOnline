// frontend/src/app/core/models/notification.model.ts
export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_DECLINED'
  | 'CLAIM_DATE_SET'
  | 'RECEIPT_UPLOADED'
  | 'REQUEST_UPDATED';

export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationAudience = 'student' | 'registrar' | 'admin' | 'all';

export interface NotificationData {
  requestId?: number;
  requestNumber?: string;
  studentId?: string;
  studentName?: string;
  documentNames?: string[];
  quantity?: number;
  course?: string;
  approvedBy?: string;
  declinedBy?: string;
  declineReason?: string;
  claimDate?: Date;
  dateApproved?: Date;
  [key: string]: any;
}

// Interface for read tracking
export interface ReadByEntry {
  read: boolean;
  readAt: Date;
}

export interface Notification {
  id: number;
  userId?: string;  // Made optional since staff notifications don't have a specific userId
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  // This is the actual field from backend
  readBy: {
    [userId: string]: ReadByEntry;
  };
  // Computed property for UI (not from backend)
  read?: boolean;
  readAt?: Date | null;
  priority: NotificationPriority;
  createdAt: Date;
  requestId?: number;
  groupId?: string;
  isGlobal: boolean;
}

export interface SseEvent {
  type: 'notification' | 'ping' | 'connection-established';
  data: any;
  userId: string;
  connectionId?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export interface UnreadCountResponse {
  count: number;
}