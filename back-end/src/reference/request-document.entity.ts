import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { DocumentRequest } from '../request/document-request.entity';
import { DocumentOption } from './document-option.entity';

@Entity('request_documents')
export class RequestDocument {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'request_id' })
    requestId: number;

    @Column({ name: 'document_id'})
    documentId: number;

    @Column({ name: 'document_name', length: 255 })
    documentName: string;

    @ManyToOne(() => DocumentRequest, request => request.documents)
    @JoinColumn({ name: 'request_id' })
    request: DocumentRequest;

    @ManyToOne(() => DocumentOption)
    @JoinColumn({ name: 'document_id' })
    documentOption: DocumentOption;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}