// src/clearance/dto/clearance.dto.ts
import { IsString, IsOptional, IsIn, IsInt, Min, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestDocument } from '../reference/request-document.entity';

export class ClearanceDto {
  @IsInt()
  id: number;

  @IsString()
  requestId: string;

  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'IN_REVIEW', 'ON_HOLD', 'REJECTED', 'COMPLETED'])
  status: string;

  @IsString()
  type: string;

  @Type(() => Date)
  createdAt: Date;

  @Type(() => Date)
  updatedAt: Date;

  @IsInt()
  @IsOptional()
  year?: number;
}

export class CreateClearanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  requestId: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'IN_REVIEW', 'ON_HOLD', 'REJECTED', 'COMPLETED'])
  status?: string = 'PENDING';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;
}

export class UpdateClearanceDto {
  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'IN_REVIEW', 'ON_HOLD', 'REJECTED', 'COMPLETED'])
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;
}

export class ClearanceQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'IN_REVIEW', 'ON_HOLD', 'REJECTED', 'COMPLETED'])
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  requestId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: string;

  @IsString()
  @IsOptional()
  office?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'ON_HOLD'])
  approvalStatus?: string;

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

export interface PaginatedClearances {
  data: {
    items: any[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
      stats?: {
        total: number;
        pending: number;
        inReview: number;
        approved: number;
        rejected: number;
      };
    };
  };
}

export class PublicClearanceDto {
  data: {
    requestId: string;
    status: string;
    type: string;
    createdAt: Date;
    year?: number;
    approvals: {
      office: string;
      status: string;
      signedBy?: string;
      signedOn?: Date;
    }[];
  };
}

export class SignClearanceDto {
  @IsString()
  @IsNotEmpty()
  signature: string;
}