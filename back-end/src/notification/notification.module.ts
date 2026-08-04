// backend/src/notification/notification.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationSseService } from './notification-sse.service';
import { DocumentRequest } from '../request/document-request.entity';
import { RequestDocument } from '../reference/request-document.entity';
import { UploadModule } from '../upload/upload.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, DocumentRequest, RequestDocument]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
    forwardRef(() => UploadModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationSseService],
  exports: [NotificationService]
})
export class NotificationModule {}