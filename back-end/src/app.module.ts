import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestController } from './request/request.controller';
import { ReferenceController } from './reference/reference.controller';
import { RequestService } from './request/request.service';
import { ReferenceService } from './reference/reference.service';
import { DocumentRequest } from './request/document-request.entity';
import { RequestDocument } from './reference/request-document.entity';
import { DocumentOption } from './reference/document-option.entity';
import { Course } from './reference/course.entity';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { Notification } from './notification/notification.entity';
import { Receipt } from './upload/receipt.entity';
import { UploadModule } from './upload/upload.module';
import { ClearanceModule } from './clearance/clearance.module';
import { Clearance } from './clearance/clearance.entity';
import { ClearanceApproval } from './clearance/clearance-approval/approval.entity';
import { ClearanceLog } from './clearance/clearance-log/log.entity';
import { User, UserInvitation } from './user/user.entity';
import { UserModule } from './user/user.module';
import { Department } from './reference/department.entity';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'documentrequest'),
        entities: [
          UserInvitation,
          User,
          DocumentRequest,
          RequestDocument,
          DocumentOption,
          Course,
          Department,
          Notification,
          Receipt,
          Clearance,
          ClearanceApproval,
          ClearanceLog,
        ],
        synchronize: configService.get('NODE_ENV') === 'development', // Set to false in production
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      UserInvitation,
      User,
      DocumentRequest,
      RequestDocument,
      DocumentOption,
      Course,
      Department,
      Notification,
      Receipt,
      Clearance,
      ClearanceApproval,
      ClearanceLog,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    UserModule,
    AuthModule,
    NotificationModule,
    UploadModule,
    ClearanceModule,
  ],
  controllers: [RequestController, ReferenceController],
  providers: [
    RequestService,
    ReferenceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}