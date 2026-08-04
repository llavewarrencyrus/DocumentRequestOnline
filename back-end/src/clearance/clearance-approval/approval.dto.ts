// src/clearance-approvals/dto/clearance-approval.dto.ts
import { IsString, IsOptional, IsIn, IsInt, IsDateString, IsNotEmpty, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ClearanceApprovalDto {
  @IsInt()
  id: number;

  @IsInt()
  clearanceId: number;

  @IsString()
  office: string;

  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'])
  status: string;

  @IsString()
  @IsOptional()
  signedBy?: string;

  @IsDateString()
  @IsOptional()
  signedOn?: Date;

  @IsString()
  @IsOptional()
  remarks?: string;

  @Type(() => Date)
  createdAt: Date;
}

export class CreateClearanceApprovalDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  clearanceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  office: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'])
  status?: string = 'PENDING';

  @IsString()
  @IsOptional()
  @MaxLength(255)
  signedBy?: string;

  @IsDateString()
  @IsOptional()
  signedOn?: Date;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateClearanceApprovalDto {
  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'])
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  signedBy?: string;

  @IsDateString()
  @IsOptional()
  signedOn?: Date;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ClearanceApprovalQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  clearanceId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  office?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

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