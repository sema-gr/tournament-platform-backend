import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/createUser.dto";
import { GetUserCareerDto } from "./dto/get-user-career.dto";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { User } from "./types";
import { Prisma } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) {}

    async create(data: CreateUserDto) {
        try {
            const user = await this.prisma.user.create({
                data: {
                    ...data,
                    isApprovedOrganizer: data.role === "ORGANIZER" ? false : undefined,
                    stats: data.role === "PLAYER" ? { create: {} } : undefined,
                },
            });

            if (user.role === "ORGANIZER") {
                const admins = await this.prisma.user.findMany({
                    where: { role: "ADMIN" },
                    select: { id: true },
                });

                for (const admin of admins) {
                    this.eventEmitter.emit("notification.create", {
                        userId: admin.id,
                        title: "Нова заявка на організатора!",
                        message: `Компанія "${user.organizationName || user.name}" очікує на перевірку.`,
                        type: "INFO",
                        link: "/admin",
                    });
                }
            }

            return user;
        } catch (error: unknown) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Користувач з таким email або username вже існує");
                }
                throw error;
            }
        }
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    async findOne(id: string, query?: PaginationQueryDto) {
        const parsedPage = Number(query?.page);
        const parsedLimit = Number(query?.limit);
        const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
        const skip = (page - 1) * limit;

        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                stats: true,
                ownedTeams: true,
                tournaments: {
                    skip,
                    take: limit,
                    include: {
                        category: true,
                        _count: {
                            select: { registrations: true },
                        },
                    },
                    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
                },
                _count: {
                    select: { tournaments: true },
                },
            },
        });

        if (!user) return null;

        const total = user._count.tournaments;

        return {
            ...user,
            tournaments: {
                data: user.tournaments,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    }

    async searchPlayers(query: string) {
        if (!query || query.length < 2) return [];

        const res = this.prisma.user.findMany({
            where: {
                role: "PLAYER",
                username: {
                    contains: query,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                name: true,
                username: true,
            },
            take: 5,
        });
        return res;
    }

    async update(id: string, data: Partial<CreateUserDto>): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<User> {
        return this.prisma.user.delete({
            where: { id },
        });
    }

    async getUserCareer(userId: string, query?: GetUserCareerDto) {
        const parsedPage = Number(query?.page);
        const parsedLimit = Number(query?.limit);
        const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
        const skip = (page - 1) * limit;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                organizationName: true,
                stats: true,
                createdAt: true,
                isApprovedOrganizer: true,
                teams: {
                    include: {
                        team: {
                            select: {
                                id: true,
                                name: true,
                                _count: {
                                    select: { members: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) throw new NotFoundException("Користувача не знайдено");

        const teamIds = user.teams.map(t => t.teamId);

        const historyWhere: Prisma.RegistrationWhereInput = {
            teamId: { in: teamIds },
            status: "APPROVED",
        };

        const [total, tournamentHistory] =
            teamIds.length > 0
                ? await this.prisma.$transaction([
                      this.prisma.registration.count({ where: historyWhere }),
                      this.prisma.registration.findMany({
                          where: historyWhere,
                          skip,
                          take: limit,
                          orderBy: [
                              { tournament: { startDate: "desc" } },
                              { createdAt: "desc" },
                          ],
                          include: {
                              tournament: {
                                  select: {
                                      id: true,
                                      title: true,
                                      status: true,
                                      category: { select: { name: true } },
                                  },
                              },
                              team: { select: { name: true } },
                          },
                      }),
                  ])
                : [0, []];

        return {
            profile: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                organization: user.organizationName,
                createdAt: user.createdAt,
                isApprovedOrganizer: user.isApprovedOrganizer,
            },
            statistics: user.stats,
            teams: user.teams.map(t => t.team),
            history: {
                data: tournamentHistory.map(h => ({
                    tournamentId: h.tournamentId,
                    tournamentTitle: h.tournament.title,
                    category: h.tournament.category.name,
                    teamName: h.team.name,
                    status: h.tournament.status,
                })),
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    }

    async updatePlayersStats(userIds: string[], isWin: boolean) {
        if (!userIds || userIds.length === 0) return;

        await this.prisma.playerStats.updateMany({
            where: {
                userId: { in: userIds },
            },
            data: {
                gamesPlayed: { increment: 1 },
                wins: isWin ? { increment: 1 } : undefined,

                losses: !isWin ? { increment: 1 } : undefined,
            },
        });
    }

    async resubmitOrganizerRequest(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("Користувача не знайдено");

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { organizerStatus: "PENDING" },
        });

        const admins = await this.prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
        });

        for (const admin of admins) {
            this.eventEmitter.emit("notification.create", {
                userId: admin.id,
                title: "Повторна заявка!",
                message: `Компанія "${user.organizationName}" надіслала запит на статус організатора повторно.`,
                type: "INFO",
                link: "/admin",
            });
        }

        return { success: true, status: updatedUser.organizerStatus };
    }
}
