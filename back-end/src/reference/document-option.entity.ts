import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RequestDocument } from './request-document.entity';

@Entity('document_options')
export class DocumentOption {
    @PrimaryColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    fee: number;

    @Column({ name: 'processing_period' })
    processingPeriod: number;

    @Column({ length: 100 })
    category: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => RequestDocument, requestDoc => requestDoc.documentOption)
    requestDocuments: RequestDocument[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}