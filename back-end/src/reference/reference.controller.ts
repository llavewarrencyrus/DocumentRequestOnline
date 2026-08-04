import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReferenceService } from '../reference/reference.service';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('documents')
  async getDocumentOptions() {
    const documents = await this.referenceService.getDocumentOptions();
    return {
      success: true,
      data: documents,
    };
  }

  @Get('documents/search')
  async searchDocuments(@Query('q') searchTerm: string) {
    const documents = await this.referenceService.searchDocumentOptions(searchTerm);
    return {
      success: true,
      data: documents,
    };
  }

  @Get('documents/:id')
  async getDocumentOption(@Param('id') id: number) {
    const document = await this.referenceService.getDocumentOptionById(id);
    return {
      success: true,
      data: document,
    };
  }

  @Get('courses')
  async getCourses() {
    const courses = await this.referenceService.getCourses();
    return {
      success: true,
      data: courses,
    };
  }

  @Get('courses/search')
  async searchCourses(@Query('q') searchTerm: string) {
    const courses = await this.referenceService.searchCourses(searchTerm);
    return {
      success: true,
      data: courses,
    };
  }

  @Get('courses/department/:departmentId')
  async getCoursesByDepartment(@Param('departmentId') departmentId: string) {
    const courses = await this.referenceService.getCoursesByDepartment(+departmentId);
    return {
      success: true,
      data: courses,
    };
  }

  @Get('courses/:id')
  async getCourse(@Param('id') id: string) {
    const course = await this.referenceService.getCourseById(+id);
    return {
      success: true,
      data: course,
    };
  }

  @Get('departments')
  async getDepartments() {
    const departments = await this.referenceService.getDepartments();
    return {
      success: true,
      data: departments,
    };
  }
}