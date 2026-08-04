// entities/receipt.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DocumentRequest } from '../request/document-request.entity';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @Index()
  requestId: number;

  @ManyToOne(() => DocumentRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: DocumentRequest;

  @Column({ name: 'file_name', length: 255 })
  fileName: string; // Generated secure filename

  @Column({ name: 'file_path', length: 500 })
  filePath: string; // Path to stored file

  @Column({ name: 'file_size' })
  fileSize: number; // Size in bytes

  @Column({ name: 'file_hash', length: 64 })
  @Index()
  fileHash: string; // SHA-256 hash for integrity

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string; // MIME type of the file

  @Column({ name: 'original_name', length: 255 })
  originalName: string; // Original filename

  @Column({ name: 'uploaded_by', length: 50 })
  uploadedBy: string; // Student ID who uploaded

  @Column({ name: 'uploaded_at', type: 'timestamp' })
  uploadedAt: Date;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean; // Soft delete flag

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number; // For images
    height?: number; // For images
    pages?: number; // For PDFs
    checksum?: string; // Additional checksum if needed
    virusScanResult?: string; // Virus scan status
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}