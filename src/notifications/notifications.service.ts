import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

// Типізація для нашого сповіщення
export interface CreateNotificationPayload {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'TEAM_JOIN_REQUEST' | 'TOURNAMENT_UPDATE';
    link?: string;
}

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) {}

    @OnEvent('notification.create')
    async handleNotificationCreateEvent(payload: CreateNotificationPayload) {
        try {
            await this.prisma.notification.create({
                data: payload,
            });
        } catch (error) {
            console.error('Помилка при створенні сповіщення:', error);
        }
    }

    async getUserNotifications(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async markAsRead(userId: string, notificationId: string) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}