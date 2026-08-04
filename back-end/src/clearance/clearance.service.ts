// src/clearance/clearance.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as crypto from 'crypto';
import { Clearance } from '@clearance/clearance.entity';
import { CreateClearanceDto, UpdateClearanceDto, ClearanceQueryDto, PublicClearanceDto, PaginatedClearances, SignClearanceDto } from '@clearance/clearance.dto';
import { ConfigService } from '@nestjs/config';
import { ClearanceLog } from '@clearance/clearance-log/log.entity';
import { NotificationService } from '@notification/notification.service';

import * as fs from "fs";
import { CheckBox, ImageRun, IPatch, Paragraph, patchDocument, PatchType, TextRun } from 'docx';
import * as QRCode from 'qrcode';

// Step-by-Step Verification Configuration
// Anchors: Core action words
// Modifiers: Context words that narrow down the meaning
const SEMANTIC_CONFIG = {
  // High-Confidence Exam Keywords (checked first)
  highConfidenceExams: {
    pur6: ['nclex', 'nle', 'let', 'e-ce', 'rme', 'board', 'bar', 'licensure', 'prc', 'cse'],
    pur7: ['civil', 'service', 'csc', 'government', 'public'],
  },

  // Anchors and Modifiers for each category
  pur1: {
    name: 'Abroad',
    anchors: ['work', 'job', 'employment', 'live', 'move', 'relocate', 'migrate'],
    modifiers: ['abroad', 'overseas', 'foreign', 'international', 'canada', 'usa', 'uk', 'australia', 'germany', 'japan', 'singapore', 'dubai', 'qatar'],
  },
  pur2: {
    name: 'Employment',
    anchors: ['work', 'job', 'employment', 'career', 'profession', 'hiring', 'recruit', 'salary', 'compensation'],
    modifiers: ['local', 'domestic'], // Explicit local modifier
  },
  pur3: {
    name: 'Further Studies Abroad',
    anchors: ['study', 'studies', 'masters', 'phd', 'doctorate', 'graduate', 'postgraduate', 'research', 'scholarship', 'fellowship'],
    modifiers: ['abroad', 'overseas', 'foreign', 'international', 'canada', 'usa', 'uk', 'australia', 'germany', 'japan', 'singapore'],
  },
  pur5: {
    name: 'Transfer to Another School',
    anchors: ['transfer', 'shift', 'move', 'change'],
    targets: ['school', 'university', 'college', 'institution'],
  },
  pur8: {
    name: 'Internship',
    anchors: ['intern', 'internship', 'ojt', 'practicum', 'training', 'apprentice', 'trainee'],
  },
};

@Injectable()
export class ClearanceService {
  constructor(
    @InjectRepository(Clearance)
    private clearanceRepository: Repository<Clearance>,
    @InjectRepository(ClearanceLog)
    private clearanceLogRepository: Repository<ClearanceLog>,
    private configService: ConfigService,
    private notificationService: NotificationService,
  ) {}

  async findAll(query: ClearanceQueryDto, userOffice?: string, userRole?: string, userDepartmentId?: number): Promise<PaginatedClearances> {
    const { status, type, requestId, search, dateFrom, dateTo, page = 1, limit = 10, sortBy, sortOrder, office, approvalStatus } = query;

    // Map frontend sort fields to database columns
    const sortFieldMap: Record<string, string> = {
      'requestId': 'clearance.requestId',
      'studentName': 'request.requestorLastName',
      'course': 'course.description',
      'type': 'clearance.type',
      'createdAt': 'clearance.createdAt',
      'status': 'clearance.status'
    };

    // Default sort field and order
    const sortField = sortBy && sortFieldMap[sortBy] ? sortFieldMap[sortBy] : 'clearance.createdAt';
    const order = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const queryBuilder = this.clearanceRepository.createQueryBuilder('clearance')
      .leftJoin('clearance.request', 'request')
      .leftJoin('request.course', 'course')
      .leftJoin('request.documents', 'doc')
      .leftJoin('clearance.approvals', 'approval')

      .select([
        'clearance.id',
        'clearance.status',
        'clearance.type',
        'clearance.requestId As requestId',
        'clearance.createdAt',
        "CONCAT(request.requestorLastName, ', ', request.requestorFirstName, ' ', request.requestorMiddleName) AS studentName",
        'request.studentId As studentId',
        'request.year AS year',
        "JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', doc.id, 'name', doc.document_name)) AS docs",
        'course.description AS course',
        `JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'id', approval.id, 
          'office', approval.office, 
          'status', approval.status, 
          'signedBy', approval.signedBy, 
          'signedOn', approval.signedOn,
          'remarks', CASE WHEN approval.office = :userOffice THEN approval.remarks ELSE NULL END
        )) AS approvals`,
      ])
      .groupBy('clearance.id')
      .addGroupBy('request.id')
      .addGroupBy('course.id')
      .orderBy(sortField, order);

    // Apply office-based filtering
    if (userOffice && userOffice !== 'CASHIER' && userOffice !== 'ARC') {
      // Use a subquery with proper TypeORM syntax
      queryBuilder.andWhere(
        qb => {
          const subQuery = qb.subQuery()
            .select('1')
            .from('clearance_approvals', 'approval2')
            .where('approval2.office = :userOffice')
            .andWhere('approval2.clearance_id = clearance.id')
            .getQuery();
          return `EXISTS ${subQuery}`;
        },
        { userOffice }
      );
    }

    // Apply query-based office and approval status filtering
    if (office && office !== 'ARC') {
      queryBuilder.andWhere(
        qb => {
          const subQuery = qb.subQuery()
            .select('1')
            .from('clearance_approvals', 'approval3')
            .where('approval3.office = :office')
            .andWhere('approval3.clearance_id = clearance.id');

          if (approvalStatus) {
            subQuery.andWhere('approval3.status = :approvalStatus');
          }

          return `EXISTS ${subQuery.getQuery()}`;
        },
        { office, approvalStatus }
      );
    }

    // Apply department-based filtering for Director role
    if (userRole === 'Director' && userDepartmentId) {
      queryBuilder.andWhere('course.departmentId = :userDepartmentId', { userDepartmentId });
    }

    // Apply search filter (search by requestId, studentName, or course)
    if (search) {
      const searchTerm = `%${search}%`;
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 1) {
        // Single word search - use ILIKE for all fields
        queryBuilder.andWhere(
          '(clearance.requestId ILIKE :search OR ' +
          'request.requestorId ILIKE :search OR ' +
          'request.requestorFirstName ILIKE :search OR ' +
          'request.requestorLastName ILIKE :search OR ' +
          'request.requestNumber ILIKE :search OR ' +
          'course.description ILIKE :search OR ' +
          "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorMiddleName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search OR " +
          "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search)",
          { search: searchTerm }
        );
      } else {
        // Multi-word search - check if any word matches name fields
        const firstNameConditions = searchWords.map((_, index) => `request.requestorFirstName ILIKE :word${index}`).join(' OR ');
        const lastNameConditions = searchWords.map((_, index) => `request.requestorLastName ILIKE :word${index}`).join(' OR ');
        const middleNameConditions = searchWords.map((_, index) => `request.requestorMiddleName ILIKE :word${index}`).join(' OR ');
        const requestIdConditions = searchWords.map((_, index) => `clearance.requestId ILIKE :word${index}`).join(' OR ');
        const studentIdConditions = searchWords.map((_, index) => `request.requestorId ILIKE :word${index}`).join(' OR ');

        const params: any = {};
        searchWords.forEach((word, index) => {
          params[`word${index}`] = `%${word}%`;
        });

        queryBuilder.andWhere(
          `(${firstNameConditions} OR ${lastNameConditions} OR ${middleNameConditions} OR ${requestIdConditions} OR ${studentIdConditions} OR ` +
          "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorMiddleName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search OR " +
          "CONCAT(COALESCE(request.requestorFirstName, ''), ' ', COALESCE(request.requestorLastName, '')) ILIKE :search)",
          { ...params, search: searchTerm }
        );
      }
    }

    // Apply date filter
    if (dateFrom) {
      if (dateTo) {
        // Date range filter
        queryBuilder.andWhere('clearance.createdAt >= :dateFrom', { dateFrom });
        queryBuilder.andWhere('clearance.createdAt <= :dateTo', { dateTo });
      } else {
        // Single date filter - filter for the entire day
        const startOfDay = new Date(dateFrom);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFrom);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('clearance.createdAt >= :dateFrom', { dateFrom: startOfDay.toISOString() });
        queryBuilder.andWhere('clearance.createdAt <= :dateTo', { dateTo: endOfDay.toISOString() });
      }
    }

    if (dateTo && !dateFrom) {
      queryBuilder.andWhere('clearance.createdAt <= :dateTo', { dateTo });
    }

    // Apply other filters
    if (status) {
      queryBuilder.andWhere('clearance.status = :status', { status });
    }
    if (type) {
      queryBuilder.andWhere('clearance.type = :type', { type });
    }
    if (requestId) {
      queryBuilder.andWhere('clearance.requestId LIKE :requestId', { requestId: `%${requestId}%` });
    }

    // Get total count and status counts in a single query using conditional aggregation
    const statsQuery = this.clearanceRepository.createQueryBuilder('clearance')
      .leftJoin('clearance.request', 'request')
      .leftJoin('request.course', 'course')
      .select([
        'COUNT(clearance.id) as total',
        "COUNT(CASE WHEN clearance.status = 'PENDING' THEN 1 END) as pending",
        "COUNT(CASE WHEN clearance.status = 'IN_REVIEW' THEN 1 END) as inreview",
        "COUNT(CASE WHEN clearance.status = 'APPROVED' THEN 1 END) as approved",
        "COUNT(CASE WHEN clearance.status = 'REJECTED' THEN 1 END) as rejected",
      ]);

    // Apply the same filters as the main query
    if (userOffice && userOffice !== 'CASHIER' && userOffice !== 'ARC') {
      statsQuery.andWhere(
        qb => {
          const subQuery = qb.subQuery()
            .select('1')
            .from('clearance_approvals', 'approval2')
            .where('approval2.office = :userOffice')
            .andWhere('approval2.clearance_id = clearance.id')
            .getQuery();
          return `EXISTS ${subQuery}`;
        },
        { userOffice }
      );
    }

    // Apply query-based office and approval status filtering to stats
    if (office && office !== 'ARC') {
      statsQuery.andWhere(
        qb => {
          const subQuery = qb.subQuery()
            .select('1')
            .from('clearance_approvals', 'approval3')
            .where('approval3.office = :office')
            .andWhere('approval3.clearance_id = clearance.id');

          if (approvalStatus) {
            subQuery.andWhere('approval3.status = :approvalStatus');
          }

          return `EXISTS ${subQuery.getQuery()}`;
        },
        { office, approvalStatus }
      );
    }

    if (userRole === 'Director' && userDepartmentId) {
      statsQuery.andWhere('course.departmentId = :userDepartmentId', { userDepartmentId });
    }

    // Execute stats query to get total and status counts in one database call
    const statsResult = await statsQuery.getRawOne();
    const total = parseInt(statsResult.total);
    const pendingCount = parseInt(statsResult.pending);
    const inReviewCount = parseInt(statsResult.inreview);
    const approvedCount = parseInt(statsResult.approved);
    const rejectedCount = parseInt(statsResult.rejected);

    // Get paginated results
    const rawResults = await queryBuilder
      .setParameter('userOffice', userOffice || '')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const data = rawResults.map(item => ({
      id: item.clearance_id,
      status: item.clearance_status,
      type: item.clearance_type,
      requestId: item.requestid,
      studentName: item.studentname,
      studentId: item.studentid,
      year: item.year,
      course: item.course,
      documentList: item.docs,
      createdAt: item.clearance_created_at,
      approvals: item.approvals[0]?.id ? item.approvals : [],
    }));

    return {
      data: {
        items: data,
        meta: {
          totalItems: total,
          itemCount: data.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          stats: {
            total: total,
            pending: pendingCount,
            inReview: inReviewCount,
            approved: approvedCount,
            rejected: rejectedCount
          }
        }
      }
    };
  }

  async findOne(id: number): Promise<Clearance> {
    const clearance = await this.clearanceRepository.findOne({
      where: { id },
      relations: ['approvals', 'logs'],
    });

    if (!clearance) {
      throw new NotFoundException(`Clearance with ID ${id} not found`);
    }

    return clearance;
  }

  async findByRequestId(requestId: string): Promise<Clearance> {
    const clearance = await this.clearanceRepository.findOne({
      where: { requestId },
      relations: ['approvals', 'request', 'request.course', 'request.documents'],
    });
    if (!clearance) {
      throw new NotFoundException(`Clearance with Request ID ${requestId} not found`);
    }

    return clearance;
  }

  async findByStatus(status: string): Promise<Clearance[]> {
    return this.clearanceRepository.find({
      where: { status },
      relations: ['approvals', 'logs'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublicStatus(requestId: string): Promise<PublicClearanceDto> {
    const clearance = await this.clearanceRepository.findOne({
      where: { requestId },
      relations: ['approvals', 'request'],
    });

    if (!clearance) {
      throw new NotFoundException(`Request ID ${requestId} not found`);
    }
    return {
      data: {
        requestId: clearance.requestId,
        status: clearance.status,
        type: clearance.type,
        createdAt: clearance.createdAt,
        year: clearance.request?.year,
        approvals: clearance.approvals.map(app => ({
          office: app.office,
          status: app.status,
          signedBy: app.signedBy,
          signedOn: app.signedOn,
        })),
      }
    };
  }

  async create(createClearanceDto: CreateClearanceDto): Promise<Clearance> {
    const clearance = this.clearanceRepository.create(createClearanceDto);
    const savedClearance = await this.clearanceRepository.save(clearance);

    // Notify the requestor that clearance is initialized and ready for signature
    await this.notificationService.createClearanceInitializedNotification(
      savedClearance.id,
      savedClearance.requestId
    ).catch(error => {
      console.error(`Failed to send clearance initialization notification for request ${savedClearance.requestId}:`, error);
    });

    return savedClearance;
  }

  async update(id: number, updateClearanceDto: UpdateClearanceDto): Promise<Clearance> {
    const clearance = await this.findOne(id);
    Object.assign(clearance, updateClearanceDto);
    return this.clearanceRepository.save(clearance);
  }

  async remove(id: number): Promise<void> {
    const result = await this.clearanceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Clearance with ID ${id} not found`);
    }
    return;
  }

  patchChildren(text?: string, checked?: boolean): IPatch {
    if (text) {
      return {
        type: PatchType.PARAGRAPH,
        children: [new TextRun(text)]
      } as IPatch;
    }

    if (checked !== undefined) {
      if (checked) {
        return {
          type: PatchType.PARAGRAPH,
          children: [
            new CheckBox({
              checked: checked,
              checkedState: {
                value: "2713"
              },
              uncheckedState: {
                value: "274C"
              }
            })
          ]
        } as IPatch;
      } else {
        return {
          type: PatchType.PARAGRAPH,
          children: [new TextRun('')]
        } as IPatch;
      }
    }

    return {
      type: PatchType.PARAGRAPH,
      children: [new TextRun("")]
    } as IPatch;
  }

  async createDocument(id: string): Promise<Buffer> {
    const clearance = await this.findByRequestId(id);

    const documentData = {
      requestId: clearance.requestId,
      lastName: clearance.request?.requestorLastName || '',
      firstName: clearance.request?.requestorFirstName || '',
      middleName: clearance.request?.requestorMiddleName || '',
      studentId: clearance.request?.requestorId || '',
      contactNo: clearance.request?.contact || '',
      course: clearance.request?.course?.description || '',
      year: clearance.request?.year || '',
      schoolYr: this.getAcademicYear(),
      type: clearance.type,
      status: clearance.status,
      documents: clearance.request.documents.map(docs => ({
        id: docs.id
      })),
      approvals: clearance.approvals.map(approval => ({
        office: approval.office,
        status: approval.status,
        signedBy: approval.signedBy,
        signedOn: approval.signedOn,
      })),
      createdAt: clearance.createdAt,
      purpose: clearance.request?.purpose || '',
      claimDate: clearance.request?.claimDate || '',
      studentSign: clearance.requestorSign || '',
      studentSignDate: clearance.requestorSignedOn?.toLocaleDateString() || '',
    };

    const clearanceInfo = {
      clearance_date: this.patchChildren(documentData.createdAt.toLocaleDateString()),
      school_yr: this.patchChildren(documentData.schoolYr),
      claim_date: this.patchChildren(documentData.claimDate),
    };

    const studentInfo = {
      id_number: this.patchChildren(documentData.studentId),
      contact_no: this.patchChildren(documentData.contactNo),
      last_name: this.patchChildren(documentData.lastName),
      first_name: this.patchChildren(documentData.firstName),
      middle_name: this.patchChildren(documentData.middleName),
      course: this.patchChildren(documentData.course),
      year_lv: this.patchChildren(documentData.year.toString()),
    };

    const documents = {
      OTR: this.patchChildren(undefined, documentData.documents.some(doc => doc.id === 2)),
      SF: this.patchChildren(undefined, documentData.documents.some(doc => doc.id === 4)),
      Dip: this.patchChildren(undefined, documentData.documents.some(doc => doc.id === 3)),
      CC: this.patchChildren(), //
      TC: this.patchChildren(undefined, documentData.documents.some(doc => doc.id == 5)),
    };

    const purposeCategories = this.analyzePurposeCategory(documentData.purpose);

    const purpose = {
      pur1: this.patchChildren(undefined, purposeCategories.pur1),
      pur2: this.patchChildren(undefined, purposeCategories.pur2),
      pur3: this.patchChildren(undefined, purposeCategories.pur3),
      pur4: this.patchChildren(undefined, purposeCategories.pur4),
      pur5: this.patchChildren(undefined, purposeCategories.pur5),
      pur6: this.patchChildren(undefined, purposeCategories.pur6),
      pur7: this.patchChildren(undefined, purposeCategories.pur7),
      pur8: this.patchChildren(undefined, purposeCategories.pur8),
    };

    const signatures = {
      lib_signature: this.patchChildren(documentData.approvals.find(a => a.office === 'LIBRARY')?.signedBy || ''),
      lib_sign_date: this.patchChildren(documentData.approvals.find(a => a.office === 'LIBRARY')?.signedOn?.toLocaleDateString() || ''),
      dir_signature: this.patchChildren(documentData.approvals.find(a => a.office === 'SCHOOL')?.signedBy || ''),
      dir_sign_date: this.patchChildren(documentData.approvals.find(a => a.office === 'SCHOOL')?.signedOn?.toLocaleDateString() || ''),
      acc_signature: this.patchChildren(documentData.approvals.find(a => a.office === 'ACCOUNTS')?.signedBy || ''),
      acc_sign_date: this.patchChildren(documentData.approvals.find(a => a.office === 'ACCOUNTS')?.signedOn?.toLocaleDateString() || ''),
      ccsd_signature: this.patchChildren(documentData.approvals.find(a => a.office === 'CCSD')?.signedBy || ''),
      ccsd_sign_date: this.patchChildren(documentData.approvals.find(a => a.office === 'CCSD')?.signedOn?.toLocaleDateString() || ''),
      inv_signature: this.patchChildren(documentData.approvals.find(a => a.office === 'INVENTORY')?.signedBy || ''),
      inv_sign_date: this.patchChildren(documentData.approvals.find(a => a.office === 'INVENTORY')?.signedOn?.toLocaleDateString() || ''),
      student_signature: this.patchChildren(documentData.studentSign),
      student_sign_date: this.patchChildren(documentData.studentSignDate),
    };

    // Generate QR code
    const qrCodeImage = await this.generateQRCode(documentData.requestId);

    const qrcode = {
      qrcode: qrCodeImage
    };

    const doc = await patchDocument({
      outputType: 'nodebuffer',
      data: fs.readFileSync('./template/Clearance Form Template.docx'),
      patches: {
        ...clearanceInfo,
        ...studentInfo,
        ...documents,
        ...purpose,
        ...signatures,
        ...qrcode,
      },
    });

    return doc;
  }

  private async generateQRCode(requestId: string): Promise<IPatch> {
    const websiteUrl = this.configService.get('WEBSITE_URL', 'http://localhost:4200');
    const trackingUrl = `${websiteUrl}/clearance/track/${requestId}`;
    const sizeInPixels = 170;

    const qrCodeBuffer = await QRCode.toBuffer(trackingUrl, {
      type: 'png',
      width: sizeInPixels,
      margin: 1,
      errorCorrectionLevel: 'H',
    });

    return {
      type: PatchType.PARAGRAPH,
      children: [
        new ImageRun({
          type: 'png',
          data: qrCodeBuffer,
          transformation: {
            width: sizeInPixels,
            height: sizeInPixels,
          },
        }),
      ],
    } as IPatch;
  }

  private getAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (currentMonth >= 8) {
      return `${currentYear % 100}-${(currentYear + 1) % 100}`;
    } else {
      return `${(currentYear - 1) % 100}-${currentYear % 100}`;
    }
  }

  private analyzePurposeCategory(userInput: string): Record<string, boolean> {
    if (!userInput || typeof userInput !== 'string') {
      return this.getDefaultPurpose();
    }

    const normalizedInput = userInput.toLowerCase().trim();
    const words = normalizedInput.split(/\s+/);

    const highConfidenceResult = this.checkHighConfidenceExams(words);
    if (highConfidenceResult) {
      return this.buildPurposeObject(highConfidenceResult);
    }

    if (this.hasAnyAnchor(words, SEMANTIC_CONFIG.pur8.anchors)) {
      return this.buildPurposeObject('pur8');
    }

    if (this.hasAnyAnchor(words, SEMANTIC_CONFIG.pur3.anchors)) {
      if (this.hasAnyModifier(words, SEMANTIC_CONFIG.pur3.modifiers)) {
        return this.buildPurposeObject('pur3');
      }
    }

    if (this.hasAnyAnchor(words, SEMANTIC_CONFIG.pur5.anchors)) {
      if (this.hasAnyTarget(words, SEMANTIC_CONFIG.pur5.targets)) {
        return this.buildPurposeObject('pur5');
      }
    }

    if (this.hasAnyAnchor(words, SEMANTIC_CONFIG.pur1.anchors)) {
      if (this.hasAnyModifier(words, SEMANTIC_CONFIG.pur1.modifiers)) {
        return this.buildPurposeObject('pur1');
      }
      return this.buildPurposeObject('pur2');
    }

    return this.getDefaultPurpose();
  }

  private checkHighConfidenceExams(words: string[]): string | null {
    if (this.hasAnyKeyword(words, SEMANTIC_CONFIG.highConfidenceExams.pur6)) {
      return 'pur6';
    }
    if (this.hasAnyKeyword(words, SEMANTIC_CONFIG.highConfidenceExams.pur7)) {
      return 'pur7';
    }
    return null;
  }

  private hasAnyAnchor(words: string[], anchors: string[]): boolean {
    return anchors.some(anchor => words.some(word => word.includes(anchor)));
  }

  private hasAnyModifier(words: string[], modifiers: string[]): boolean {
    return modifiers.some(modifier => words.some(word => word.includes(modifier)));
  }

  private hasAnyTarget(words: string[], targets: string[]): boolean {
    return targets.some(target => words.some(word => word.includes(target)));
  }

  private hasAnyKeyword(words: string[], keywords: string[]): boolean {
    return keywords.some(keyword => words.some(word => word.includes(keyword)));
  }

  private getDefaultPurpose(): Record<string, boolean> {
    return this.buildPurposeObject('pur4');
  }

  private buildPurposeObject(selectedKey: string): Record<string, boolean> {
    return {
      pur1: selectedKey === 'pur1',
      pur2: selectedKey === 'pur2',
      pur3: selectedKey === 'pur3',
      pur4: selectedKey === 'pur4',
      pur5: selectedKey === 'pur5',
      pur6: selectedKey === 'pur6',
      pur7: selectedKey === 'pur7',
      pur8: selectedKey === 'pur8',
    };
  }

  async signClearance(clearanceId: number, signClearanceDto: SignClearanceDto, userId: string, footprint?: { ip: string; ua: string; }): Promise<Clearance> {
    const clearance = await this.findOne(clearanceId);

    const signedOn = new Date();

    // 1. Generate SHA-256 Hash (Digital Fingerprint) for legal binding
    const signaturePayload = JSON.stringify({
      clearanceId: clearance.id,
      requestId: clearance.requestId,
      signature: signClearanceDto.signature,
      signer: userId,
      timestamp: signedOn.toISOString(),
    });

    const hash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    clearance.requestorSign = signClearanceDto.signature;
    clearance.requestorSignedOn = signedOn;

    const savedClearance = await this.clearanceRepository.save(clearance);

    const log = this.clearanceLogRepository.create({
      clearanceId: clearance.id,
      action: 'REQUESTER_SIGNED',
      userId: userId,
      metadata: {
        signature: hash,
        signature_applied: true,
        signed_at: signedOn,
        clearance_id: clearance.id,
        request_id: clearance.requestId,
        ip: footprint?.ip,
        userAgent: footprint?.ua,
      },
      date: signedOn
    });

    await this.clearanceLogRepository.save(log);

    await this.checkClearanceCompletion(clearance.id);

    return savedClearance;
  }

  private async checkClearanceCompletion(clearanceId: number): Promise<void> {
    const clearance = await this.clearanceRepository.findOne({
      where: { id: clearanceId },
      relations: ['approvals']
    });

    if (!clearance) return;

    const allApprovalsApproved = clearance.approvals.every(
      approval => approval.status === 'APPROVED'
    );

    const requesterSigned = clearance.requestorSign !== null;

    if (allApprovalsApproved && requesterSigned && clearance.status !== 'COMPLETED') {
      clearance.status = 'COMPLETED';
      await this.clearanceRepository.save(clearance);

      const log = this.clearanceLogRepository.create({
        clearanceId: clearance.id,
        action: 'CLEARANCE_COMPLETED',
        userId: 'SYSTEM',
        metadata: {
          completed_at: new Date(),
          clearance_id: clearance.id,
          request_id: clearance.requestId,
          completion_reason: 'ALL_APPROVALS_AND_REQUESTER_SIGNED'
        },
        date: new Date()
      });

      await this.clearanceLogRepository.save(log);
    }
  }
}