// src/clearance-approvals/entities/clearance-approval.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Clearance } from '@clearance/clearance.entity';

@Entity('clearance_approvals')
export class ClearanceApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clearance_id' })
  clearanceId: number;

  @Column({ length: 100 })
  office: string;

  @Column({ length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'signed_by', length: 255, nullable: true })
  signedBy?: string;

  @Column({ name: 'signed_on', type: 'timestamp', nullable: true })
  signedOn?: Date;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Clearance, clearance => clearance.approvals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clearance_id' })
  clearance: Clearance;
}