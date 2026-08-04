// frontend/src/app/modules/users/user.model.ts
export interface User {
  id: number;
  username: string;
  role: string;
  office: string | null;
  departmentId: number | null;
  isChangePass: boolean;
  isActive: boolean;
  lastLogin: Date | null;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  username: string;
  role: string;
  office?: string;
  departmentId?: number;
  isActive?: boolean;
}

export interface UpdateUserDto {
  role?: string;
  office?: string;
  departmentId?: number;
  isActive?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  roles: Record<string, number>;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    stats?: UserStats;
  };
}