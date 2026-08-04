// modules/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  Delete,
  Get,
  Res,
  BadRequestException,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationService } from '../notification/notification.service';
import { Logger } from '@nestjs/common';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService
  ) {}

  @Post(':id/upload-receipt')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads/receipts');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true, mode: 0o750 });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = crypto.randomBytes(32).toString('hex');
          const timestamp = Date.now();
          const ext = path.extname(file.originalname).toLowerCase();

          const allowedExt = ['.png', '.jpg', '.jpeg', '.pdf'];
          if (!allowedExt.includes(ext)) {
            return cb(new BadRequestException('Invalid file type'), '');
          }

          cb(null, `receipt_${timestamp}_${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'application/pdf',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only PNG, JPG, JPEG, and PDF are allowed.'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadReceipt(
    @Param('id', ParseIntPipe) requestId: number,
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.saveReceiptInfo(requestId, file, {
      userId: user.userId,
      role: user.role,
      username: user.username
    });

    // Send notification to all Registrar users when a student uploads a receipt
    if (user.role === 'Student') {
      try {
        await this.notificationService.createReceiptUploadedNotification(requestId);
        this.logger.log(`Receipt upload notification sent for request #${requestId}`);
      } catch (error) {
        this.logger.error(`Failed to send receipt upload notification: ${error.message}`);
      }
    }

    return result;
  }

  @Post(':id/upload-multiple-receipts')
  @UseInterceptors(
    FilesInterceptor('receipts', 10, { // Allow up to 10 files
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads/receipts');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true, mode: 0o750 });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = crypto.randomBytes(32).toString('hex');
          const timestamp = Date.now();
          const ext = path.extname(file.originalname).toLowerCase();

          const allowedExt = ['.png', '.jpg', '.jpeg', '.pdf'];
          if (!allowedExt.includes(ext)) {
            return cb(new BadRequestException('Invalid file type'), '');
          }

          cb(null, `receipt_${timestamp}_${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'application/pdf',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only PNG, JPG, JPEG, and PDF are allowed.'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
      },
    }),
  )
  async uploadMultipleReceipts(
    @Param('id', ParseIntPipe) requestId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @User() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const result = await this.uploadService.saveMultipleReceiptsInfo(requestId, files, {
      userId: user.userId,
      role: user.role,
      username: user.username
    });

    // Send notification to all Registrar users when a student uploads receipts
    if (user.role === 'Student') {
      try {
        await this.notificationService.createReceiptUploadedNotification(requestId);
        this.logger.log(`Multiple receipts upload notification sent for request #${requestId}`);
      } catch (error) {
        this.logger.error(`Failed to send receipt upload notification: ${error.message}`);
      }
    }

    return result;
  }

  @Get(':id/receipts')
  async getAllReceiptsInfo(
    @Param('id', ParseIntPipe) requestId: number,
    @User() user: any,
  ) {
    const receiptsInfo = await this.uploadService.getAllReceiptsInfo(
      requestId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );

    return {
      success: true,
      data: receiptsInfo
    };
  }

  @Get('receipt/:receiptId/view')
  async viewReceipt(
    @Param('receiptId', ParseIntPipe) receiptId: number,
    @Res() res: Response,
    @User() user: any,
  ) {
    const receipt = await this.uploadService.getReceipt(
      receiptId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const filePath = path.join(process.cwd(), receipt.filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Receipt file not found');
    }

    // Security: Don't expose internal paths
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(receipt.originalName)}"`);
    res.setHeader('Content-Type', receipt.mimeType);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(filePath);
  }

  @Get('receipt/:receiptId/download')
  async downloadReceipt(
    @Param('receiptId', ParseIntPipe) receiptId: number,
    @Res() res: Response,
    @User() user: any,
  ) {
    const receipt = await this.uploadService.getReceipt(
      receiptId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const filePath = path.join(process.cwd(), receipt.filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Receipt file not found');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(receipt.originalName)}"`);
    res.setHeader('Content-Type', receipt.mimeType);
    res.setHeader('Content-Length', receipt.fileSize);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.sendFile(filePath);
  }

  @Delete('receipt/:receiptId')
  async deleteReceipt(
    @Param('receiptId', ParseIntPipe) receiptId: number,
    @User() user: any,
  ) {
    return this.uploadService.deleteReceipt(
      receiptId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );
  }

  @Get(':id/receipt/history')
  @Roles('Admin', 'Registrar')
  @UseGuards(RolesGuard)
  async getReceiptHistory(
    @Param('id', ParseIntPipe) requestId: number,
    @User() user: any,
  ) {
    return this.uploadService.getReceiptHistory(
      requestId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );
  }

  @Get(':id/receipts/all')
  @Roles('Admin', 'Registrar')
  @UseGuards(RolesGuard)
  async getAllReceiptsForRequest(
    @Param('id', ParseIntPipe) requestId: number,
    @User() user: any,
  ) {
    return this.uploadService.getAllReceiptsForRequest(
      requestId,
      {
        userId: user.userId,
        role: user.role,
        username: user.username
      }
    );
  }
}