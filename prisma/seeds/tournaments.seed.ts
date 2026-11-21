import {
    PrismaClient,
    Role,
    ApplicationStatus,
    TournamentStatus,
    TournamentFormat,
    MatchStatus,
} from "@prisma/client";

interface TournamentSeedSpec {
    title: string;
    description: string;
    categorySlug: "volleyball" | "football" | "basketball" | "tennis-doubles";
    organizerIndex: number;
    status: TournamentStatus;
    maxTeams: number;
    daysOffset: number;
}

const TOURNAMENTS_DATA: TournamentSeedSpec[] = [
    // --- ВОЛЕЙБОЛ (5 турнірів) ---
    {
        title: "Відкритий кубок з волейболу",
        description: "Міжрегіональний волейбольний турнір серед аматорських команд.",
        categorySlug: "volleyball",
        organizerIndex: 0,
        status: TournamentStatus.FINISHED,
        maxTeams: 4,
        daysOffset: -28,
    },
    {
        title: "Волейбольна Ліга Столиці",
        description: "Серія плей-оф матчів із класичного волейболу.",
        categorySlug: "volleyball",
        organizerIndex: 1,
        status: TournamentStatus.ACTIVE,
        maxTeams: 8,
        daysOffset: -3,
    },
    {
        title: "Весняний волейбольний турнір",
        description: "Відкрита реєстрація на щорічні змагання з волейболу.",
        categorySlug: "volleyball",
        organizerIndex: 2,
        status: TournamentStatus.REGISTRATION,
        maxTeams: 8,
        daysOffset: 4,
    },
    {
        title: "Суперкубок з волейболу 2026",
        description: "Головний кубковий турнір сезону з волейболу.",
        categorySlug: "volleyball",
        organizerIndex: 0,
        status: TournamentStatus.PLANNED,
        maxTeams: 8,
        daysOffset: 16,
    },
    {
        title: "Кубок Виклику: Волейбол",
        description: "Динамічний вікенд-турнір на вибування для сильних колективів.",
        categorySlug: "volleyball",
        organizerIndex: 1,
        status: TournamentStatus.FINISHED,
        maxTeams: 4,
        daysOffset: -19,
    },

    // --- ФУТБОЛ (5 турнірів) ---
    {
        title: "Кубок Києва з футболу",
        description: "Традиційний футбольний турнір у форматі на вибування.",
        categorySlug: "football",
        organizerIndex: 1,
        status: TournamentStatus.FINISHED,
        maxTeams: 8,
        daysOffset: -24,
    },
    {
        title: "Ліга Чемпіонів Аматорів",
        description: "Футбольні поєдинки між провідними командами платформи.",
        categorySlug: "football",
        organizerIndex: 2,
        status: TournamentStatus.ACTIVE,
        maxTeams: 8,
        daysOffset: -2,
    },
    {
        title: "Осінній футбольний марафон",
        description: "Набір команд на інтенсивний футбольний кубок.",
        categorySlug: "football",
        organizerIndex: 0,
        status: TournamentStatus.REGISTRATION,
        maxTeams: 8,
        daysOffset: 5,
    },
    {
        title: "Кубок Незалежності з футболу",
        description: "Святковий турнір з футболу для команд з усієї України.",
        categorySlug: "football",
        organizerIndex: 1,
        status: TournamentStatus.PLANNED,
        maxTeams: 8,
        daysOffset: 19,
    },
    {
        title: "Зимова футбольна першість",
        description: "Відбіркові та фінальні матчі зимового футбольного сезону.",
        categorySlug: "football",
        organizerIndex: 2,
        status: TournamentStatus.ACTIVE,
        maxTeams: 4,
        daysOffset: -1,
    },

    // --- БАСКЕТБОЛ (5 турнірів) ---
    {
        title: "Українська баскетбольна ліга",
        description: "Турнір з баскетболу з напруженими плей-оф серіями.",
        categorySlug: "basketball",
        organizerIndex: 2,
        status: TournamentStatus.FINISHED,
        maxTeams: 4,
        daysOffset: -15,
    },
    {
        title: "Кубок Данків 2026",
        description: "Видовищні баскетбольні матчі серед кращих команд.",
        categorySlug: "basketball",
        organizerIndex: 0,
        status: TournamentStatus.ACTIVE,
        maxTeams: 8,
        daysOffset: -4,
    },
    {
        title: "Баскетбольний турнір Столиці",
        description: "Триває прийом заявок від команд на відкритий чемпіонат.",
        categorySlug: "basketball",
        organizerIndex: 1,
        status: TournamentStatus.REGISTRATION,
        maxTeams: 8,
        daysOffset: 6,
    },
    {
        title: "Streetball & Pro Баскетбол Cup",
        description: "Запланований міський кубок із баскетболу.",
        categorySlug: "basketball",
        organizerIndex: 2,
        status: TournamentStatus.PLANNED,
        maxTeams: 8,
        daysOffset: 22,
    },
    {
        title: "Зимовий баскетбольний чемпіонат",
        description: "Реєстрація відкрита для усіх сформованих баскетбольних команд.",
        categorySlug: "basketball",
        organizerIndex: 0,
        status: TournamentStatus.REGISTRATION,
        maxTeams: 4,
        daysOffset: 3,
    },

    // --- ТЕНІС (ПАРНИЙ) (5 турнірів) ---
    {
        title: "Київ Open: Парний теніс",
        description: "Завершений турнір із парного тенісу серед аматорських дуетів.",
        categorySlug: "tennis-doubles",
        organizerIndex: 0,
        status: TournamentStatus.FINISHED,
        maxTeams: 4,
        daysOffset: -12,
    },
    {
        title: "Тенісна Дуель 2x2",
        description: "Активний турнір із парного тенісу на критих кортах.",
        categorySlug: "tennis-doubles",
        organizerIndex: 1,
        status: TournamentStatus.ACTIVE,
        maxTeams: 4,
        daysOffset: -2,
    },
    {
        title: "Великий шолом Аматорів",
        description: "Реєстрація пар на престижний аматорський тенісний кубок.",
        categorySlug: "tennis-doubles",
        organizerIndex: 2,
        status: TournamentStatus.REGISTRATION,
        maxTeams: 8,
        daysOffset: 7,
    },
    {
        title: "Кубок Спілки Тенісистів",
        description: "Запланований парний турнір на ґрунтових кортах.",
        categorySlug: "tennis-doubles",
        organizerIndex: 0,
        status: TournamentStatus.PLANNED,
        maxTeams: 4,
        daysOffset: 14,
    },
    {
        title: "Фінальний Masters з парного тенісу",
        description: "Підсумковий турнір сезону для кращих тенісних пар.",
        categorySlug: "tennis-doubles",
        organizerIndex: 1,
        status: TournamentStatus.PLANNED,
        maxTeams: 8,
        daysOffset: 25,
    },
];

function getScorePair(
    categorySlug: TournamentSeedSpec["categorySlug"],
    variant: number,
): [number, number] {
    switch (categorySlug) {
        case "football":
            return variant % 2 === 0 ? [3, 1] : [2, 1];
        case "volleyball":
            return variant % 2 === 0 ? [3, 1] : [3, 2];
        case "basketball":
            return variant % 2 === 0 ? [84, 72] : [79, 75];
        case "tennis-doubles":
            return variant % 2 === 0 ? [2, 0] : [2, 1];
    }
}

function addDays(base: Date, days: number): Date {
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return result;
}

export async function seedTournaments(prisma: PrismaClient): Promise<void> {
    console.log("🏆 [4/4] Заповнення турнірів, реєстрацій, матчів та статистики...");

    const [categories, organizers, teams] = await Promise.all([
        prisma.category.findMany(),
        prisma.user.findMany({
            where: { role: Role.ORGANIZER },
            orderBy: { email: "asc" },
        }),
        prisma.team.findMany({
            include: { members: true },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    const categoryBySlug = new Map(categories.map(c => [c.slug, c]));

    if (categories.length < 4) {
        throw new Error(
            "Не знайдено всі 4 категорії. Спочатку запустіть categories.seed.ts.",
        );
    }
    if (organizers.length < 3) {
        throw new Error(
            "У базі даних має бути щонайменше 3 організатори. Спочатку запустіть users.seed.ts.",
        );
    }
    if (teams.length < 5) {
        throw new Error(
            "У базі даних має бути щонайменше 5 команд. Спочатку запустіть teams.seed.ts.",
        );
    }

    const now = new Date();
    let createdTournaments = 0;

    for (let i = 0; i < TOURNAMENTS_DATA.length; i++) {
        const spec = TOURNAMENTS_DATA[i];
        const category = categoryBySlug.get(spec.categorySlug);
        if (!category) {
            throw new Error(`Не знайдено категорію зі slug "${spec.categorySlug}".`);
        }

        const organizer = organizers[spec.organizerIndex % organizers.length];

        const existingTournament = await prisma.tournament.findFirst({
            where: { title: spec.title },
        });
        if (existingTournament) {
            continue;
        }

        const startDate = addDays(now, spec.daysOffset);

        const tournament = await prisma.tournament.create({
            data: {
                title: spec.title,
                description: spec.description,
                format: TournamentFormat.SINGLE_ELIMINATION,
                status: spec.status,
                maxTeams: spec.maxTeams,
                startDate,
                categoryId: category.id,
                organizerId: organizer.id,
            },
        });

        // Циклічно перемішуємо 5 команд, щоб у різних турнірах брали участь різні четвірки
        const rotatedTeams = [
            ...teams.slice(i % teams.length),
            ...teams.slice(0, i % teams.length),
        ];

        const approvedTeams =
            spec.status === TournamentStatus.PLANNED
                ? rotatedTeams.slice(0, 2)
                : rotatedTeams.slice(0, 4);

        for (const team of approvedTeams) {
            await prisma.registration.create({
                data: {
                    tournamentId: tournament.id,
                    teamId: team.id,
                    status: ApplicationStatus.APPROVED,
                },
            });
        }

        // Для PLANNED і REGISTRATION додаємо 1 заявку на розгляді (PENDING)
        if (
            spec.status === TournamentStatus.PLANNED ||
            spec.status === TournamentStatus.REGISTRATION
        ) {
            const pendingTeam = rotatedTeams[approvedTeams.length];
            await prisma.registration.create({
                data: {
                    tournamentId: tournament.id,
                    teamId: pendingTeam.id,
                    status: ApplicationStatus.PENDING,
                },
            });
        }

        // Генеруємо турнірну сітку (2 півфінали + фінал) для ACTIVE та FINISHED
        if (
            spec.status === TournamentStatus.ACTIVE ||
            spec.status === TournamentStatus.FINISHED
        ) {
            const [semi1WinScore, semi1LoseScore] = getScorePair(spec.categorySlug, i);
            const [semi2WinScore, semi2LoseScore] = getScorePair(spec.categorySlug, i + 1);
            const [finalWinScore, finalLoseScore] = getScorePair(spec.categorySlug, i + 2);

            const semi1WinnerFirst = i % 2 === 0;
            const semi1WinnerId = semi1WinnerFirst ? approvedTeams[0].id : approvedTeams[1].id;
            const semi1 = await prisma.match.create({
                data: {
                    tournamentId: tournament.id,
                    teamAId: approvedTeams[0].id,
                    teamBId: approvedTeams[1].id,
                    round: 1,
                    status: MatchStatus.FINISHED,
                    scoreA: semi1WinnerFirst ? semi1WinScore : semi1LoseScore,
                    scoreB: semi1WinnerFirst ? semi1LoseScore : semi1WinScore,
                    winnerId: semi1WinnerId,
                    date: addDays(startDate, 0),
                },
            });

            const semi2WinnerFirst = i % 3 === 0;
            const semi2WinnerId = semi2WinnerFirst ? approvedTeams[2].id : approvedTeams[3].id;
            const semi2 = await prisma.match.create({
                data: {
                    tournamentId: tournament.id,
                    teamAId: approvedTeams[2].id,
                    teamBId: approvedTeams[3].id,
                    round: 1,
                    status: MatchStatus.FINISHED,
                    scoreA: semi2WinnerFirst ? semi2WinScore : semi2LoseScore,
                    scoreB: semi2WinnerFirst ? semi2LoseScore : semi2WinScore,
                    winnerId: semi2WinnerId,
                    date: addDays(startDate, 0),
                },
            });

            const isFinished = spec.status === TournamentStatus.FINISHED;
            const finalWinnerFirst = i % 2 === 1;
            const finalWinnerId = finalWinnerFirst ? semi1WinnerId : semi2WinnerId;

            await prisma.match.create({
                data: {
                    tournamentId: tournament.id,
                    teamAId: semi1WinnerId,
                    teamBId: semi2WinnerId,
                    round: 2,
                    status: isFinished ? MatchStatus.FINISHED : MatchStatus.ONGOING,
                    scoreA: isFinished
                        ? finalWinnerFirst
                            ? finalWinScore
                            : finalLoseScore
                        : 0,
                    scoreB: isFinished
                        ? finalWinnerFirst
                            ? finalLoseScore
                            : finalWinScore
                        : 0,
                    winnerId: isFinished ? finalWinnerId : null,
                    date: isFinished ? addDays(startDate, 1) : now,
                    previousMatches: {
                        connect: [{ id: semi1.id }, { id: semi2.id }],
                    },
                },
            });
        }

        createdTournaments++;
    }

    // Синхронізуємо статистику гравців (PlayerStats) з усіма завершеними матчами
    await syncPlayerStatsFromMatches(prisma);

    if (createdTournaments > 0) {
        console.log(
            `✅ Створено ${createdTournaments} турнірів із реєстраціями, матчами та оновленою статистикою гравців.`,
        );
    } else {
        console.log("ℹ️ Усі 20 турнірів уже існують у базі даних.");
    }
}

async function syncPlayerStatsFromMatches(prisma: PrismaClient): Promise<void> {
    const [players, teams, finishedMatches] = await Promise.all([
        prisma.user.findMany({ where: { role: Role.PLAYER }, select: { id: true } }),
        prisma.team.findMany({ include: { members: true } }),
        prisma.match.findMany({
            where: {
                status: MatchStatus.FINISHED,
                teamAId: { not: null },
                teamBId: { not: null },
                winnerId: { not: null },
            },
        }),
    ]);

    const membersByTeamId = new Map(
        teams.map(t => [t.id, t.members.map(m => m.userId)]),
    );

    const statsMap = new Map<string, { gamesPlayed: number; wins: number; losses: number }>();
    for (const player of players) {
        statsMap.set(player.id, { gamesPlayed: 0, wins: 0, losses: 0 });
    }

    for (const match of finishedMatches) {
        if (!match.teamAId || !match.teamBId || !match.winnerId) continue;

        const loserTeamId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
        const winnerMembers = membersByTeamId.get(match.winnerId) ?? [];
        const loserMembers = membersByTeamId.get(loserTeamId) ?? [];

        for (const userId of winnerMembers) {
            const stat = statsMap.get(userId);
            if (stat) {
                stat.gamesPlayed += 1;
                stat.wins += 1;
            }
        }

        for (const userId of loserMembers) {
            const stat = statsMap.get(userId);
            if (stat) {
                stat.gamesPlayed += 1;
                stat.losses += 1;
            }
        }
    }

    for (const [userId, stat] of statsMap.entries()) {
        await prisma.playerStats.upsert({
            where: { userId },
            update: stat,
            create: { userId, ...stat },
        });
    }
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedTournaments(prisma)
        .catch(error => {
            console.error("❌ Помилка при заповненні турнірів:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
