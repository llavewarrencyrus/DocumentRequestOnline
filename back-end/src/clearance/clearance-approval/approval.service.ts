// src/clearance-approvals/clearance-approvals.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository, FindOptionsWhere, Between, DataSource } from 'typeorm';
import { ClearanceApproval } from '@clearance/clearance-approval/approval.entity';
import { ClearanceLog } from '@clearance/clearance-log/log.entity';
import { CreateClearanceApprovalDto, UpdateClearanceApprovalDto, ClearanceApprovalQueryDto } from '@clearance/clearance-approval/approval.dto';
import { NotificationService } from '@notification/notification.service';

@Injectable()
export class ClearanceApprovalsService {
  constructor(
    @InjectRepository(ClearanceApproval)
    private approvalRepository: Repository<ClearanceApproval>,
    private dataSource: DataSource,
    private notificationService: NotificationService,
  ) {}

  async findAll(query: ClearanceApprovalQueryDto): Promise<{ data: ClearanceApproval[]; total: number; }> {
    const { clearanceId, office, status, page = 1, limit = 10 } = query;

    const where: FindOptionsWhere<ClearanceApproval> = {};

    if (clearanceId) where.clearanceId = clearanceId;
    if (office) where.office = office;
    if (status) where.status = status;

    const [data, total] = await this.approvalRepository.findAndCount({
      where,
      relations: ['clearance'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<ClearanceApproval> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['clearance'],
    });

    if (!approval) {
      throw new NotFoundException(`Clearance approval with ID ${id} not found`);
    }

    return approval;
  }

  async findByClearanceId(clearanceId: number): Promise<ClearanceApproval[]> {
    return this.approvalRepository.find({
      where: { clearanceId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByOffice(office: string): Promise<ClearanceApproval[]> {
    return this.approvalRepository.find({
      where: { office },
      relations: ['clearance'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: string): Promise<ClearanceApproval[]> {
    return this.approvalRepository.find({
      where: { status },
      relations: ['clearance'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(createApprovalDto: CreateClearanceApprovalDto): Promise<ClearanceApproval> {
    const approval = this.approvalRepository.create(createApprovalDto);
    return this.approvalRepository.save(approval);
  }

  async update(
    id: number,
    updateApprovalDto: UpdateClearanceApprovalDto,
    user?: any,
    footprint?: { ip: string; ua: string; }
  ): Promise<ClearanceApproval> {

    // Use a transaction to ensure both approval and log are saved together
    return await this.dataSource.transaction(async (manager) => {
      const approval = await manager.findOne(ClearanceApproval, {
        where: { id },
        relations: ['clearance']
      });

      if (!approval) throw new NotFoundException('Approval record not found');

      if (updateApprovalDto.status === 'APPROVED') {
        updateApprovalDto.signedOn = new Date();
        // Use the authenticated user's name if available
        updateApprovalDto.signedBy = user?.username || updateApprovalDto.signedBy;

        // 1. Generate SHA-256 Hash (Digital Fingerprint)
        const signaturePayload = JSON.stringify({
          clearanceId: approval.clearanceId,
          requestId: approval.clearance.requestId,
          office: approval.office,
          signer: updateApprovalDto.signedBy,
          timestamp: updateApprovalDto.signedOn.toISOString(),
        });

        const hash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

        const log = manager.create(ClearanceLog, {
          clearanceId: approval.clearanceId,
          action: `OFFICE_APPROVED`,
          userId: updateApprovalDto.signedBy,
          metadata: {
            office: approval.office,
            signature: hash,
            ip: footprint?.ip,
            userAgent: footprint?.ua,
            remarks: updateApprovalDto.remarks
          },
          date: updateApprovalDto.signedOn
        });
        await manager.save(log);
      }

      if (updateApprovalDto.status === 'ON_HOLD') {
        updateApprovalDto.signedBy = undefined;
        updateApprovalDto.signedOn = undefined;

        // Optional: Log when something is put on hold
        const metadata: any = {};
        if (updateApprovalDto.remarks) {
          metadata.remarks = updateApprovalDto.remarks;
        }

        metadata.office = approval.office;

        await manager.insert(ClearanceLog, {
          clearanceId: approval.clearanceId,
          action: 'OFFICE_ON_HOLD',
          userId: user?.username,
          metadata,
          date: new Date()
        });

        // Notify the requestor that clearance is on hold
        await this.notificationService.createClearanceOnHoldNotification(
          approval.clearanceId,
          approval.clearance.requestId,
          approval.office,
          updateApprovalDto.remarks
        ).catch(error => {
          console.error(`Failed to send clearance on hold notification for request ${approval.clearance.requestId}:`, error);
        });
      }

      // Check if this approval completes all required approvals
      if (updateApprovalDto.status === 'APPROVED') {
        // After saving the approval, check if all approvals for this clearance are now approved
        const allApprovals = await manager.find(ClearanceApproval, {
          where: { clearanceId: approval.clearanceId }
        });

        const allApproved = allApprovals.every(a => a.status === 'APPROVED');

        if (allApproved) {
          // All offices have approved - send notifications to student and registrar
          await this.notificationService.createClearanceApprovedNotification(
            approval.clearance.requestId
          ).catch(error => {
            console.error(`Failed to send clearance approved notification for request ${approval.clearance.requestId}:`, error);
          });
        }
      }

      Object.assign(approval, updateApprovalDto);
      return await manager.save(approval);
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.approvalRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Clearance approval with ID ${id} not found`);
    }
  }
}