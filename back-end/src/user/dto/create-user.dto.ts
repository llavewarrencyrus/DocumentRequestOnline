import { IsString, IsEmail, IsOptional, IsInt, Min, Max, IsIn, IsBoolean, Length, Matches, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsIn(['Admin', 'Registrar', 'Cashier', 'Librarian', 'Director', 'Accountant', 'Counselor', 'Inventory', 'Student'])
  role: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  office?: string;

  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}