// src/clearance/clearance.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus,
  UseGuards, DefaultValuePipe, Res, Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { User } from '@auth/user.decorator';
import { ClearanceService } from '@clearance/clearance.service';
import { CreateClearanceDto, UpdateClearanceDto, ClearanceQueryDto, PublicClearanceDto, SignClearanceDto } from '@clearance/clearance.dto';
import { Clearance } from '@clearance/clearance.entity';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import type { UserPayload } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('clearance')
export class ClearanceController {
  constructor(
    private readonly clearanceService: ClearanceService,
  ) {}

  @Get('track/:requestId')
  async getPublicStatus(@Param('requestId') requestId: string): Promise<PublicClearanceDto> {
    return this.clearanceService.findPublicStatus(requestId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory', 'Registrar')
  async findAll(
    @Query() query: ClearanceQueryDto,
    @User() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('requestId') requestId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<{ success: boolean; data: { items: any[]; meta: any; }; }> {
    const userOffice = user.office;
    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const userDepartmentId = user.departmentId;
    const mergedQuery = {
      ...query,
      page,
      limit,
      status: status || query.status,
      type: type || query.type,
      requestId: requestId || query.requestId,
      search: search || query.search,
      dateFrom: dateFrom || query.dateFrom,
      dateTo: dateTo || query.dateTo,
      sortBy: sortBy || query.sortBy,
      sortOrder: sortOrder || query.sortOrder,
    };
    const result = await this.clearanceService.findAll(mergedQuery, userOffice, userRole, userDepartmentId);
    return {
      success: true,
      ...result
    };
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory')
  async findByStatus(@Param('status') status: string): Promise<Clearance[]> {
    return this.clearanceService.findByStatus(status);
  }

  @Get('request/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Student', 'Registrar')
  async findByRequestId(@Param('requestId') requestId: string): Promise<Clearance> {
    return this.clearanceService.findByRequestId(requestId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory')
  async create(@Body() createClearanceDto: CreateClearanceDto): Promise<Clearance> {
    return this.clearanceService.create(createClearanceDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClearanceDto: UpdateClearanceDto,
  ): Promise<Clearance> {
    return this.clearanceService.update(id, updateClearanceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.clearanceService.remove(id);
  }

  @Get('document/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Registrar')
  async generateDocument(
    @Param('requestId') requestId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.clearanceService.createDocument(requestId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Clearance-${requestId}.docx`);
    res.send(buffer);
  }

  @Post(':id/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Student')
  @HttpCode(HttpStatus.OK)
  async signClearance(
    @Param('id', ParseIntPipe) id: number,
    @Body() signClearanceDto: SignClearanceDto,
    @User() user: UserPayload,
    @Req() req: any,
  ): Promise<{ success: boolean; data: Clearance; message: string; }> {
    const footprint = {
      ip: req.ip || req.connection.remoteAddress,
      ua: req.headers['user-agent'],
    };
    const signedClearance = await this.clearanceService.signClearance(id, signClearanceDto, user.userId.toString(), footprint);
    return {
      success: true,
      data: signedClearance,
      message: 'Clearance signed successfully',
    };
  }
}