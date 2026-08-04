import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Course } from '../reference/course.entity';
import { RequestDocument } from '../reference/request-document.entity';
import { Receipt } from '../upload/receipt.entity';
import { Clearance } from '../clearance/clearance.entity';

export type RequestStatus = 'Pending' | 'Processing' | 'Ready for Payment' | 'Available for Claiming' | 'Approved' | 'Completed' | 'Declined' | 'UNDER_REVIEW';

@Entity('document_requests')
export class DocumentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_number', length: 50, unique: true })
  requestNumber: string;

  @Column({ name: 'student_id', length: 50 })
  studentId: string;

  @Column({ name: 'requestor_id', length: 10 })
  requestorId: string;

  @Column({ name: 'requestor_last_name', length: 100 })
  requestorLastName: string;

  @Column({ name: 'requestor_first_name', length: 100 })
  requestorFirstName: string;

  @Column({ name: 'requestor_middle_name', length: 100, nullable: true })
  requestorMiddleName: string;

  @Column({ name: 'requestor_course_id', nullable: true })
  requestorCourseId: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'requestor_course_id' })
  course: Course;

  @Column({ name: 'year', type: 'int', nullable: true })
  year: number;

  @Column({ name: 'contact', length: 50, nullable: true })
  contact: string;

  @Column({ name: 'email', length: 255, nullable: true })
  email: string;

  @Column({ name: 'request_category', length: 50, nullable: true })
  requestCategory: string;

  @Column({ name: 'needs_clearance', default: false })
  needsClearance: boolean;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose: string;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'estimated_claim_date', type: 'date', nullable: true })
  estimatedClaimDate: string;

  @Column({ name: 'date_requested', type: 'timestamp' })
  dateRequested: Date;

  @Column({ name: 'status', length: 50 })
  status: RequestStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason: string;

  @Column({ name: 'approved_by', length: 255, nullable: true })
  approvedBy: string;

  @Column({ name: 'date_approved', type: 'timestamp', nullable: true })
  dateApproved: Date;

  @Column({ name: 'short_code', length: 50, nullable: true })
  shortCode: string;

  @Column({ name: 'claim_date', type: 'date', nullable: true })
  claimDate: string;

  @Column({ name: 'type', length: 20, default: 'ONLINE' })
  type: string;

  @OneToMany(() => RequestDocument, requestDoc => requestDoc.request, { cascade: true })
  documents: RequestDocument[];

  // Relationship to receipt
  @OneToOne(() => Receipt, receipt => receipt.request)
  receipt: Receipt;

  // Helper property to check if receipt exists
  hasReceipt: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Clearance, (clearance) => clearance.request)
  clearances: Clearance[];
}