// backend/src/entities/notification.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToMany,
  JoinTable
} from 'typeorm';

export type NotificationType =
  | 'REQUEST_CREATED'      // For Registrar - new request
  | 'REQUEST_APPROVED'      // For Student - request approved
  | 'REQUEST_DECLINED'      // For Student - request declined
  | 'FOR_CLAIMING'        // For Student - claim available
  | 'REQUEST_UPDATED'      // General updates
  | 'RECEIPT_UPLOADED'      // For Registrar - receipt uploaded
  | 'CLEARANCE_INITIALIZED' // For Student - clearance ready to sign
  | 'CLEARANCE_ON_HOLD'    // For Student - clearance put on hold
  | 'CLEARANCE_APPROVED';   // For Student & Registrar - clearance fully approved

export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationAudience = 'student' | 'registrar' | 'admin' | 'all';

@Entity('notifications')
@Index(['audience', 'createdAt']) // For role-based queries
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, nullable: true })
  @Index()
  userId: string;  // For Student: specific studentId, For Registrar: NULL (shared)

  @Column({ length: 50 })
  audience: NotificationAudience;  // 'student', 'registrar', 'admin', 'all'

  @Column({ type: 'jsonb', nullable: true })
  targetUsers: string[]; // For targeted notifications to specific users

  @Column({ length: 50 })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: {
    requestId?: number;
    requestNumber?: string;
    studentId?: string;
    studentName?: string;
    documentNames?: string[];
    claimDate?: Date;
    declineReason?: string;
    approvedBy?: string;
    [key: string]: any;
  };

  // For role-based notifications (Registrar/Admin), we track read status per user
  @Column({ type: 'jsonb', default: {} })
  readBy: {
    [userId: string]: {
      read: boolean;
      readAt: Date;
    };
  };

  @Column({ default: false })
  isGlobal: boolean; // True for role-wide notifications (Registrar)

  @Column({ default: false })
  read: boolean; // For global notifications, shared read status across all users in the role

  @Column({ length: 20, default: 'medium' })
  priority: NotificationPriority;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    ip?: string;
    userAgent?: string;
  };

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column({ nullable: true })
  requestId: number;

  @Column({ nullable: true })
  groupId: string;

  // Helper method to check if notification is read by a specific user
  isReadByUser(userId: string): boolean {
    if (this.audience === 'student') {
      // For student, check the read field (backward compatibility)
      return (this as any).read || false;
    }
    // For global role-based notifications, check shared read status
    if (this.isGlobal) {
      return this.read || false;
    }
    // For non-global role-based notifications, check readBy object
    return this.readBy[userId]?.read || false;
  }

  // Helper method to mark as read for a user
  markAsReadForUser(userId: string): void {
    if (this.audience === 'student') {
      (this as any).read = true;
      (this as any).readAt = new Date();
    } else if (this.isGlobal) {
      // For global notifications, mark as read for all users in the role
      this.read = true;
    } else {
      // For non-global role-based notifications, track per user
      if (!this.readBy[userId]) {
        this.readBy[userId] = { read: true, readAt: new Date() };
      } else {
        this.readBy[userId].read = true;
        this.readBy[userId].readAt = new Date();
      }
    }
  }
}