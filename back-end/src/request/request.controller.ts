import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './create-request.dto';
import { UpdateStatusDto } from './update-status.dto';
import { DeclineRequestDto } from './decline-request.dto';
import { RemoveDocumentsDto } from './remove-documents.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { User } from '../auth/user.decorator';
import type { UserPayload } from 'src/auth/auth.service';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  // TEST ENDPOINT - Put this first to verify routing works
  @Get('test')
  @HttpCode(HttpStatus.OK)
  async test() {
    return {
      success: true,
      message: 'API is working correctly',
      timestamp: new Date().toISOString()
    };
  }

  @Get('student/my-requests')
  @HttpCode(HttpStatus.OK)
  async findByStudentId(
    @User() user: UserPayload,
    @Headers('x-external-token') token: string
  ) {
    const studentId = user?.userId;
    try {
      const requests = await this.requestService.findByStudentId(studentId, token);
      return {
        success: true,
        data: requests,
        count: requests.length
      };
    } catch (error) {
      console.error('Error in findByStudentId:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('status/:status')
  @HttpCode(HttpStatus.OK)
  async findByStatus(@Param('status') status: string) {
    const requests = await this.requestService.findByStatus(status);
    return {
      success: true,
      data: requests,
    };
  }

  // REQUEST NUMBER ENDPOINT
  @Get('number/:requestNumber')
  @HttpCode(HttpStatus.OK)
  async findByRequestNumber(@Param('requestNumber') requestNumber: string) {
    const request = await this.requestService.findByRequestNumber(requestNumber);
    return {
      success: true,
      data: request,
    };
  }

  // GET ALL REQUESTS
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Headers('x-external-token') externalToken: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('hasReceipt') hasReceipt?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const result = await this.requestService.findAllPaginated(externalToken, page, limit, status, search, hasReceipt, dateFrom, dateTo, sortBy, sortOrder);
    return {
      success: true,
      ...result
    };
  }

  @Get('stats/counts')
  @HttpCode(HttpStatus.OK)
  async getRequestCounts() {
    const counts = await this.requestService.getRequestCounts();
    return {
      success: true,
      data: counts
    };
  }

  // GET SINGLE REQUEST (This must be LAST)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const request = await this.requestService.findOne(+id);
    return {
      success: true,
      data: request,
    };
  }

  // CREATE REQUEST
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRequestDto: CreateRequestDto) {
    try {
      const request = await this.requestService.create(createRequestDto);
      return {
        success: true,
        data: request,
        message: 'Request created successfully',
      };
    } catch (error) {
      console.error('Error in create:', error);
      throw new BadRequestException(error.message);
    }
  }

  // UPDATE STATUS
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: UserPayload,
    @Headers('x-external-token') token: string,
  ) {
    console.log('User in updateStatus:', user);
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    if (token)
      updateStatusDto.token = token;

    const request = await this.requestService.updateStatus(+id, updateStatusDto, user);
    return {
      success: true,
      data: request,
      message: `Status updated to ${updateStatusDto.status}`,
    };
  }

  @Put(':id/mark-clearance')
  @HttpCode(HttpStatus.OK)
  async markClearance(
    @Param('id') id: number,
    @Body() category: { category: string; },
  ) {
    const request = await this.requestService.markClearance(id, category);
    return {
      success: true,
      data: request,
      message: 'Clearance marked successfully',
    };
  }

  // DECLINE REQUEST
  @Put(':id/decline')
  @HttpCode(HttpStatus.OK)
  async declineRequest(
    @Param('id') id: string,
    @Body() declineRequestDto: DeclineRequestDto,
  ) {
    const request = await this.requestService.declineRequest(+id, declineRequestDto);
    return {
      success: true,
      data: request,
      message: 'Request declined successfully',
    };
  }

  // REMOVE DOCUMENTS FROM REQUEST
  @Put(':id/documents/remove')
  @HttpCode(HttpStatus.OK)
  async removeDocumentsFromRequest(
    @Param('id') id: string,
    @Body() removeDocumentsDto: RemoveDocumentsDto,
  ) {
    const request = await this.requestService.removeDocumentsFromRequest(+id, removeDocumentsDto);
    return {
      success: true,
      data: request,
      message: 'Documents removed successfully',
    };
  }

  // DEBUG - List all registered routes
  @Get('debug/routes')
  getRoutes() {
    const routes = [
      'GET /api/requests/test',
      'GET /api/requests/student/:studentId',
      'GET /api/requests/status/:status',
      'GET /api/requests/number/:requestNumber',
      'GET /api/requests',
      'GET /api/requests/:id',
      'POST /api/requests',
      'PUT /api/requests/:id/status',
      'PUT /api/requests/:id/decline',
      'PUT /api/requests/:id/documents/remove'
    ];
    return {
      success: true,
      baseUrl: '/api/requests',
      routes: routes
    };
  }

  @Delete(':id')
  async deleteRequest(
    @Param('id') id: number,
    @Query('studentId') studentId: string // Pass studentId to verify ownership
  ) {
    await this.requestService.deleteRequest(id, studentId);
    return {
      success: true,
      message: 'Request cancelled successfully'
    };
  }
}