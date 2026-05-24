import {
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class TeamsService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) {}

    async createTeam(userId: string, dto: CreateTeamDto) {
        const alreadyOwner = await this.prisma.team.findFirst({
            where: { ownerId: userId },
        });

        if (alreadyOwner) {
            throw new ConflictException(
                "Ви вже є капітаном команди. Не можна створити більше однієї.",
            );
        }

        return this.prisma.team.create({
            data: {
                name: dto.name,
                ownerId: userId,
                members: {
                    create: { userId: userId },
                },
            },
            include: {
                members: {
                    include: { user: { select: { name: true, username: true } } },
                },
            },
        });
    }

    async getTeamById(teamId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, username: true, stats: true } },
                    },
                },
                matchesA: { include: { tournament: { select: { title: true } } } },
                matchesB: { include: { tournament: { select: { title: true } } } },
            },
        });

        if (!team) throw new NotFoundException("Команду не знайдено");
        return team;
    }

    async getTeams() {
        const teams = await this.prisma.team.findMany({
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, username: true, stats: true } },
                    },
                },
                matchesA: { include: { tournament: { select: { title: true } } } },
                matchesB: { include: { tournament: { select: { title: true } } } },
                _count: true,
            },
        });

        if (!teams) throw new NotFoundException("Команди не знайдені");
        return teams;
    }

    async getTeamsByUserId(userId: string) {
        return this.prisma.team.findMany({
            where: {
                members: { some: { userId: userId } },
            },
            include: {
                owner: { select: { name: true } },
                _count: { select: { members: true } },
            },
        });
    }

    async invitePlayer(captainId: string, teamId: string, targetUserId: string) {
        const team = await this.getTeamById(teamId);

        if (team.ownerId !== captainId) {
            throw new ForbiddenException("Тільки капітан може запрошувати гравців");
        }

        const isAlreadyMember = team.members.some(m => m.userId === targetUserId);
        if (isAlreadyMember) throw new ConflictException("Гравець вже є у цій команді");

        const existingInvite = await this.prisma.teamInvitation.findUnique({
            where: { teamId_userId: { teamId, userId: targetUserId } },
        });

        if (existingInvite) {
            if (existingInvite.status === "PENDING") {
                throw new ConflictException("Ви вже надіслали запрошення цьому гравцю");
            }

            await this.prisma.teamInvitation.delete({
                where: { id: existingInvite.id },
            });
        }

        const invite = await this.prisma.teamInvitation.create({
            data: { teamId, userId: targetUserId, status: "PENDING" },
        });

        this.eventEmitter.emit("notification.create", {
            userId: targetUserId,
            title: "Запрошення в команду!",
            message: `Вас запрошують приєднатися до команди "${team.name}".`,
            type: "INFO",
            link: `/teams/${teamId}`,
        });

        return invite;
    }

    async respondToInvitation(
        userId: string,
        invitationId: string,
        status: "ACCEPTED" | "REJECTED",
    ) {
        const invite = await this.prisma.teamInvitation.findUnique({
            where: { id: invitationId },
            include: { team: true, user: true },
        });

        if (!invite) throw new NotFoundException("Запрошення не знайдено");
        if (invite.userId !== userId) throw new ForbiddenException("Це не ваше запрошення");
        if (invite.status !== "PENDING") throw new BadRequestException("Запрошення вже оброблено");

        await this.prisma.teamInvitation.update({
            where: { id: invitationId },
            data: { status },
        });

        if (status === "ACCEPTED") {
            await this.prisma.teamMember.create({
                data: { teamId: invite.teamId, userId: invite.userId },
            });

            this.eventEmitter.emit("notification.create", {
                userId: invite.team.ownerId,
                title: "Гравець прийняв запрошення!",
                message: `Гравець ${invite.user.name} приєднався до команди "${invite.team.name}".`,
                type: "SUCCESS",
                link: `/teams/${invite.teamId}`,
            });
        } else {
            this.eventEmitter.emit("notification.create", {
                userId: invite.team.ownerId,
                title: "Гравець відхилив запрошення",
                message: `Гравець ${invite.user.name} відмовився вступати до "${invite.team.name}".`,
                type: "WARNING",
            });
        }

        return { message: `Запрошення ${status === "ACCEPTED" ? "прийнято" : "відхилено"}` };
    }

    async requestToJoinTeam(userId: string, teamId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) throw new NotFoundException("Команду не знайдено");

        const isMember = team.members.some(m => m.userId === userId);
        if (isMember) throw new ConflictException("Ви вже є учасником цієї команди");

        const existingRequest = await this.prisma.teamJoinRequest.findUnique({
            where: {
                userId_teamId: { userId, teamId },
            },
        });

        if (existingRequest) {
            if (existingRequest.status === "PENDING") {
                throw new ConflictException("Ваш запит вже розглядається капітаном");
            }
            
            await this.prisma.teamJoinRequest.delete({ 
                where: { id: existingRequest.id } 
            });
        }

        const request = await this.prisma.teamJoinRequest.create({
            data: { userId, teamId, status: "PENDING" },
            include: { user: true },
        });

        this.eventEmitter.emit("notification.create", {
            userId: team.ownerId,
            title: "Нова заявка в команду!",
            message: `Гравець ${request.user.name} (@${request.user.username}) хоче приєднатися до вашої команди.`,
            type: "TEAM_JOIN_REQUEST",
            link: `/teams/${teamId}`,
        });

        return request;
    }

    async getTeamJoinRequests(teamId: string, captainId: string) {
        const team = await this.prisma.team.findUnique({ where: { id: teamId } });

        if (!team) throw new NotFoundException("Команду не знайдено");
        if (team.ownerId !== captainId) {
            throw new ForbiddenException("Тільки капітан може переглядати запити на вступ");
        }

        return this.prisma.teamJoinRequest.findMany({
            where: { teamId, status: "PENDING" },
            include: {
                user: { select: { id: true, name: true, username: true, stats: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async respondToJoinRequest(
        captainId: string,
        requestId: string,
        status: "APPROVED" | "REJECTED",
    ) {
        const request = await this.prisma.teamJoinRequest.findUnique({
            where: { id: requestId },
            include: { team: true },
        });

        if (!request) throw new NotFoundException("Запит не знайдено");

        if (request.team.ownerId !== captainId) {
            throw new ForbiddenException("Тільки капітан може керувати запитами");
        }

        const updatedRequest = await this.prisma.teamJoinRequest.update({
            where: { id: requestId },
            data: { status },
        });

        if (status === "APPROVED") {
            await this.prisma.teamMember.create({
                data: {
                    userId: request.userId,
                    teamId: request.teamId,
                },
            });
        }

        const title = status === "APPROVED" ? "Вас прийнято в команду!" : "Заявку відхилено";
        const message =
            status === "APPROVED"
                ? `Капітан команди ${request.team.name} схвалив вашу заявку на вступ.`
                : `Вашу заявку на вступ до команди ${request.team.name} було відхилено.`;

        this.eventEmitter.emit("notification.create", {
            userId: request.userId,
            title,
            message,
            type: status === "APPROVED" ? "SUCCESS" : "INFO",
            link: `/teams/${request.teamId}`,
        });

        return updatedRequest;
    }

    async leaveTeam(userId: string, teamId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) throw new NotFoundException("Команду не знайдено");

        if (team.ownerId === userId) {
            throw new BadRequestException(
                "Капітан не може покинути команду. Ви маєте або розпустити її, або передати права власності іншому гравцю.",
            );
        }

        const isMember = team.members.some(m => m.userId === userId);
        if (!isMember) throw new BadRequestException("Ви не є учасником цієї команди");

        await this.prisma.teamMember.deleteMany({
            where: {
                teamId: teamId,
                userId: userId,
            },
        });

        this.eventEmitter.emit("notification.create", {
            userId: team.ownerId,
            title: "Гравець покинув команду",
            message: `Гравець щойно вийшов зі складу вашої команди "${team.name}".`,
            type: "WARNING",
            link: `/teams/${teamId}`,
        });

        return { message: "Ви успішно покинули команду" };
    }

    async disbandTeam(userId: string, teamId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) throw new NotFoundException("Команду не знайдено");

        if (team.ownerId !== userId) {
            throw new ForbiddenException("Тільки капітан може розпустити команду");
        }

        const activeTournaments = await this.prisma.registration.findFirst({
            where: {
                teamId,
                status: "APPROVED",
                tournament: { status: "ACTIVE" },
            },
        });

        if (activeTournaments) {
            throw new BadRequestException(
                "Неможливо розпустити команду, поки вона бере участь в активному турнірі.",
            );
        }

        const memberIds = team.members.filter(m => m.userId !== userId).map(m => m.userId);

        for (const memberId of memberIds) {
            this.eventEmitter.emit("notification.create", {
                userId: memberId,
                title: "Команду розпущено",
                message: `Капітан розпустив команду "${team.name}". Ви більше не є її учасником.`,
                type: "ERROR",
            });
        }

        await this.prisma.team.delete({
            where: { id: teamId },
        });

        return { message: "Команду успішно розпущено" };
    }

    async getUserInvitations(userId: string) {
        return this.prisma.teamInvitation.findMany({
            where: { userId, status: "PENDING" },
            include: {
                team: { select: { id: true, name: true, owner: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
}
