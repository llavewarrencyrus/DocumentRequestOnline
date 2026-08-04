// src/clearance-logs/entities/clearance-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Clearance } from '@clearance/clearance.entity';

@Entity('clearance_logs')
export class ClearanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'clearance_id' })
  clearanceId: number;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'user_id', length: 255 })
  userId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @ManyToOne(() => Clearance, clearance => clearance.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clearance_id' })
  clearance: Clearance;
}