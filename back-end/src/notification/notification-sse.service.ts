// backend/src/notification/notification-sse.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Notification } from './notification.entity';

interface SseEvent {
  type: 'notification' | 'ping' | 'connection-established';
  data: any;
  userId: string;
  connectionId?: string;
}

@Injectable()
export class NotificationSseService {
  private readonly logger = new Logger(NotificationSseService.name);

  // Map to store active connections with heartbeat
  private connections = new Map<string, {
    subject: Subject<SseEvent>;
    lastHeartbeat: Date;
    userId: string;
    role: string;
    interval?: NodeJS.Timeout;
  }>();

  constructor() {
    // Cleanup zombie connections every 30 seconds
    setInterval(() => this.cleanupZombieConnections(), 30000);
  }

  /**
   * Register a new SSE connection
   */
  registerConnection(connectionId: string, userId: string, role: string): Subject<SseEvent> {
    // Remove existing connection for this user if any
    this.removeUserConnection(userId);

    const subject = new Subject<SseEvent>();

    // Send initial connection established event
    subject.next({
      type: 'connection-established',
      data: { connectionId, timestamp: new Date() },
      userId
    });

    // Setup heartbeat interval (every 30 seconds)
    const interval = setInterval(() => {
      if (this.connections.has(connectionId)) {
        subject.next({
          type: 'ping',
          data: { timestamp: new Date() },
          userId,
          connectionId
        });
        const conn = this.connections.get(connectionId);
        if (conn) conn.lastHeartbeat = new Date();
      }
    }, 30000);

    this.connections.set(connectionId, {
      subject,
      lastHeartbeat: new Date(),
      userId,
      role,
      interval
    });

    this.logger.log(`Connection registered: ${connectionId} for user: ${userId}`);

    return subject;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.interval) {
        clearInterval(connection.interval);
      }
      connection.subject.complete();
      this.connections.delete(connectionId);
      this.logger.log(`Connection removed: ${connectionId}`);
    }
  }

  /**
   * Remove all connections for a user
   */
  removeUserConnection(userId: string) {
    const connectionIds = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.userId === userId)
      .map(([id]) => id);

    connectionIds.forEach(id => this.removeConnection(id));
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, notification: Notification) {
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    if (userConnections.length === 0) {
      this.logger.debug(`No active connections for user: ${userId}`);
      return;
    }

    const event: SseEvent = {
      type: 'notification',
      data: notification,
      userId
    };

    userConnections.forEach(conn => {
      conn.subject.next(event);
    });

    this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send notification to all users with specific role
   */
  sendToRole(role: string, notification: Notification) {
    const roleConnections = Array.from(this.connections.values())
      .filter(conn => conn.role === role);

    if (roleConnections.length === 0) {
      this.logger.debug(`No active connections for role: ${role}`);
      return;
    }

    const event: SseEvent = {
      type: 'notification',
      data: notification,
      userId: 'broadcast'
    };

    roleConnections.forEach(conn => {
      conn.subject.next(event);
    });

    this.logger.log(`Notification broadcast to role ${role}: ${notification.title}`);
  }

  /**
   * Get observable for a specific connection
   */
  getConnectionObservable(connectionId: string): Observable<MessageEvent> | null {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    return connection.subject.pipe(
      map(event => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify(event)
        });
        return messageEvent;
      })
    );
  }

  /**
   * Clean up zombie connections (no heartbeat for > 60 seconds)
   */
  private cleanupZombieConnections() {
    const now = new Date();
    const zombieTimeout = 60000; // 60 seconds

    const zombieConnections = Array.from(this.connections.entries())
      .filter(([_, conn]) => {
        const timeSinceHeartbeat = now.getTime() - conn.lastHeartbeat.getTime();
        return timeSinceHeartbeat > zombieTimeout;
      });

    zombieConnections.forEach(([id, conn]) => {
      this.logger.warn(`Removing zombie connection: ${id} for user: ${conn.userId}`);
      this.removeConnection(id);
    });

    if (zombieConnections.length > 0) {
      this.logger.log(`Cleaned up ${zombieConnections.length} zombie connections`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const connectionsByRole = new Map<string, number>();
    this.connections.forEach(conn => {
      const count = connectionsByRole.get(conn.role) || 0;
      connectionsByRole.set(conn.role, count + 1);
    });

    return {
      totalConnections: this.connections.size,
      connectionsByRole: Object.fromEntries(connectionsByRole),
      timestamp: new Date()
    };
  }
}