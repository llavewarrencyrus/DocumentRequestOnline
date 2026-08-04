import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsIn(['Pending', 'Processing', 'Ready for Payment', 'Available for Claiming', 'Approved', 'Completed', 'Declined', 'UNDER_REVIEW'])
  status: string;

  @IsString()
  @IsOptional()
  token?: string;
}