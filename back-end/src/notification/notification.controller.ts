// backend/src/notification/notification.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Sse,
  MessageEvent,
  Logger,
  UnauthorizedException
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationSseService } from './notification-sse.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import type { Request as ExpressRequest } from 'express';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../auth/user.decorator';
import { SkipTransform } from '../common/interceptors/transform.interceptor';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private notificationService: NotificationService,
    private sseService: NotificationSseService,
    private jwtService: JwtService  // Inject JwtService
  ) {}

  /**
   * Regular endpoints - protected by JwtAuthGuard
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(
    @User() user: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: string
  ) {
    const result = await this.notificationService.getUserNotifications(
      user.username,
      user.role,
      {
        limit: limit ? parseInt(limit.toString()) : 50,
        offset: offset ? parseInt(offset.toString()) : 0,
        unreadOnly: unreadOnly === 'true'
      }
    );

    return {
      success: true,
      data: result
    };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id') id: string,
    @User() user: any
  ) {
    const notification = await this.notificationService.markAsRead(
      parseInt(id),
      user.username,
      user.role
    );

    return {
      success: true,
      data: notification
    };
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@User() user: any) {
    await this.notificationService.markAllAsRead(user.username, user.role);

    return {
      success: true,
      message: 'All notifications marked as read'
    };
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@User() user: any) {
    const count = await this.notificationService.getUnreadCount(user.username, user.role);

    return {
      success: true,
      data: { count }
    };
  }

  /**
   * Endpoint to get a one-time connection token for SSE
   */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  async initiateConnection(@User() user: any) {
    // Generate a short-lived token for SSE connection
    const connectionToken = this.jwtService.sign(
      {
        sub: user.userId,
        username: user.username,
        role: user.role,
        temp: true
      },
      { expiresIn: '30s' } // Short expiration for security
    );

    return {
      connectionToken,
      sseUrl: `/api/notifications/stream?token=${connectionToken}`
    };
  }

  /**
   * SSE endpoint - handles its own auth via token parameter
   */
  @Sse('stream')
  @SkipTransform()
  async stream(@Req() req: ExpressRequest): Promise<Observable<MessageEvent>> {
    // Extract token from cookie
    const token = req.cookies?.['access_token'] || req.query.token as string;

    if (!token) {
      console.log('No token provided in cookie');
      throw new UnauthorizedException('No authentication token');
    }

    try {
      // Verify the token
      const payload = await this.jwtService.verifyAsync(token);

      const user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role
      };

      const connectionId = uuidv4();

      this.logger.log(`SSE connection established for user: ${user.username} (${user.role})`);

      // Register the connection
      this.sseService.registerConnection(
        connectionId,
        user.username,
        user.role
      );

      const observable = this.sseService.getConnectionObservable(connectionId);

      if (!observable) {
        throw new Error('Failed to establish SSE connection');
      }

      // Clean up on connection close
      req.on('close', () => {
        this.logger.log(`SSE connection closed for user: ${user.username}`);
        this.sseService.removeConnection(connectionId);
      });

      return observable;

    } catch (error) {
      this.logger.error(`SSE connection failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}