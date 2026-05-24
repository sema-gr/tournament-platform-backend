import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from 'src/users/types/user';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async getMyNotifications(@Req() req: RequestWithUser) {
        return this.notificationsService.getUserNotifications(req.user.id);
    }

    @Patch('read-all')
    async markAllAsRead(@Req() req: RequestWithUser) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }

    @Patch(':id/read')
    async markAsRead(
        @Req() req: RequestWithUser, 
        @Param('id') notificationId: string
    ) {
        return this.notificationsService.markAsRead(req.user.id, notificationId);
    }
}