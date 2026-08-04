// src/clearance-logs/dto/clearance-log.dto.ts
import { IsString, IsOptional, IsInt, IsJSON, IsDateString, IsNotEmpty, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ClearanceLogDto {
  @IsInt()
  id: number;

  @IsInt()
  clearanceId: number;

  @IsString()
  action: string;

  @IsString()
  userId: string;

  @IsOptional()
  metadata?: any;

  @Type(() => Date)
  date: Date;
}

export class CreateClearanceLogDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  clearanceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  action: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  userId: string;

  @IsOptional()
  @IsJSON()
  metadata?: any;
}

export class ClearanceLogQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  clearanceId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  userId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  action?: string;

  @IsDateString()
  @IsOptional()
  fromDate?: Date;

  @IsDateString()
  @IsOptional()
  toDate?: Date;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}