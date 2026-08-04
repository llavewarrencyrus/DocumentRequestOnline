// auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './user.decorator';
import { AuthService } from './auth.service';
import type { UserPayload } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@User() user: UserPayload) {
    return this.authService.login(user);
  }

  @Post('logout')
  async logout() {
    // Client should discard the token
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@User() user: UserPayload) {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@User() user: UserPayload) {
    // Generate new token with same user data
    return this.authService.login(user);
  }
}