import {
    Injectable,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class RegistrationsService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) {}

    async applyForTournament(captainId: string, tournamentId: string, teamId: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { category: true },
        });
        if (!tournament) throw new NotFoundException("Турнір не знайдено");

        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });
        if (!team) throw new NotFoundException("Команду не знайдено");

        if (team.ownerId !== captainId) {
            throw new ForbiddenException("Тільки капітан може подавати заявку від імені команди");
        }

        const existingReg = await this.prisma.registration.findUnique({
            where: {
                tournamentId_teamId: { tournamentId, teamId },
            },
        });

        if (existingReg) {
            if (existingReg.status === "PENDING") {
                throw new ConflictException("Ваша заявка вже знаходиться на розгляді організатора");
            }
            await this.prisma.registration.delete({
                where: { id: existingReg.id },
            });
        }

        const playersCount = team.members.length;
        const { minPlayers, maxPlayers } = tournament.category;

        if (playersCount < 2) {
            throw new BadRequestException(
                `Неможливо подати заявку. У вашій команді лише ${playersCount} гравець(ів), а для участі потрібно мінімум 2 людини. Запросіть ще гравців!`,
            );
        }

        if (playersCount < minPlayers) {
            throw new BadRequestException(
                `Недостатньо гравців. Для категорії "${tournament.category.name}" потрібно мінімум ${minPlayers}, а у вас ${playersCount}.`,
            );
        }

        if (maxPlayers && playersCount > maxPlayers) {
            throw new BadRequestException(
                `Забагато гравців. Максимально дозволено ${maxPlayers}, а у вас ${playersCount}.`,
            );
        }

        const registration = await this.prisma.registration.create({
            data: {
                tournamentId,
                teamId,
                status: "PENDING",
            },
            include: {
                team: { select: { name: true } },
                tournament: { select: { title: true, organizerId: true } },
            },
        });

        this.eventEmitter.emit("notification.create", {
            userId: registration.tournament.organizerId,
            title: "Нова заявка на турнір!",
            message: `Команда "${registration.team.name}" хоче взяти участь у вашому турнірі "${registration.tournament.title}".`,
            type: "TOURNAMENT_UPDATE",
            link: `/tournaments/${tournamentId}`,
        });

        return registration;
    }

    async getTournamentApplications(tournamentId: string) {
        return this.prisma.registration.findMany({
            where: { tournamentId },
            include: { team: true },
        });
    }

    async updateStatus(
        organizerId: string,
        registrationId: string,
        status: "APPROVED" | "REJECTED",
    ) {
        const registration = await this.prisma.registration.findUnique({
            where: { id: registrationId },
            include: { tournament: true },
        });

        if (!registration) {
            throw new NotFoundException("Заявку не знайдено");
        }

        if (registration.tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Ви не є організатором цього турніру");
        }

        if (status === "APPROVED") {
            const approvedCount = await this.prisma.registration.count({
                where: {
                    tournamentId: registration.tournamentId,
                    status: "APPROVED",
                },
            });

            if (approvedCount >= registration.tournament.maxTeams) {
                throw new BadRequestException(
                    `Досягнуто ліміт команд (${registration.tournament.maxTeams}). Ви не можете схвалити більше заявок.`,
                );
            }
        }

        const updated = await this.prisma.registration.update({
            where: { id: registrationId },
            data: { status },
            include: { team: { select: { name: true, ownerId: true } } },
        });

        const title = status === "APPROVED" ? "Заявку схвалено!" : "Заявку відхилено";
        const message =
            status === "APPROVED"
                ? `Вашу команду ${updated.team.name} прийнято на турнір "${registration.tournament.title}". Готуйтеся до матчів!`
                : `На жаль, вашу команду ${updated.team.name} не прийняли на турнір "${registration.tournament.title}".`;
        const type = status === "APPROVED" ? "SUCCESS" : "ERROR";

        this.eventEmitter.emit("notification.create", {
            userId: updated.team.ownerId,
            title,
            message,
            type,
            link: `/tournaments/${registration.tournamentId}`,
        });

        return updated;
    }

    async getTeamApplications(teamId: string) {
        return this.prisma.registration.findMany({
            where: { teamId },
            include: {
                tournament: {
                    select: { title: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
}
