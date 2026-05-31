import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { TournamentStatus } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "crypto";
import { DraftMatch } from "./types/type";
import { UsersService } from "src/users/users.service";
import { GetTournamentsDto } from "./dto/get-tournaments.dto";

@Injectable()
export class TournamentsService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
        private usersService: UsersService,
    ) {}

    async create(organizerId: string, dto: CreateTournamentDto) {
        const user = await this.prisma.user.findUnique({ where: { id: organizerId } });
        if (user?.role !== "ORGANIZER" && user?.role !== "ADMIN") {
            throw new ForbiddenException("Тільки організатори можуть створювати турніри");
        }

        return this.prisma.tournament.create({
            data: {
                title: dto.title,
                description: dto.description,
                maxTeams: dto.maxTeams,
                startDate: new Date(dto.startDate),
                format: dto.format || "SINGLE_ELIMINATION",

                categoryId: dto.categoryId,
                organizerId: organizerId,
                status: "PLANNED",
            },
            include: {
                category: true,
            },
        });
    }

    async findAll(query: GetTournamentsDto) {
        const page = query.page || 1;
        const limit = query.limit || 9;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.categoryId) where.categoryId = query.categoryId;
        if (query.status) where.status = query.status;
        if (query.maxTeams) where.maxTeams = query.maxTeams;

        if (query.search) {
            where.title = { contains: query.search, mode: "insensitive" };
        }

        if (query.dateFrom || query.dateTo) {
            where.startDate = {};
            if (query.dateFrom) where.startDate.gte = new Date(query.dateFrom);
            if (query.dateTo) where.startDate.lte = new Date(query.dateTo);
        }

        const [total, data] = await this.prisma.$transaction([
            this.prisma.tournament.count({ where }),
            this.prisma.tournament.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: true,
                    _count: { select: { registrations: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        return {
            total,
            data,
        };
    }

    async getById(id: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id },
            include: {
                category: true,
                organizer: {
                    select: { name: true, organizationName: true },
                },
                registrations: {
                    include: { team: true },
                },
                matches: true,
                _count: {
                    select: {
                        registrations: {
                            where: {
                                status: "APPROVED",
                            },
                        },
                    },
                },
            },
        });
        if (!tournament) throw new NotFoundException("Турнір не знайдено");
        return tournament;
    }

    async getTournamentStandings(tournamentId: string) {
        const matches = await this.prisma.match.findMany({
            where: {
                tournamentId,
                status: "FINISHED",
            },
        });

        const teams = await this.prisma.registration.findMany({
            where: { tournamentId, status: "APPROVED" },
            include: { team: true },
        });

        const stats = teams.map(reg => {
            const teamId = reg.teamId;
            let points = 0;
            let played = 0;

            matches.forEach(m => {
                if (m.teamAId === teamId || m.teamBId === teamId) {
                    played++;
                    if (m.winnerId === teamId) points += 3;
                    else if (m.winnerId === null && m.scoreA === m.scoreB) points += 1;
                }
            });

            return {
                teamName: reg.team.name,
                played,
                points,
            };
        });

        return stats.sort((a, b) => b.points - a.points || a.played - b.played);
    }

    async startTournament(organizerId: string, tournamentId: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { category: true },
        });

        if (!tournament) throw new NotFoundException("Турнір не знайдено");

        if (tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Тільки організатор може розпочати турнір");
        }

        if (tournament.status !== "PLANNED" && tournament.status !== "REGISTRATION") {
            throw new BadRequestException("Турнір вже розпочато або завершено");
        }

        const approvedRegistrations = await this.prisma.registration.findMany({
            where: {
                tournamentId,
                status: "APPROVED",
            },
            include: {
                team: {
                    include: { members: true },
                },
            },
        });

        const playerTeamMap = new Map<string, string>();

        for (const reg of approvedRegistrations) {
            const requiredPlayers = 2;

            if (reg.team.members.length !== requiredPlayers) {
                throw new BadRequestException(
                    `Неможливо розпочати турнір: команда "${reg.team.name}" має ${reg.team.members.length} гравців, а потрібно рівно ${requiredPlayers}. Нехай капітан добере команду, або відхиліть їхню заявку.`,
                );
            }

            for (const member of reg.team.members) {
                const existingTeam = playerTeamMap.get(member.userId);

                if (existingTeam) {
                    throw new BadRequestException(
                        `Неможливо розпочати турнір: гравець знаходиться відразу в двох командах ("${reg.team.name}" та "${existingTeam}"). Один гравець може грати лише за одну команду в рамках турніру.`,
                    );
                }
                playerTeamMap.set(member.userId, reg.team.name);
            }
        }

        const teams = approvedRegistrations.map(reg => reg.team);

        if (teams.length < 2) {
            throw new BadRequestException("Для початку турніру потрібно хоча б 2 схвалені команди");
        }

        await this.prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: "ACTIVE" },
        });

        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

        shuffledTeams.forEach(team => {
            this.eventEmitter.emit("notification.create", {
                userId: team.ownerId,
                title: "Турнір розпочався! ⚔️",
                message: `Турнір "${tournament.title}" офіційно стартував. Перевірте турнірну сітку, щоб дізнатися свого суперника!`,
                type: "TOURNAMENT_UPDATE",
                link: `/tournaments/${tournamentId}`,
            });
        });

        const N = shuffledTeams.length;
        const P = Math.pow(2, Math.ceil(Math.log2(N)));
        const totalRounds = Math.log2(P);

        const matchesByRound: DraftMatch[][] = [];

        for (let r = 1; r <= totalRounds; r++) {
            const matchesInRound = P / Math.pow(2, r);
            const roundMatches: DraftMatch[] = [];

            for (let i = 0; i < matchesInRound; i++) {
                roundMatches.push({
                    id: randomUUID(),
                    tournamentId,
                    round: r,
                    status: "SCHEDULED",
                    teamAId: null,
                    teamBId: null,
                    winnerId: null,
                    nextMatchId: null,
                    scoreA: 0,
                    scoreB: 0,
                });
            }
            matchesByRound.push(roundMatches);
        }

        for (let r = 0; r < totalRounds - 1; r++) {
            const currentRound = matchesByRound[r];
            const nextRound = matchesByRound[r + 1];

            for (let i = 0; i < currentRound.length; i++) {
                currentRound[i].nextMatchId = nextRound[Math.floor(i / 2)].id;
            }
        }

        const byesCount = P - N;
        const realMatchesCount = P / 2 - byesCount;
        let teamQueueIndex = 0;

        const firstRound = matchesByRound[0];

        for (let i = 0; i < firstRound.length; i++) {
            const match = firstRound[i];

            if (i < realMatchesCount) {
                match.teamAId = shuffledTeams[teamQueueIndex++].id;
                match.teamBId = shuffledTeams[teamQueueIndex++].id;
            } else {
                const autoWinnerId = shuffledTeams[teamQueueIndex++].id;
                match.teamAId = autoWinnerId;
                match.winnerId = autoWinnerId;
                match.status = "FINISHED";
                match.scoreA = 1;
            }
        }

        for (let i = 0; i < firstRound.length; i++) {
            const match = firstRound[i];
            if (match.winnerId && match.nextMatchId) {
                const nextMatch = matchesByRound[1].find(m => m.id === match.nextMatchId);
                if (nextMatch) {
                    if (!nextMatch.teamAId) {
                        nextMatch.teamAId = match.winnerId;
                    } else {
                        nextMatch.teamBId = match.winnerId;
                    }
                }
            }
        }

        const allMatchesToInsert = matchesByRound.flat();

        await this.prisma.match.createMany({
            data: allMatchesToInsert.map(m => ({
                id: m.id,
                tournamentId: m.tournamentId,
                round: m.round,
                status: m.status,
                teamAId: m.teamAId,
                teamBId: m.teamBId,
                winnerId: m.winnerId,
                nextMatchId: m.nextMatchId,
                scoreA: 0,
                scoreB: 0,
            })),
        });

        return {
            message: "Турнір успішно розпочато",
            teamsCount: teams.length,
            generatedMatches: allMatchesToInsert.length,
        };
    }

    async updateMatchScore(organizerId: string, matchId: string, scoreA: number, scoreB: number) {
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true },
        });

        if (!match) throw new NotFoundException("Матч не знайдено");

        if (match.tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Тільки організатор турніру може вносити результати");
        }

        if (match.status === "FINISHED") {
            throw new BadRequestException("Цей матч вже завершено");
        }
        if (!match.teamAId || !match.teamBId) {
            throw new BadRequestException("У цьому матчі ще не визначені обидва суперники");
        }
        if (scoreA === scoreB) {
            throw new BadRequestException("У форматі на вибування (Play-off) не може бути нічиєї");
        }

        const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
        const loserId = scoreA > scoreB ? match.teamBId : match.teamAId;

        const updatedMatch = await this.prisma.match.update({
            where: { id: matchId },
            data: {
                scoreA,
                scoreB,
                winnerId,
                status: "FINISHED",
            },
        });

        if (match.nextMatchId) {
            const nextMatch = await this.prisma.match.findUnique({
                where: { id: match.nextMatchId },
            });

            if (nextMatch) {
                if (!nextMatch.teamAId) {
                    await this.prisma.match.update({
                        where: { id: nextMatch.id },
                        data: { teamAId: winnerId },
                    });
                } else if (!nextMatch.teamBId) {
                    await this.prisma.match.update({
                        where: { id: nextMatch.id },
                        data: { teamBId: winnerId },
                    });
                }
            }
        } else {
            await this.prisma.tournament.update({
                where: { id: match.tournamentId },
                data: { status: "FINISHED" },
            });

            const winningTeam = await this.prisma.team.findUnique({
                where: { id: winnerId },
                include: { members: true },
            });

            if (winningTeam) {
                this.eventEmitter.emit("notification.create", {
                    userId: match.tournament.organizerId,
                    title: "Турнір завершено! 🏁",
                    message: `Турнір "${match.tournament.title}" завершено! Переможець: "${winningTeam.name}".`,
                    type: "SUCCESS",
                    link: `/tournaments/${match.tournamentId}`,
                });

                // Сповіщаємо кожного гравця команди-переможця
                for (const member of winningTeam.members) {
                    this.eventEmitter.emit("notification.create", {
                        userId: member.userId,
                        title: "🏆 ВИ ПЕРЕМОГЛИ!",
                        message: `Ваша команда "${winningTeam.name}" виграла турнір "${match.tournament.title}"! Вітаємо чемпіонів!`,
                        type: "SUCCESS",
                        link: `/tournaments/${match.tournamentId}`,
                    });
                }
            }
        }

        const teamA = await this.prisma.team.findUnique({
            where: { id: match.teamAId },
            include: { members: true },
        });
        const teamB = await this.prisma.team.findUnique({
            where: { id: match.teamBId },
            include: { members: true },
        });

        if (teamA && teamB) {
            const winnerMembers = winnerId === teamA.id ? teamA.members : teamB.members;
            const loserMembers = winnerId === teamA.id ? teamB.members : teamA.members;

            const winnerUserIds = winnerMembers.map(m => m.userId);
            const loserUserIds = loserMembers.map(m => m.userId);

            await this.usersService.updatePlayersStats(winnerUserIds, true);
            await this.usersService.updatePlayersStats(loserUserIds, false);
        }

        return updatedMatch;
    }

    async leaveTournament(captainId: string, tournamentId: string, teamId: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) throw new NotFoundException("Турнір не знайдено");

        if (tournament.status === "ACTIVE" || tournament.status === "FINISHED") {
            throw new BadRequestException(
                "Неможливо покинути турнір, який вже розпочався або завершився",
            );
        }

        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
        });
        if (!team) throw new NotFoundException("Команду не знайдено");

        if (team.ownerId !== captainId) {
            throw new ForbiddenException("Тільки капітан може зняти команду з турніру");
        }

        const registration = await this.prisma.registration.findUnique({
            where: { tournamentId_teamId: { tournamentId, teamId } },
        });

        if (!registration) {
            throw new BadRequestException("Ваша команда не подавала заявку на цей турнір");
        }

        await this.prisma.registration.delete({
            where: { id: registration.id },
        });

        this.eventEmitter.emit("notification.create", {
            userId: tournament.organizerId,
            title: "Команда знялася з турніру",
            message: `Команда "${team.name}" скасувала свою участь у турнірі "${tournament.title}".`,
            type: "WARNING",
            link: `/tournaments/${tournamentId}`,
        });

        return { message: "Ви успішно скасували участь команди в турнірі" };
    }

    async deleteTournament(organizerId: string, tournamentId: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                registrations: { include: { team: true } },
            },
        });

        if (!tournament) throw new NotFoundException("Турнір не знайдено");

        if (tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Тільки організатор може скасувати цей турнір");
        }

        if (tournament.status === "ACTIVE") {
            throw new BadRequestException(
                "Неможливо скасувати турнір, матчі якого вже йдуть. Зверніться до підтримки.",
            );
        }

        for (const reg of tournament.registrations) {
            this.eventEmitter.emit("notification.create", {
                userId: reg.team.ownerId,
                title: "Турнір скасовано",
                message: `Організатор скасував турнір "${tournament.title}". Подію видалено.`,
                type: "ERROR",
            });
        }

        await this.prisma.$transaction([
            this.prisma.match.deleteMany({
                where: { tournamentId },
            }),
            this.prisma.registration.deleteMany({
                where: { tournamentId },
            }),
            this.prisma.tournament.delete({
                where: { id: tournamentId },
            }),
        ]);

        return { message: "Турнір успішно скасовано та видалено" };
    }
}
