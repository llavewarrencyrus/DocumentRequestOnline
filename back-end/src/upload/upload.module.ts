// modules/upload/upload.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Receipt } from './receipt.entity';
import { DocumentRequest } from '../request/document-request.entity';
import { AuthModule } from '../auth/auth.module'; 
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, DocumentRequest]),
    AuthModule,
    forwardRef(() => NotificationModule)
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}