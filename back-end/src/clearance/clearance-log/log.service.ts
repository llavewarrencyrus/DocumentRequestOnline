// src/clearance-logs/clearance-logs.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { ClearanceLog } from '@clearance/clearance-log/log.entity';
import { CreateClearanceLogDto, ClearanceLogQueryDto } from '@clearance/clearance-log/log.dto';

@Injectable()
export class ClearanceLogsService {
  constructor(
    @InjectRepository(ClearanceLog)
    private logRepository: Repository<ClearanceLog>,
  ) {}

  async findAll(query: ClearanceLogQueryDto): Promise<{ data: ClearanceLog[]; total: number; }> {
    const { clearanceId, userId, action, fromDate, toDate, page = 1, limit = 10 } = query;

    const where: FindOptionsWhere<ClearanceLog> = {};

    if (clearanceId) where.clearanceId = clearanceId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    if (fromDate && toDate) {
      where.date = Between(new Date(fromDate), new Date(toDate));
    } else if (fromDate) {
      where.date = Between(new Date(fromDate), new Date());
    } else if (toDate) {
      where.date = Between(new Date('1970-01-01'), new Date(toDate));
    }

    const [data, total] = await this.logRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'DESC' },
      relations: ['clearance'],
    });

    return { data, total };
  }

  async findOne(id: number): Promise<ClearanceLog> {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['clearance'],
    });

    if (!log) {
      throw new NotFoundException(`Clearance log with ID ${id} not found`);
    }

    return log;
  }

  async findByClearanceId(clearanceId: number): Promise<ClearanceLog[]> {
    return this.logRepository.find({
      where: { clearanceId },
      order: { date: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<ClearanceLog[]> {
    return this.logRepository.find({
      where: { userId },
      order: { date: 'DESC' },
      relations: ['clearance'],
    });
  }

  async create(createLogDto: CreateClearanceLogDto): Promise<ClearanceLog> {
    // Parse metadata if it's a string
    if (createLogDto.metadata && typeof createLogDto.metadata === 'string') {
      try {
        createLogDto.metadata = JSON.parse(createLogDto.metadata);
      } catch (e) {
        // If it's not valid JSON, leave it as is
      }
    }

    const log = this.logRepository.create({
      ...createLogDto,
      date: new Date(), // Ensure date is set to now
    });

    return this.logRepository.save(log);
  }

  async remove(id: number): Promise<void> {
    const result = await this.logRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Clearance log with ID ${id} not found`);
    }
  }
}