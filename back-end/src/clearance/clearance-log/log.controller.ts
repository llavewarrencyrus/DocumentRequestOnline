// src/clearance-logs/clearance-logs.controller.ts
import {
  Controller, Get, Post, Delete, Body, Param, Query,
  ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ClearanceLogsService } from '@clearance/clearance-log/log.service';
import { CreateClearanceLogDto, ClearanceLogQueryDto } from '@clearance/clearance-log/log.dto';
import { ClearanceLog } from '@clearance/clearance-log/log.entity';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';

@Controller('clearance-logs')
@UseGuards(JwtAuthGuard)
export class ClearanceLogsController {
  constructor(private readonly logsService: ClearanceLogsService) {}

  @Get()
  async findAll(@Query() query: ClearanceLogQueryDto): Promise<{ data: ClearanceLog[]; total: number; }> {
    return this.logsService.findAll(query);
  }

  @Get('clearance/:clearanceId')
  async findByClearanceId(@Param('clearanceId', ParseIntPipe) clearanceId: number): Promise<ClearanceLog[]> {
    return this.logsService.findByClearanceId(clearanceId);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string): Promise<ClearanceLog[]> {
    return this.logsService.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ClearanceLog> {
    return this.logsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLogDto: CreateClearanceLogDto): Promise<ClearanceLog> {
    return this.logsService.create(createLogDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.logsService.remove(id);
  }
}