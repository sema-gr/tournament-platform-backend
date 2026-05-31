import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Match, MatchStatus } from "@prisma/client";
import { GetMatchesDto } from "./dto/get-matches.dto";

@Injectable()
export class MatchesService {
    constructor(private prisma: PrismaService) {}

    private async promoteWinner(nextMatchId: string, winnerId: string) {
        const nextMatch = await this.prisma.match.findUnique({ where: { id: nextMatchId } });
        if (!nextMatch) return;

        const updateData = !nextMatch.teamAId ? { teamAId: winnerId } : { teamBId: winnerId };

        await this.prisma.match.update({
            where: { id: nextMatchId },
            data: updateData,
        });
    }

    private async updatePlayersStats(teamId: string, isWin: boolean) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) return;

        const playerIds = team.members.map(m => m.userId);

        await this.prisma.playerStats.updateMany({
            where: { userId: { in: playerIds } },
            data: {
                gamesPlayed: { increment: 1 },
                wins: isWin ? { increment: 1 } : undefined,
            },
        });
    }

    async generateSingleElimination(organizerId: string, tournamentId: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                registrations: {
                    where: { status: "APPROVED" },
                    include: { team: true },
                },
            },
        });

        if (!tournament) throw new NotFoundException("Турнір не знайдено");
        if (tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Ви не є організатором цього турніру");
        }

        const teams = tournament.registrations.map(r => r.team).sort(() => Math.random() - 0.5);
        const n = teams.length;
        if (n < 2) throw new BadRequestException("Недостатньо команд для генерації сітки");

        const rounds = Math.ceil(Math.log2(n));
        const createdMatches: Match[] = [];

        for (let r = rounds; r >= 1; r--) {
            const matchesInRound = Math.pow(2, rounds - r);

            for (let i = 0; i < matchesInRound; i++) {
                const currentBatchStart = createdMatches.length;
                const prevBatchStart = currentBatchStart - matchesInRound / 2;
                const nextMatchId =
                    r === rounds ? null : createdMatches[prevBatchStart + Math.floor(i / 2)]?.id;

                const match = await this.prisma.match.create({
                    data: {
                        tournamentId,
                        round: r,
                        status: MatchStatus.SCHEDULED,
                        nextMatchId: nextMatchId || null,
                    },
                });
                createdMatches.push(match);
            }
        }

        const firstRoundMatches = createdMatches.filter(m => m.round === 1);
        let teamIdx = 0;

        for (const match of firstRoundMatches) {
            const teamAId = teams[teamIdx++]?.id || null;
            const teamBId = teams[teamIdx++]?.id || null;

            const updated = await this.prisma.match.update({
                where: { id: match.id },
                data: {
                    teamAId,
                    teamBId,
                    status: teamAId && teamBId ? MatchStatus.SCHEDULED : MatchStatus.FINISHED,
                    winnerId: teamAId && !teamBId ? teamAId : null,
                },
            });

            if (teamAId && !teamBId && updated.nextMatchId) {
                await this.promoteWinner(updated.nextMatchId, teamAId);
            }
        }

        return { message: "Сітку успішно згенеровано" };
    }

    async updateMatchResult(organizerId: string, matchId: string, scoreA: number, scoreB: number) {
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true },
        });

        if (!match) throw new NotFoundException("Матч не знайдено");
        if (match.tournament.organizerId !== organizerId) {
            throw new ForbiddenException("Ви не організатор");
        }
        if (match.status === MatchStatus.FINISHED)
            throw new BadRequestException("Матч уже завершено");

        let winnerId: string | null = null;

        if (scoreA > scoreB) {
            if (!match.teamAId) throw new BadRequestException("Команда А відсутня");
            winnerId = match.teamAId;
            await this.updatePlayersStats(match.teamAId, true);
            if (match.teamBId) await this.updatePlayersStats(match.teamBId, false);
        } else if (scoreB > scoreA) {
            if (!match.teamBId) throw new BadRequestException("Команда B відсутня");
            winnerId = match.teamBId;
            await this.updatePlayersStats(match.teamBId, true);
            if (match.teamAId) await this.updatePlayersStats(match.teamAId, false);
        } else {
            throw new BadRequestException("Нічия неможлива");
        }

        const updatedMatch = await this.prisma.match.update({
            where: { id: matchId },
            data: { scoreA, scoreB, winnerId, status: MatchStatus.FINISHED },
        });

        if (updatedMatch.nextMatchId && winnerId) {
            await this.promoteWinner(updatedMatch.nextMatchId, winnerId);
        }

        return updatedMatch;
    }

    async getMyMatches(userId: string) {
        const userTeams = await this.prisma.team.findMany({
            where: {
                OR: [{ ownerId: userId }, { members: { some: { userId } } }],
            },
            select: { id: true },
        });

        const teamIds = userTeams.map(t => t.id);

        if (teamIds.length === 0) return [];

        return this.prisma.match.findMany({
            where: {
                OR: [{ teamAId: { in: teamIds } }, { teamBId: { in: teamIds } }],
            },
            include: {
                tournament: {
                    select: { id: true, title: true },
                },
                teamA: {
                    select: { id: true, name: true },
                },
                teamB: {
                    select: { id: true, name: true },
                },
            },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        });
    }

    async getAllMatches(query: GetMatchesDto) {
        const page = query.page || 1;
        const limit = query.limit || 9;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.dateFrom || query.dateTo) {
            where.date = {};

            if (query.dateFrom) {
                where.date.gte = new Date(query.dateFrom);
            }

            if (query.dateTo) {
                const endDate = new Date(query.dateTo);
                endDate.setUTCHours(23, 59, 59, 999);
                where.date.lte = endDate;
            }
        }

        if (query.teamName) {
            where.OR = [
                {
                    teamA: { name: { contains: query.teamName, mode: "insensitive" } },
                },
                {
                    teamB: { name: { contains: query.teamName, mode: "insensitive" } },
                },
            ];
        }

        const [total, data] = await this.prisma.$transaction([
            this.prisma.match.count({ where }),
            this.prisma.match.findMany({
                where,
                skip,
                take: limit,
                include: {
                    tournament: {
                        select: { id: true, title: true },
                    },
                    teamA: {
                        select: { id: true, name: true },
                    },
                    teamB: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: [{ status: "asc" }, { date: "asc" }, { createdAt: "desc" }],
            }),
        ]);

        return {
            total,
            data,
        };
    }
}
