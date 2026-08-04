// backend/src/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Notification, NotificationType, NotificationAudience } from './notification.entity';
import { DocumentRequest } from '../request/document-request.entity';
import { RequestDocument } from '../reference/request-document.entity';
import { NotificationSseService } from './notification-sse.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(DocumentRequest)
    private requestRepository: Repository<DocumentRequest>,
    @InjectRepository(RequestDocument)
    private requestDocumentRepository: Repository<RequestDocument>,
    private sseService: NotificationSseService
  ) {}

  async createRequestCreatedNotification(requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['documents', 'course']
    });

    if (!request) return;

    // Get document names
    const requestDocs = await this.requestDocumentRepository.find({
      where: { requestId: request.id }
    });

    const documentNames = requestDocs.map(doc => doc.documentName);

    // Create a SINGLE notification for all Registrar users
    const notification = this.notificationRepository.create({
      audience: 'registrar', // This indicates it's for all Registrar users
      type: 'REQUEST_CREATED',
      title: 'New Document Request',
      message: `New request #${request.requestNumber} from ${request.requestorFirstName} ${request.requestorLastName}`,
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        studentId: request.studentId,
        studentName: `${request.requestorLastName}, ${request.requestorFirstName}`,
        documentNames,
        quantity: request.quantity,
        course: request.course?.description
      },
      isGlobal: true, // This is a global notification for the role
      priority: 'medium',
      requestId: request.id,
      groupId: `request-${request.id}`,
      readBy: {} // Initialize empty read tracking object
    });

    await this.notificationRepository.save(notification);

    // Send real-time notification to ALL connected Registrar users
    this.sseService.sendToRole('Registrar', notification);

    this.logger.log(`Created shared request notification for all Registrar users for request #${request.requestNumber}`);
  }

  async createStudentNotification(
    studentId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: any
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: studentId,
      audience: 'student',
      type,
      title,
      message,
      data,
      isGlobal: false,
      priority: type === 'REQUEST_DECLINED' ? 'high' : 'medium',
      requestId: data.requestId
    });

    await this.notificationRepository.save(notification);

    // Send real-time notification to the specific student
    this.sseService.sendToUser(studentId, notification);

    return notification;
  }

  async createRequestApprovedNotification(requestId: number, approvedBy: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId }
    });

    if (!request) return;

    await this.createStudentNotification(
      request.studentId,
      'REQUEST_APPROVED',
      'Request Approved',
      `Your request #${request.requestNumber} has been approved`,
      {
        requestId: request.id,
        requestNumber: request.requestNumber,
        approvedBy,
        dateApproved: new Date()
      }
    );

    this.logger.log(`Created approval notification for student ${request.studentId}`);
  }

  /**
* Create request approved notification (for specific student)
*/
  async createForClaimingNotification(requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId }
    });

    if (!request) return;

    await this.createStudentNotification(
      request.studentId,
      'FOR_CLAIMING',
      'Available for Claiming',
      `Your request #${request.requestNumber} is available to claim`,
      {
        requestId: request.id,
        requestNumber: request.requestNumber
      }
    );

    this.logger.log(`Created for claiming notification for student ${request.studentId}`);
  }

  /**
   * Create request declined notification (for specific student)
   */
  async createRequestDeclinedNotification(requestId: number, reason: string, declinedBy: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId }
    });

    if (!request) return;

    await this.createStudentNotification(
      request.studentId,
      'REQUEST_DECLINED',
      'Request Declined',
      `Your request #${request.requestNumber} has been declined`,
      {
        requestId: request.id,
        requestNumber: request.requestNumber,
        declineReason: reason,
        declinedBy
      }
    );

    this.logger.log(`Created declined notification for student ${request.studentId}`);
  }

  /**
   * Create claim date notification (for specific student)
   */
  // async createClaimDateNotification(requestId: number, claimDate: Date): Promise<void> {
  //     const request = await this.requestRepository.findOne({
  //         where: { id: requestId }
  //     });

  //     if (!request) return;

  //     const formattedDate = claimDate.toLocaleDateString('en-US', {
  //         year: 'numeric',
  //         month: 'long',
  //         day: 'numeric'
  //     });

  //     await this.createStudentNotification(
  //         request.studentId,
  //         'CLAIM_DATE_SET',
  //         'Claim Date Set',
  //         `Your documents for request #${request.requestNumber} are ready for claiming on ${formattedDate}`,
  //         {
  //             requestId: request.id,
  //             requestNumber: request.requestNumber,
  //             claimDate
  //         }
  //     );

  //     this.logger.log(`Created claim date notification for student ${request.studentId}`);
  // }

  async createReceiptUploadedNotification(requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['course']
    });

    if (!request) {
      this.logger.warn(`Request #${requestId} not found for receipt notification`);
      return;
    }

    // Get document names from request documents
    const requestDocs = await this.requestDocumentRepository.find({
      where: { requestId: request.id }
    });

    const documentNames = requestDocs.map(doc => doc.documentName);

    // Format document names for display
    const documentsDisplay = documentNames.length > 2
      ? `${documentNames.slice(0, 2).join(', ')} +${documentNames.length - 2} more`
      : documentNames.join(', ');

    // Format student name
    const studentName = `${request.requestorLastName}, ${request.requestorFirstName}`;

    // Create a SINGLE notification for all Registrar users
    const notification = this.notificationRepository.create({
      audience: 'registrar',
      type: 'RECEIPT_UPLOADED', // Make sure this type exists in your NotificationType enum
      title: 'Payment Receipt Uploaded',
      message: `Payment receipt uploaded for request #${request.requestNumber} from ${request.requestorFirstName} ${request.requestorLastName}`,
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        studentId: request.studentId,
        studentName,
        documentNames,
        documentsDisplay,
        documentCount: documentNames.length,
        quantity: request.quantity,
        course: request.course?.description || 'N/A',
        uploadedAt: new Date(),
        status: request.status,
        hasReceipt: true
      },
      isGlobal: true,
      priority: 'medium',
      requestId: request.id,
      groupId: `receipt-${request.id}`,
      readBy: {}
    });

    await this.notificationRepository.save(notification);

    // Send real-time notification to ALL connected Registrar users
    this.sseService.sendToRole('Registrar', notification);

    this.logger.log(`Receipt upload notification sent to all Registrar users for request #${request.requestNumber}`);
  }

  /**
* Get notifications for a user based on their role
*/
  async getUserNotifications(
    userId: string,
    role: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number; }> {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      types = []
    } = options;

    let queryBuilder = this.notificationRepository
      .createQueryBuilder('notification');

    queryBuilder = queryBuilder.where(
      '(notification.userId = :userId OR notification.audience = :role)',
      { userId, role: role.toLowerCase() }
    );

    if (types.length > 0) {
      queryBuilder = queryBuilder.andWhere('notification.type IN (:...types)', { types });
    }

    if (unreadOnly) {
      queryBuilder = queryBuilder.andWhere(
        `(notification.isGlobal = false AND (NOT(notification."readBy" ? :userId) OR (notification."readBy"->:userId) = 'false'::jsonb OR (notification."readBy"->:userId->>'read') = 'false')) OR (notification.isGlobal = true AND notification.read = false)`,
        { userId }
      );
    }

    // Get total count (without pagination)
    const total = await queryBuilder.getCount();

    // Get paginated results
    const notifications = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    // Add computed read property for frontend compatibility
    notifications.forEach(notification => {
      (notification as any).read = notification.isReadByUser(userId);
    });

    // Get unread count
    const unreadCount = await this.getUnreadCount(userId, role);

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: number, userId: string, userRole: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Verify access
    if (userRole === 'Student' && notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (userRole !== 'Student' && notification.audience !== userRole.toLowerCase()) {
      throw new Error('Unauthorized');
    }

    const readBy = notification.readBy || {};

    if (!readBy[userId]) {
      readBy[userId] = { read: true, readAt: new Date() };
    } else {
      readBy[userId].read = true;
      readBy[userId].readAt = new Date();
    }

    notification.readBy = readBy;

    (notification as any).read = true;
    (notification as any).readAt = new Date();

    const updated = await this.notificationRepository.save(notification);

    return updated;
  }

  async markAllAsRead(userId: string, userRole: string): Promise<void> {
    let notifications: Notification[] = [];

    if (userRole === 'Student') {
      notifications = await this.notificationRepository.find({
        where: {
          userId,
          audience: 'student'
        }
      });
    } else {
      notifications = await this.notificationRepository.find({
        where: {
          audience: userRole.toLowerCase() as NotificationAudience
        }
      });
    }

    // Track which notifications need updating
    const updatedNotifications: Notification[] = [];

    for (const notification of notifications) {
      if (!notification.isReadByUser(userId)) {
        const readBy = notification.readBy || {};

        if (!readBy[userId]) {
          readBy[userId] = { read: true, readAt: new Date() };
        } else {
          readBy[userId].read = true;
          readBy[userId].readAt = new Date();
        }

        notification.readBy = readBy;
        (notification as any).read = true;
        (notification as any).readAt = new Date();
        updatedNotifications.push(notification);
      }
    }

    if (updatedNotifications.length > 0) {
      // Save all updated notifications
      await this.notificationRepository.save(updatedNotifications);
    }
  }

  async getUnreadCount(userId: string, userRole: string): Promise<number> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification');

    queryBuilder.where(
      '(notification.userId = :userId OR notification.audience = :role)',
      { userId, role: userRole.toLowerCase() }
    );

    queryBuilder.andWhere(
      `((notification.isGlobal = true AND notification.read = false) OR (notification.isGlobal = false AND (NOT(notification."readBy" ? :userId) OR (notification."readBy"->:userId)->>'read' = 'false')))`,
      { userId }
    );

    const count = await queryBuilder.getCount();
    return count;
  }

  async createClearanceInitializedNotification(clearanceId: number, requestId: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { requestNumber: requestId }
    });

    if (!request) {
      this.logger.warn(`Request #${requestId} not found for clearance initialization notification`);
      return;
    }

    await this.createStudentNotification(
      request.studentId,
      'CLEARANCE_INITIALIZED',
      'Clearance Ready for Signature',
      `Your clearance for request #${request.requestNumber} is now ready for your signature`,
      {
        requestId: request.id,
        requestNumber: request.requestNumber,
        clearanceId,
        message: 'Please sign your clearance to proceed with document processing'
      }
    );

    this.logger.log(`Created clearance initialization notification for student ${request.studentId}`);
  }

  async createClearanceOnHoldNotification(clearanceId: number, requestId: string, office: string, remarks?: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { requestNumber: requestId },
      relations: ['course']
    });

    if (!request) {
      this.logger.warn(`Request #${requestId} not found for clearance on hold notification`);
      return;
    }

    const studentMessage = remarks
      ? `Your clearance for request #${request.requestNumber} has been put on hold by ${office}. Reason: ${remarks}`
      : `Your clearance for request #${request.requestNumber} has been put on hold by ${office}`;

    await this.createStudentNotification(
      request.studentId,
      'CLEARANCE_ON_HOLD',
      'Clearance Put On Hold',
      studentMessage,
      {
        requestId: request.id,
        requestNumber: request.requestNumber,
        clearanceId,
        office,
        remarks,
        message: 'Please contact the office for more information'
      }
    );

    this.logger.log(`Created clearance on hold notification for student ${request.studentId} by office ${office}`);
  }


  async createClearanceApprovedNotification(requestId: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { requestNumber: requestId },
      relations: ['course']
    });

    if (!request) {
      this.logger.warn(`Request #${requestId} not found for clearance approved notification`);
      return;
    }

    // 1. Send notification to the student
    await this.createStudentNotification(
      request.studentId,
      'CLEARANCE_APPROVED',
      'Clearance Approved',
      `Your clearance for request #${request.requestNumber} has been fully approved. Your request is now in the printing phase.`,
      {
        requestId: request.id,
        requestNumber: request.requestNumber,
        message: 'All required offices have signed off on your clearance'
      }
    );

    this.logger.log(`Created clearance approved notification for student ${request.studentId}`);

    // 2. Send notification to all Registrar users
    const notification = this.notificationRepository.create({
      audience: 'registrar',
      type: 'CLEARANCE_APPROVED',
      title: 'Clearance Fully Approved',
      message: `Clearance for request #${request.requestNumber} from ${request.requestorFirstName} ${request.requestorLastName} has been fully approved`,
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        studentId: request.studentId,
        studentName: `${request.requestorLastName}, ${request.requestorFirstName}`,
        course: request.course?.description
      },
      isGlobal: true,
      priority: 'medium',
      requestId: request.id,
      groupId: `clearance-approved-${request.id}`,
      readBy: {}
    });

    await this.notificationRepository.save(notification);

    // Send real-time notification to ALL connected Registrar users
    this.sseService.sendToRole('Registrar', notification);

    this.logger.log(`Created clearance approved notification for all Registrar users for request #${request.requestNumber}`);
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('createdAt < :cutoffDate', { cutoffDate })
      // For staff notifications, we keep them longer since they're shared
      .andWhere('audience != :staffAudience', { staffAudience: 'registrar' })
      .execute();

    return result.affected || 0;
  }
}