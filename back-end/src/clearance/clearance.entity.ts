// src/clearance/entities/clearance.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ClearanceApproval } from '@clearance/clearance-approval/approval.entity';
import { ClearanceLog } from '@clearance/clearance-log/log.entity';
import { DocumentRequest } from '../request/document-request.entity';

@Entity('clearance')
export class Clearance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id', length: 50 })
  requestId: string;

  @Column({ length: 50, default: 'PENDING' })
  status: string;

  @Column({ length: 50 })
  type: string;

  @Column({ name: 'requestor_sign', type: 'text', nullable: true })
  requestorSign?: string;

  @Column({ name: 'requestor_signed_on', type: 'timestamp', nullable: true })
  requestorSignedOn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ClearanceApproval, approval => approval.clearance)
  approvals: ClearanceApproval[];

  @OneToMany(() => ClearanceLog, log => log.clearance)
  logs: ClearanceLog[];

  @ManyToOne(() => DocumentRequest, (request) => request.clearances)
  @JoinColumn({ name: 'request_id', referencedColumnName: 'requestNumber' })
  request: DocumentRequest;
}