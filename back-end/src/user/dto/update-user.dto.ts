import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsEmail, IsOptional, IsIn, IsBoolean, Length } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Admin', 'Registrar', 'Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory', 'Student'])
  role?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  office?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  lastName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  middleName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}