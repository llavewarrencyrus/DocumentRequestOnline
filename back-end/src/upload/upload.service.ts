// modules/upload/upload.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { fileTypeFromBuffer } from 'file-type';
import { DocumentRequest } from '../request/document-request.entity';
import { Receipt } from './receipt.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { validate } from 'class-validator';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(DocumentRequest)
    private requestRepository: Repository<DocumentRequest>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
  ) { }

  async getAllReceiptsInfo(
    requestId: number,
    user: { userId: string; role: string; username: string }
  ) {
    const receipts = await this.getAllReceipts(requestId, user);

    return receipts.map(receipt => ({
      id: receipt.id,
      fileName: receipt.originalName,
      fileSize: receipt.fileSize,
      uploadedAt: receipt.uploadedAt,
      mimeType: receipt.mimeType,
      fileHash: receipt.fileHash,
      metadata: receipt.metadata,
    }));
  }

  async getAllReceipts(
    requestId: number,
    user: { userId: string; role: string; username: string }
  ): Promise<Receipt[]> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check authorization
    if (user.role !== 'Admin' && user.role !== 'Registrar' && request.studentId !== user.userId) {
      throw new ForbiddenException('You do not have permission to access receipts for this request');
    }

    // Get all active receipts
    const receipts = await this.receiptRepository.find({
      where: {
        requestId,
        isActive: true
      },
      order: { uploadedAt: 'DESC' },
    });

    return receipts;
  }

  async getReceipt(
    receiptId: number,
    user: { userId: string; role: string; username: string }
  ): Promise<Receipt | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId, isActive: true },
      relations: ['request'],
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Check authorization
    if (user.role !== 'Admin' && user.role !== 'Registrar' && receipt.request?.studentId !== user.userId) {
      throw new ForbiddenException('You do not have permission to access this receipt');
    }

    return receipt;
  }

  async deleteReceipt(
    receiptId: number,
    user: { userId: string; role: string; username: string }
  ) {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId, isActive: true },
      relations: ['request'],
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Only allow deletion for pending requests
    if (receipt.request?.status !== 'Pending') {
      throw new BadRequestException('Receipt can only be deleted for pending requests');
    }

    // Soft delete by deactivating
    receipt.isActive = false;
    await this.receiptRepository.save(receipt);

    // Optionally delete the file from disk
    const filePath = path.join(process.cwd(), receipt.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      message: 'Receipt deleted successfully',
      data: null
    };
  }

  async getReceiptHistory(
    requestId: number,
    user: { userId: string; role: string; username: string }
  ) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check authorization (only admin/staff can view history)
    if (user.role !== 'Admin' && user.role !== 'Registrar') {
      throw new ForbiddenException('You do not have permission to view receipt history');
    }

    const receipts = await this.receiptRepository.find({
      where: { requestId },
      order: { uploadedAt: 'DESC' },
    });

    return receipts.map(receipt => ({
      id: receipt.id,
      fileName: receipt.originalName,
      fileSize: receipt.fileSize,
      uploadedAt: receipt.uploadedAt,
      uploadedBy: receipt.uploadedBy,
      isActive: receipt.isActive,
      mimeType: receipt.mimeType,
    }));
  }

  async getAllReceiptsForRequest(
    requestId: number,
    user: { userId: string; role: string; username: string }
  ) {
    // Check authorization
    if (user.role !== 'Admin' && user.role !== 'Registrar') {
      throw new ForbiddenException('Access denied');
    }

    const receipts = await this.receiptRepository.find({
      where: { requestId },
      order: { uploadedAt: 'DESC' },
    });

    return receipts;
  }

  async validateFileContent(buffer: Buffer, expectedMime: string) {
    const type = await fileTypeFromBuffer(buffer);
    if (!type || type.mime !== expectedMime) {
      throw new BadRequestException('File content mismatch: Actual content does not match reported extension.');
    }
  }

  async saveReceiptInfo(
    requestId: number,
    file: Express.Multer.File,
    user: { userId: string; role: string; username: string }
  ) {
    // First, check if the request exists and user has permission
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check authorization
    if (user.role !== 'Admin' && user.role !== 'Registrar' && request.studentId !== user.userId) {
      throw new ForbiddenException('You do not have permission to upload receipts for this request');
    }

    // Calculate file hash for integrity
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    this.validateFileContent(fileBuffer, file.mimetype);

    // Create receipt record
    const receipt = this.receiptRepository.create({
      requestId,
      fileName: file.filename,
      filePath: relativePath,
      fileSize: file.size,
      fileHash,
      mimeType: file.mimetype,
      originalName: file.originalname,
      uploadedBy: user.userId,
      uploadedAt: new Date(),
      isActive: true,
    });

    await this.receiptRepository.save(receipt);

    return {
      receiptId: receipt.id,
      requestId: receipt.requestId,
      fileName: receipt.originalName,
      fileSize: receipt.fileSize,
      uploadedAt: receipt.uploadedAt,
      mimeType: receipt.mimeType,
      fileUrl: `/api/upload/receipt/${receipt.id}/view`,
    };
  }

  async saveMultipleReceiptsInfo(
    requestId: number,
    files: Express.Multer.File[],
    user: { userId: string; role: string; username: string }
  ) {
    // Check if request exists and user has permission
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check authorization
    if (user.role !== 'Admin' && user.role !== 'Registrar' && request.studentId !== user.userId) {
      throw new ForbiddenException('You do not have permission to upload receipts for this request');
    }

    const savedReceipts: any[] = [];

    for (const file of files) {
      // Calculate file hash for integrity
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

      // Create receipt record
      const receipt = this.receiptRepository.create({
        requestId,
        fileName: file.filename,
        filePath: relativePath,
        fileSize: file.size,
        fileHash,
        mimeType: file.mimetype,
        originalName: file.originalname,
        uploadedBy: user.userId,
        uploadedAt: new Date(),
        isActive: true,
      });

      const savedReceipt = await this.receiptRepository.save(receipt);
      savedReceipts.push({
        receiptId: savedReceipt.id,
        requestId: savedReceipt.requestId,
        fileName: savedReceipt.originalName,
        fileSize: savedReceipt.fileSize,
        uploadedAt: savedReceipt.uploadedAt,
        mimeType: savedReceipt.mimeType,
        fileUrl: `/api/upload/receipt/${savedReceipt.id}/view`,
      });
    }

    return {
      receipts: savedReceipts,
      count: savedReceipts.length
    };
  }
}