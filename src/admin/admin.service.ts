import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) {}

    async getDashboardStats() {
        const [totalTeams, totalTournaments, totalMatches, pendingRequests] =
            await this.prisma.$transaction([
                this.prisma.team.count(),
                this.prisma.tournament.count(),
                this.prisma.match.count(),
                this.prisma.user.count({
                    where: { role: "ORGANIZER", isApprovedOrganizer: false },
                }),
            ]);

        return {
            totalTeams,
            totalTournaments,
            totalMatches,
            pendingRequests,
        };
    }

    async getPendingOrganizers() {
        return this.prisma.user.findMany({
            where: { role: "ORGANIZER", isApprovedOrganizer: false },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                organizationName: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });
    }

    async approveOrganizer(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("Користувача не знайдено");

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { isApprovedOrganizer: true },
        });

        this.eventEmitter.emit("notification.create", {
            userId: updatedUser.id,
            title: "Статус підтверджено! 🏅",
            message:
                "Ваш акаунт організатора успішно перевірено. Тепер ви можете створювати турніри!",
            type: "SUCCESS",
            link: "/tournaments/create",
        });

        return { success: true, user: updatedUser };
    }

    async rejectOrganizer(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("Користувача не знайдено");

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                organizerStatus: "REJECTED",
                isApprovedOrganizer: false,
            },
        });

        this.eventEmitter.emit("notification.create", {
            userId: updatedUser.id,
            title: "Заявку відхилено",
            message:
                "На жаль, вашу заявку на статус організатора було відхилено. Ви можете надіслати запит повторно.",
            type: "ERROR",
        });

        return { success: true };
    }
}
