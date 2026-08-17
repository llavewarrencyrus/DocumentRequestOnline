import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';

export interface LoginCredentials {
  username: string;
  birthdate?: string;
  password: string;
}

export interface UserPayload {
  userId: string;
  username: string;
  role: string | string[];
  firstName?: string;
  lastName?: string;
  middleName?: string;
  courseId?: number;
  courseCode?: string;
  courseDescription?: string;
  gender?: string;
  birthDate?: string;
  code?: string;
  years?: number;
  externalToken?: string;
  office?: string;
  departmentId?: number;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  private readonly demoMode = process.env.DEMO_MODE === 'true';

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateUser(
    credentials: LoginCredentials,
  ): Promise<UserPayload | null> {
    const { username, password } = credentials;

    // Check demo/hardcoded accounts first
    const demoUserNames = [
      'arc.staff',
      'arc.staff2',
      'library.staff',
      'school.director',
      'accountant.staff',
      'counselor.staff',
      'inventory.staff',
      'arc.admin',
      'student.demo',
      '20153953',
      '20201234',
    ];

    if (demoUserNames.includes(username)) {
      console.log('Demo/hardcoded authentication for:', username);
      return this.validateDemoUser(username, password);
    }

    try {
      const user = await this.userService.findByUsername(username);

      if (!user) {
        console.log('User not found in local database:', username);
        return null;
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        console.log('Invalid password for user:', username);
        return null;
      }

      await this.userService.updateLastLogin(user.id);

      console.log('User validated successfully locally:', username);

      return {
        userId: user.username,
        username: user.username,
        role: user.role,
        firstName: user.role || '',
        lastName: '',
        office: user.office || '',
        departmentId: user.departmentId || undefined,
      };
    } catch (error) {
      console.error('Validation failed:', error.message);
      return null;
    }
  }

  async login(user: UserPayload) {
    const jwtPayload = {
      sub: user.userId,
      username: user.username,
      role: user.role,
      office: user.office,
      departmentId: user.departmentId,
    };

    const userData = {
      userId: user.userId,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      courseId: user.courseId,
      courseCode: user.courseCode,
      courseDescription: user.courseDescription,
      gender: user.gender,
      birthDate: user.birthDate,
      code: user.code,
      years: user.years,
      office: user.office,
      departmentId: user.departmentId,
      externalToken: user.externalToken,
    };

    const access_token = this.jwtService.sign(jwtPayload, { expiresIn: '2h' });

    return {
      access_token,
      user: userData,
    };
  }

  private validateDemoUser(
    username: string,
    password: string,
  ): UserPayload | null {
    const demoAccounts = [
      {
        username: 'arc.staff',
        password: 'arc123',
        userId: 'staff-001',
        role: ['Registrar', 'FrontDesk'],
        office: 'ARC',
        firstName: 'ARC',
        lastName: '',
        middleName: '',
        externalToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiYXJjX3N0YWZmIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiJhcmNfc3RhZmYiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJSZWdpc3RyYXIiLCJleHAiOjE3NzI2NzQ3NTQsImlzcyI6IkFSQyIsImF1ZCI6IkFSQyJ9.-2fBWS7Z7Ah3n0jkbv0bt3gEaJpUBEaOiZfKWBZojNk',
      },
      {
        username: 'arc.staff2',
        password: 'arc123',
        userId: 'staff-002',
        role: ['Registrar', 'FrontDesk'],
        office: 'ARC',
        firstName: 'ARC',
        lastName: '',
        middleName: '',
        externalToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiYXJjX3N0YWZmMiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiYXJjX3N0YWZmMiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlJlZ2lzdHJhciIsImV4cCI6MTc3MjY3NDc1NCwiaXNzIjoiQVJDIiwiYXVkIjoiQVJDIn0.fMdo-m-2YAOZfrnq3NeYO-689541ZgU5nANtZcJgoTs',
      },
      {
        username: 'cashier.staff',
        password: 'cashier123',
        userId: 'staff-002',
        role: 'Cashier',
        office: 'CASHIER',
        firstName: 'Cashier',
        lastName: '',
        middleName: '',
      },
      {
        username: 'library.staff',
        password: 'library123',
        userId: 'staff-003',
        role: 'Librarian',
        office: 'LIBRARY',
        firstName: 'Librarian',
        lastName: '',
        middleName: '',
      },
      {
        username: 'school.director',
        password: 'director123',
        userId: 'staff-004',
        role: 'Director',
        office: 'SCHOOL',
        firstName: 'Director',
        lastName: '',
        middleName: '',
      },
      {
        username: 'accountant.staff',
        password: 'accountant123',
        userId: 'staff-005',
        role: 'Accountant',
        office: 'ACCOUNTS',
        firstName: 'Accountant',
        lastName: '',
        middleName: '',
      },
      {
        username: 'counselor.staff',
        password: 'counselor123',
        userId: 'staff-006',
        role: 'Counselor',
        office: 'CCSD',
        firstName: 'Counselor',
        lastName: '',
        middleName: '',
      },
      {
        username: 'inventory.staff',
        password: 'inventory123',
        userId: 'staff-007',
        role: 'Inventory',
        office: 'INVENTORY',
        firstName: 'Inventory',
        lastName: '',
        middleName: '',
      },
      {
        username: 'arc.admin',
        password: 'admin123',
        userId: 'admin-001',
        role: 'Admin',
        firstName: 'ARC',
        lastName: 'Admin',
        middleName: '',
      },
      {
        username: 'student.demo',
        password: 'student123',
        userId: 'student-001',
        role: 'Student',
        firstName: 'Demo',
        lastName: 'Student',
        middleName: 'M',
        courseId: 1,
        courseCode: 'BSIT',
        courseDescription: 'Bachelor of Science in Information Technology',
        code: '2020-12345',
        gender: 'MALE',
        birthDate: '2000-01-01',
        years: 4,
      },
      {
        username: '20201234',
        password: 'student123',
        userId: '20201234',
        role: 'Student',
        firstName: 'Demo',
        lastName: 'Student',
        middleName: 'Test',
        courseId: 1,
        courseCode: 'BSIT',
        courseDescription: 'Bachelor of Science in Information Technology',
        code: '20201234',
        gender: 'MALE',
        birthDate: '2002-11-02',
        years: 4,
      },
    ];

    const user = demoAccounts.find(
      (account) =>
        account.username === username && account.password === password,
    );

    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;

    if (userWithoutPassword.role.includes('Registrar')) {
      userWithoutPassword.role = 'Registrar';
    }
    return userWithoutPassword;
  }
}
