import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional, Min, Max, ValidateNested, IsArray, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentItemDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  requestorLastName: string;

  @IsString()
  @IsNotEmpty()
  requestorFirstName: string;

  @IsString()
  @IsOptional()
  requestorMiddleName?: string;

  @IsNumber()
  @IsNotEmpty()
  requestorCourseId: number;

  @IsString()
  @IsNotEmpty()
  requestorId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsNotEmpty()
  requestCategory: string;

  @IsBoolean()
  @IsNotEmpty()
  needsClearance: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents: DocumentItemDto[];

  @IsNumber()
  @Min(1)
  @Max(10)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsString()
  @IsNotEmpty()
  estimatedClaimDate: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  year: number;
}