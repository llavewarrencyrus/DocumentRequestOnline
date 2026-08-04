import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentOption } from './document-option.entity';
import { Course } from './course.entity';
import { Department } from './department.entity';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(DocumentOption)
    private documentOptionRepository: Repository<DocumentOption>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async getDocumentOptions(): Promise<DocumentOption[]> {
    return this.documentOptionRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getDocumentOptionById(id: number): Promise<DocumentOption | null> {
    return this.documentOptionRepository.findOne({ where: { id } });
  }

  async getCourses(): Promise<Course[]> {
    return this.courseRepository.find({
      order: { description: 'ASC' },
    });
  }

  async getCourseById(id: number): Promise<Course | null> {
    return this.courseRepository.findOne({ where: { id } });
  }

  async getCoursesByDepartment(departmentId: number): Promise<Course[]> {
    return this.courseRepository.find({
      where: { departmentId },
      order: { description: 'ASC' },
    });
  }

  async searchCourses(searchTerm: string): Promise<Course[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .where('LOWER(course.description) LIKE LOWER(:search)', { search: `%${searchTerm}%` })
      .orWhere('LOWER(course.code) LIKE LOWER(:search)', { search: `%${searchTerm}%` })
      .orderBy('course.description', 'ASC')
      .getMany();
  }

  async searchDocumentOptions(searchTerm: string): Promise<DocumentOption[]> {
    return this.documentOptionRepository
      .createQueryBuilder('doc')
      .where('LOWER(doc.name) LIKE LOWER(:search)', { search: `%${searchTerm}%` })
      .orWhere('LOWER(doc.category) LIKE LOWER(:search)', { search: `%${searchTerm}%` })
      .orderBy('doc.name', 'ASC')
      .getMany();
  }

  async getDepartments(): Promise<Department[]> {
    return this.departmentRepository.find({
      order: { name: 'ASC' },
    });
  }
}