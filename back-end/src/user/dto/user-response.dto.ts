import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id?: number;

  @Expose()
  username: string;

  @Expose()
  email?: string;

  @Expose()
  role: string;

  @Expose()
  office?: string;

  @Expose()
  departmentId?: string;

  @Expose()
  firstName?: string;

  @Expose()
  lastName?: string;

  @Expose()
  middleName?: string;

  @Expose()
  courseId?: number;

  @Expose()
  courseCode?: string;

  @Expose()
  courseDescription?: string;

  @Expose()
  gender?: string;

  @Expose()
  birthDate?: string;

  @Expose()
  code?: string;

  @Expose()
  years?: number;

  @Expose()
  isActive?: boolean;

  @Expose()
  lastLogin?: Date;

  @Expose()
  createdAt?: Date;

  @Exclude()
  passwordHash?: string;

  @Exclude()
  externalToken?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}