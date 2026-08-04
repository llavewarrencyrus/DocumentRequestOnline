// backend/src/modules/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
// import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async findAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('lastLoginFrom') lastLoginFrom?: string,
    @Query('lastLoginTo') lastLoginTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    const activeStatus = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.userService.findAll({
      role,
      isActive: activeStatus,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      lastLoginFrom,
      lastLoginTo,
      createdFrom,
      createdTo,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findByIdWithResponse(id);
  }

  @Post('complete-setup')
  @HttpCode(HttpStatus.OK)
  async completeSetup(@Body() body: { token: string; password: string; }) {
    return await this.userService.completeSetup(body.token, body.password);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id', ParseIntPipe) id: number) {
    await this.userService.activate(id);
    return { message: 'User activated successfully' };
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deactivate(id);
    return { message: 'User deactivated successfully' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.delete(id);
    return { message: 'User deleted successfully' };
  }

  @Get(':id/copy-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async getToken(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findToken(id);
  }

  @Post(':id/password-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  async generatePasswordToken(@Param('id', ParseIntPipe) id: number) {
    return this.userService.generatePasswordToken(id);
  }

  @Get('roles/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async getRoles() {
    return {
      roles: [
        { value: 'Admin', label: 'Administrator' },
        { value: 'Cashier', label: 'Cashier' },
        { value: 'Librarian', label: 'Librarian' },
        { value: 'Director', label: 'Director' },
        { value: 'Accountant', label: 'Accountant' },
        { value: 'Inventory', label: 'Inventory' },
        { value: 'Counselor', label: 'Counselor' },
      ],
    };
  }

  @Get('offices/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async getOffices() {
    return {
      offices: [
        { value: 'CASHIER', label: 'Cashier Office' },
        { value: 'LIBRARY', label: 'Library' },
        { value: 'SCHOOL', label: 'School Director' },
        { value: 'ACCOUNTS', label: 'Accounting Office' },
        { value: 'INVENTORY', label: 'Inventory Office' },
        { value: 'CCSD', label: 'Counseling Center' },
      ],
    };
  }
}