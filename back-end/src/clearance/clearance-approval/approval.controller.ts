// src/clearance-approvals/clearance-approvals.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ClearanceApprovalsService } from '@clearance/clearance-approval/approval.service';
import { CreateClearanceApprovalDto, UpdateClearanceApprovalDto, ClearanceApprovalQueryDto } from '@clearance/clearance-approval/approval.dto';
import { ClearanceApproval } from '@clearance/clearance-approval/approval.entity';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { Roles } from '@auth/roles.decorator';
import { User } from '../../auth/user.decorator';

@Controller('clearance-approvals')
@UseGuards(JwtAuthGuard)
@Roles('Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory')
export class ClearanceApprovalsController {
  constructor(private readonly approvalsService: ClearanceApprovalsService) {}

  @Get()
  async findAll(@Query() query: ClearanceApprovalQueryDto): Promise<{ data: ClearanceApproval[]; total: number; }> {
    return this.approvalsService.findAll(query);
  }

  @Get('clearance/:clearanceId')
  async findByClearanceId(@Param('clearanceId', ParseIntPipe) clearanceId: number): Promise<ClearanceApproval[]> {
    return this.approvalsService.findByClearanceId(clearanceId);
  }

  @Get('office/:office')
  async findByOffice(@Param('office') office: string): Promise<ClearanceApproval[]> {
    return this.approvalsService.findByOffice(office);
  }

  @Get('status/:status')
  async findByStatus(@Param('status') status: string): Promise<ClearanceApproval[]> {
    return this.approvalsService.findByStatus(status);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ClearanceApproval> {
    return this.approvalsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createApprovalDto: CreateClearanceApprovalDto): Promise<ClearanceApproval> {
    return this.approvalsService.create(createApprovalDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApprovalDto: UpdateClearanceApprovalDto,
    @User() user: any,
  ): Promise<ClearanceApproval> {
    return this.approvalsService.update(id, updateApprovalDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.approvalsService.remove(id);
  }
}