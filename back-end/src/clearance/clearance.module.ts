// src/clearance/clearance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClearanceController } from '@clearance/clearance.controller';
import { ClearanceService } from '@clearance/clearance.service';
import { Clearance } from '@clearance/clearance.entity';
import { ClearanceApprovalsController } from './clearance-approval/approval.controller';
import { ClearanceLogsController } from './clearance-log/log.controller';
import { ClearanceApprovalsService } from './clearance-approval/approval.service';
import { ClearanceLogsService } from './clearance-log/log.service';
import { ClearanceApproval } from './clearance-approval/approval.entity';
import { ClearanceLog } from './clearance-log/log.entity';
import { NotificationModule } from '@notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clearance,
      ClearanceApproval,
      ClearanceLog,
    ]),
    NotificationModule,
  ],
  controllers: [
    ClearanceController,
    ClearanceApprovalsController,
    ClearanceLogsController,
  ],
  providers: [
    ClearanceService,
    ClearanceApprovalsService,
    ClearanceLogsService,
  ],
  exports: [
    ClearanceService,
    ClearanceApprovalsService,
    ClearanceLogsService,
  ],
})
export class ClearanceModule {}