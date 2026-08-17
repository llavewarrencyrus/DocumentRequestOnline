import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { DocumentRequest } from './document-request.entity';
import { RequestDocument } from '../reference/request-document.entity';
import { DocumentOption } from '../reference/document-option.entity';
import { Receipt } from '../upload/receipt.entity';
import { CreateRequestDto } from './create-request.dto';
import { UpdateStatusDto } from './update-status.dto';
import { DeclineRequestDto } from './decline-request.dto';
import { RemoveDocumentsDto } from './remove-documents.dto';
import { NotificationService } from '../notification/notification.service';

export interface PaginatedRequests {
  data: {
    items: DocumentRequest[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  };
}

export interface ExternalStatusResponse {
  id: string;
  status: string;
}

export interface RequestCounts {
  total: number;
  pending: number;
  approved: number;
  processing: number;
  available: number;
  completed: number;
  declined: number;
}

@Injectable()
export class RequestService {
  private readonly demoMode = process.env.DEMO_MODE === 'true';

  findByRequestNumber: any;
  constructor(
    @InjectRepository(DocumentRequest)
    private requestRepository: Repository<DocumentRequest>,
    @InjectRepository(RequestDocument)
    private requestDocumentRepository: Repository<RequestDocument>,
    @InjectRepository(DocumentOption)
    private documentOptionRepository: Repository<DocumentOption>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    private dataSource: DataSource,
    private notificationService: NotificationService,
  ) {}

  private async bulkEnrichReceiptCounts(
    requests: DocumentRequest[],
  ): Promise<DocumentRequest[]> {
    const requestIds = requests.map((r) => r.id);

    // 1. Fetch counts in one query
    const countResults = await this.receiptRepository
      .createQueryBuilder('receipt')
      .select('receipt.requestId', 'requestId')
      .addSelect('COUNT(receipt.id)', 'count')
      .where('receipt.requestId IN (:...requestIds)', { requestIds })
      .andWhere('receipt.isActive = :isActive', { isActive: true })
      .groupBy('receipt.requestId')
      .getRawMany();

    // 2. Create the Lookup Map
    const countMap = countResults.reduce(
      (acc, row) => {
        acc[row.requestId] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<number, number>,
    );

    // 3. Map back to the original objects
    return requests.map((request) => ({
      ...request,
      receiptCount: countMap[request.id] || 0,
      hasReceipt: (countMap[request.id] || 0) > 0,
    }));
  }

  private async enrichWithReceiptInfo(request: DocumentRequest): Promise<any> {
    const count = await this.receiptRepository.count({
      where: {
        requestId: request.id,
        isActive: true,
      },
    });

    return {
      ...request,
      hasReceipt: count > 0,
      receiptCount: count,
    };
  }

  async findAllPaginated(
    externalToken: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
    hasReceipt?: string,
    dateFrom?: string,
    dateTo?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<PaginatedRequests> {
    // Map frontend sort fields to database columns
    const sortFieldMap: Record<string, string> = {
      id: 'request.id',
      requestorLastName: 'request.requestorLastName',
      dateRequested: 'request.dateRequested',
      status: 'request.status',
    };

    // Default sort field and order
    const sortField =
      sortBy && sortFieldMap[sortBy]
        ? sortFieldMap[sortBy]
        : 'request.dateRequested';
    const order = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const queryBuilder = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.documents', 'documents')
      .leftJoinAndSelect('request.course', 'course')
      .orderBy(sortField, order);

    if (status && status !== 'all') {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const searchWords = search
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      if (searchWords.length === 1) {
        // Single word search - use ILIKE for all fields
        queryBuilder.andWhere(
          '(request.id::text ILIKE :search OR ' +
            'request.studentId ILIKE :search OR ' +
            'request.requestorFirstName ILIKE :search OR ' +
            'request.requestorLastName ILIKE :search OR ' +
            'request.requestNumber ILIKE :search OR ' +
            'request.shortCode ILIKE :search OR ' +
            "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorMiddleName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search OR " +
            "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search)",
          { search: searchTerm },
        );
      } else {
        // Multi-word search - check if any word matches first name and any word matches last name
        const firstNameConditions = searchWords
          .map((_, index) => `request.requestorFirstName ILIKE :word${index}`)
          .join(' OR ');
        const lastNameConditions = searchWords
          .map((_, index) => `request.requestorLastName ILIKE :word${index}`)
          .join(' OR ');
        const middleNameConditions = searchWords
          .map((_, index) => `request.requestorMiddleName ILIKE :word${index}`)
          .join(' OR ');
        const shortCodeConditions = searchWords
          .map((_, index) => `request.shortCode ILIKE :word${index}`)
          .join(' OR ');

        const params: any = {};
        searchWords.forEach((word, index) => {
          params[`word${index}`] = `%${word}%`;
        });

        queryBuilder.andWhere(
          `(${firstNameConditions} OR ${lastNameConditions} OR ${middleNameConditions} OR ${shortCodeConditions} OR ` +
            "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorMiddleName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search OR " +
            "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search)",
          { ...params, search: searchTerm },
        );
      }
    }

    if (hasReceipt && hasReceipt !== 'all') {
      const hasReceiptBool = hasReceipt === 'true';
      // Use a subquery to check if request has active receipts
      if (hasReceiptBool) {
        // Filter requests that HAVE receipts
        queryBuilder.andWhere(
          (qb) =>
            `EXISTS (${qb
              .subQuery()
              .select('1')
              .from(Receipt, 'receipt')
              .where('receipt.request_id = request.id')
              .andWhere('receipt.isActive = :isActive')
              .getQuery()})`,
          { isActive: true },
        );
      } else {
        // Filter requests that DO NOT have receipts
        queryBuilder.andWhere(
          (qb) =>
            `NOT EXISTS (${qb
              .subQuery()
              .select('1')
              .from(Receipt, 'receipt')
              .where('receipt.requestId = request.id')
              .andWhere('receipt.isActive = :isActive')
              .getQuery()})`,
          { isActive: true },
        );
      }
    }

    if (dateFrom) {
      if (dateTo) {
        queryBuilder.andWhere('request.dateRequested >= :dateFrom', {
          dateFrom,
        });
      } else {
        // When only dateFrom is provided, filter for the entire day
        const startOfDay = new Date(dateFrom);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFrom);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('request.dateRequested >= :startOfDay', {
          startOfDay,
        });
        queryBuilder.andWhere('request.dateRequested <= :endOfDay', {
          endOfDay,
        });
      }
    }

    if (dateTo) {
      queryBuilder.andWhere('request.dateRequested <= :dateTo', { dateTo });
    }

    const totalItems = await queryBuilder.getCount();

    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const enrichedItems = await Promise.all(
      items.map((request) => this.enrichWithReceiptInfo(request)),
    );

    return {
      data: {
        items: enrichedItems,
        meta: {
          totalItems,
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        },
      },
    };
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REQ-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getRequestCounts(): Promise<RequestCounts> {
    const queryBuilder = this.requestRepository.createQueryBuilder('request');

    const counts = await queryBuilder
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN request.status = :pending THEN 1 ELSE 0 END)',
        'pending',
      )
      .addSelect(
        'SUM(CASE WHEN request.status = :approved THEN 1 ELSE 0 END)',
        'approved',
      )
      .addSelect(
        'SUM(CASE WHEN request.status = :processing THEN 1 ELSE 0 END)',
        'processing',
      )
      .addSelect(
        'SUM(CASE WHEN request.status = :available THEN 1 ELSE 0 END)',
        'available',
      )
      .addSelect(
        'SUM(CASE WHEN request.status = :completed THEN 1 ELSE 0 END)',
        'completed',
      )
      .addSelect(
        'SUM(CASE WHEN request.status = :declined THEN 1 ELSE 0 END)',
        'declined',
      )
      .setParameters({
        pending: 'Pending',
        approved: 'Approved',
        processing: 'Processing',
        available: 'Available for Claiming',
        completed: 'Completed',
        declined: 'Declined',
      })
      .getRawOne();

    return {
      total: parseInt(counts.total) || 0,
      pending: parseInt(counts.pending) || 0,
      approved: parseInt(counts.approved) || 0,
      processing: parseInt(counts.processing) || 0,
      available: parseInt(counts.available) || 0,
      completed: parseInt(counts.completed) || 0,
      declined: parseInt(counts.declined) || 0,
    };
  }

  async findOne(id: number): Promise<DocumentRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['documents', 'course'],
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const enrichedRequest = await this.enrichWithReceiptInfo(request);
    return enrichedRequest;
  }

  async findByStudentId(studentId: string): Promise<DocumentRequest[]> {
    const requests = await this.requestRepository.find({
      where: { studentId },
      relations: ['documents', 'course'],
      order: { dateRequested: 'DESC' },
    });

    return this.bulkEnrichReceiptCounts(requests);
  }

  async findByStatus(status: string): Promise<DocumentRequest[]> {
    const requests = await this.requestRepository.find({
      where: { status: status as any },
      relations: ['documents', 'course'],
      order: { dateRequested: 'DESC' },
    });

    return this.bulkEnrichReceiptCounts(requests);
  }

  async create(createRequestDto: CreateRequestDto): Promise<DocumentRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const requestNumber = await this.generateRequestNumber();

      const { documents, ...requestData } = createRequestDto;
      const request = this.requestRepository.create({
        ...requestData,
        requestNumber,
        dateRequested: new Date(),
        status: 'Pending',
        shortCode: undefined,
        claimDate: undefined,
      });

      const savedRequest = await queryRunner.manager.save(request);

      await this.notificationService.createRequestCreatedNotification(
        savedRequest.id,
      );

      const requestDocuments = createRequestDto.documents.map((doc) =>
        this.requestDocumentRepository.create({
          requestId: savedRequest.id,
          documentId: doc.id,
          documentName: doc.name,
        }),
      );

      await queryRunner.manager.save(requestDocuments);

      await queryRunner.commitTransaction();
      const result = await this.requestRepository.findOne({
        where: { id: savedRequest.id },
        relations: ['documents', 'course'],
      });

      if (!result) {
        throw new NotFoundException(
          `Request with ID ${savedRequest.id} not found after creation`,
        );
      }
      const enrichedResult = await this.enrichWithReceiptInfo(result);
      return enrichedResult;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async markClearance(id: number, category: { category: string }) {
    const request = await this.findOne(id);
    request.needsClearance = true;
    request.requestCategory = category.category;
    if (request.status === 'Approved' || request.status === 'Processing') {
      request.status = 'UNDER_REVIEW';
    }
    return this.requestRepository.save(request);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
    user: any,
  ): Promise<DocumentRequest> {
    //TODO: modify status from raw-data(backend) to presentation-data(frontend) e.g. store in db UNDER_REVIEW, present in frontend Under Review
    const request = await this.findOne(id);

    console.log('CURRENT USER', user);

    request.status = updateStatusDto.status as any;

    if (updateStatusDto.status === 'Approved' && !request.approvedBy) {
      request.approvedBy = user.username;
      request.dateApproved = new Date();
      if (request.needsClearance) {
        request.status = 'UNDER_REVIEW';
        // Set requestCategory if null to satisfy database trigger constraint
        if (!request.requestCategory) {
          request.requestCategory = 'REGULAR';
        }
      }

      // Generate a local shortCode and retain the generated local requestNumber
      request.shortCode = this.generateShortCode();
    }

    await this.requestRepository.save(request);

    await this.notificationService.createRequestApprovedNotification(
      id,
      request.approvedBy,
    );

    return this.findOne(id);
  }

  async declineRequest(
    id: number,
    declineRequestDto: DeclineRequestDto,
  ): Promise<DocumentRequest> {
    const request = await this.findOne(id);

    if (request.status !== 'Pending') {
      throw new BadRequestException('Only pending requests can be declined');
    }

    request.status = 'Declined';
    request.declineReason = declineRequestDto.reason;
    request.approvedBy = declineRequestDto.approvedBy || 'ARC Staff';
    request.dateApproved = new Date();
    request.notes = `Declined: ${declineRequestDto.reason}`;

    await this.requestRepository.save(request);

    await this.notificationService.createRequestDeclinedNotification(
      id,
      declineRequestDto.reason,
      declineRequestDto.approvedBy || 'ARC Staff',
    );

    return this.findOne(id);
  }

  async deleteRequest(id: number, studentId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(DocumentRequest, {
        where: { id, studentId },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      if (request.status !== 'Pending') {
        throw new BadRequestException('Only pending requests can be cancelled');
      }

      await queryRunner.manager.delete(RequestDocument, { requestId: id });

      await queryRunner.manager.remove(request);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeDocumentsFromRequest(
    id: number,
    removeDocumentsDto: RemoveDocumentsDto,
  ): Promise<DocumentRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(DocumentRequest, {
        where: { id },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      // Validate that all document IDs belong to this request
      const requestDocuments = await queryRunner.manager.find(RequestDocument, {
        where: { requestId: id },
      });
      const requestDocumentIds = requestDocuments.map((doc) => doc.documentId);
      const invalidIds = removeDocumentsDto.documentIds.filter(
        (docId) => !requestDocumentIds.includes(docId),
      );

      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Document IDs ${invalidIds.join(', ')} do not belong to request ${id}`,
        );
      }

      // Remove the specified documents
      await queryRunner.manager.delete(RequestDocument, {
        requestId: id,
        documentId: In(removeDocumentsDto.documentIds),
      });

      // Append remarks to notes if provided - update only the notes field directly
      if (removeDocumentsDto.remarks) {
        const timestamp = new Date().toISOString();
        const removalNote = `[Document Removal - ${timestamp}] Removed ${removeDocumentsDto.documentIds.length} document(s): ${removeDocumentsDto.remarks}`;
        const updatedNotes = request.notes
          ? `${request.notes}\n${removalNote}`
          : removalNote;

        await queryRunner.manager.update(DocumentRequest, id, {
          notes: updatedNotes,
        });
      }

      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const latestRequest = await this.requestRepository
      .createQueryBuilder('request')
      .where('request.requestNumber LIKE :pattern', {
        pattern: `UB-REQ-${year}${month}-%`,
      })
      .orderBy('request.id', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestRequest) {
      const parts = latestRequest.requestNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `UB-REQ-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
}
