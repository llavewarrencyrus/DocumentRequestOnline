import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DocumentRequest } from '../request/document-request.entity';

@Entity('courses')
export class Course {
    @PrimaryColumn()
    id: number;

    @Column({ length: 50 })
    code: string;

    @Column({ length: 255 })
    description: string;

    @Column({ name: 'department_id' })
    departmentId: number;

    @OneToMany(() => DocumentRequest, request => request.course)
    requests: DocumentRequest[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}