import {
    PrismaClient,
    Role,
    ApplicationStatus,
    TournamentStatus,
    TournamentFormat,
    MatchStatus,
    Team,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const EXTRA_PLAYERS_DATA = [
    { email: "player13@gmail.com", username: "player_13", name: "Роман Ковальчук" },
    { email: "player14@gmail.com", username: "player_14", name: "Олег Марченко" },
    { email: "player15@gmail.com", username: "player_15", name: "Дмитро Руденко" },
    { email: "player16@gmail.com", username: "player_16", name: "Євгеній Тимошенко" },
    { email: "player17@gmail.com", username: "player_17", name: "Віталій Кравчук" },
    { email: "player18@gmail.com", username: "player_18", name: "Микола Петренко" },
    { email: "player19@gmail.com", username: "player_19", name: "Ігор Захарченко" },
    { email: "player20@gmail.com", username: "player_20", name: "Станіслав Гаврилюк" },
    { email: "player21@gmail.com", username: "player_21", name: "Ярослав Семенов" },
    { email: "player22@gmail.com", username: "player_22", name: "Кирило Василенко" },
    { email: "player23@gmail.com", username: "player_23", name: "Вадим Гончар" },
    { email: "player24@gmail.com", username: "player_24", name: "Павло Кузьменко" },
    { email: "player25@gmail.com", username: "player_25", name: "Антон Данилюк" },
    { email: "player26@gmail.com", username: "player_26", name: "Олексій Федоренко" },
    { email: "player27@gmail.com", username: "player_27", name: "Руслан Яковенко" },
    { email: "player28@gmail.com", username: "player_28", name: "Юрій Литвин" },
    { email: "player29@gmail.com", username: "player_29", name: "Михайло Дяченко" },
    { email: "player30@gmail.com", username: "player_30", name: "Віктор Бондар" },
    { email: "player31@gmail.com", username: "player_31", name: "Степан Карпенко" },
    { email: "player32@gmail.com", username: "player_32", name: "Гліб Назаренко" },
    { email: "player33@gmail.com", username: "player_33", name: "Тимофій Соколов" },
    { email: "player34@gmail.com", username: "player_34", name: "Данило Черненко" },
];

const EXTRA_TEAMS_CONFIG = [
    {
        name: "Полтавські Орли",
        ownerEmail: "player13@gmail.com",
        memberEmails: ["player13@gmail.com", "player14@gmail.com"],
    },
    {
        name: "Запорізькі Козаки",
        ownerEmail: "player15@gmail.com",
        memberEmails: ["player15@gmail.com", "player16@gmail.com"],
    },
    {
        name: "Вінницькі Ведмеді",
        ownerEmail: "player17@gmail.com",
        memberEmails: ["player17@gmail.com", "player18@gmail.com"],
    },
    {
        name: "Карпатські Рисі",
        ownerEmail: "player19@gmail.com",
        memberEmails: ["player19@gmail.com", "player20@gmail.com"],
    },
    {
        name: "Чернігівські Барси",
        ownerEmail: "player21@gmail.com",
        memberEmails: ["player21@gmail.com", "player22@gmail.com"],
    },
    {
        name: "Черкаські Яструби",
        ownerEmail: "player23@gmail.com",
        memberEmails: ["player23@gmail.com", "player24@gmail.com"],
    },
    {
        name: "Тернопільські Шторми",
        ownerEmail: "player25@gmail.com",
        memberEmails: ["player25@gmail.com", "player26@gmail.com"],
    },
    {
        name: "Сумські Пантери",
        ownerEmail: "player27@gmail.com",
        memberEmails: ["player27@gmail.com", "player28@gmail.com"],
    },
    {
        name: "Рівненські Фенікси",
        ownerEmail: "player29@gmail.com",
        memberEmails: ["player29@gmail.com", "player30@gmail.com"],
    },
    {
        name: "Житомирські Гриффони",
        ownerEmail: "player31@gmail.com",
        memberEmails: ["player31@gmail.com", "player32@gmail.com"],
    },
    {
        name: "Миколаївські Вікінги",
        ownerEmail: "player33@gmail.com",
        memberEmails: ["player33@gmail.com", "player34@gmail.com"],
    },
];

type SportSlug = "volleyball" | "football" | "basketball" | "tennis-doubles";

interface BracketMatchDraft {
    id: string;
    tournamentId: string;
    round: number;
    indexInRound: number;
    teamAId: string | null;
    teamBId: string | null;
    scoreA: number;
    scoreB: number;
    winnerId: string | null;
    nextMatchId: string | null;
    status: MatchStatus;
    date: Date;
}

function getSportScore(sport: SportSlug, seed: number): [number, number] {
    switch (sport) {
        case "football": {
            const scores: [number, number][] = [
                [3, 1],
                [2, 0],
                [2, 1],
                [4, 2],
                [1, 0],
            ];
            return scores[seed % scores.length];
        }
        case "volleyball": {
            const scores: [number, number][] = [
                [3, 1],
                [3, 0],
                [3, 2],
            ];
            return scores[seed % scores.length];
        }
        case "basketball": {
            const scores: [number, number][] = [
                [86, 74],
                [92, 88],
                [79, 68],
                [81, 77],
                [95, 83],
            ];
            return scores[seed % scores.length];
        }
        case "tennis-doubles": {
            const scores: [number, number][] = [
                [2, 0],
                [2, 1],
            ];
            return scores[seed % scores.length];
        }
    }
}

function addDays(base: Date, days: number): Date {
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Генерує повне дерево Single Elimination (nextMatchId від раунду r до r+1)
 * для степені двійки команд (8 -> 3 раунди / 7 матчів, 16 -> 4 раунди / 15 матчів).
 */
function buildBracketTree(options: {
    tournamentId: string;
    teams: Team[];
    sport: SportSlug;
    startDate: Date;
    shouldFinishMatch: (round: number, indexInRound: number) => boolean;
    shouldMarkOngoing?: (round: number, indexInRound: number) => boolean;
}): BracketMatchDraft[] {
    const { tournamentId, teams, sport, startDate, shouldFinishMatch, shouldMarkOngoing } = options;
    const totalRounds = Math.log2(teams.length);
    if (!Number.isInteger(totalRounds) || totalRounds < 2) {
        throw new Error(`Кількість команд має бути степенем двійки >= 4 (отримано ${teams.length}).`);
    }

    const rounds: BracketMatchDraft[][] = [];

    for (let r = 1; r <= totalRounds; r++) {
        const matchesInRound = teams.length / Math.pow(2, r);
        const roundMatches: BracketMatchDraft[] = [];

        for (let i = 0; i < matchesInRound; i++) {
            roundMatches.push({
                id: randomUUID(),
                tournamentId,
                round: r,
                indexInRound: i,
                teamAId: null,
                teamBId: null,
                scoreA: 0,
                scoreB: 0,
                winnerId: null,
                nextMatchId: null,
                status: MatchStatus.SCHEDULED,
                date: addDays(startDate, r - 1),
            });
        }
        rounds.push(roundMatches);
    }

    // Зв'язуємо кожен матч раунду r з відповідним матчем раунду r+1 через nextMatchId
    for (let r = 0; r < totalRounds - 1; r++) {
        for (let i = 0; i < rounds[r].length; i++) {
            rounds[r][i].nextMatchId = rounds[r + 1][Math.floor(i / 2)].id;
        }
    }

    // Розставляємо команди у 1-му раунді
    for (let i = 0; i < rounds[0].length; i++) {
        rounds[0][i].teamAId = teams[i * 2].id;
        rounds[0][i].teamBId = teams[i * 2 + 1].id;
    }

    // Проходимо по раундах і заповнюємо результати + просуваємо переможців
    for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
        const roundNum = rIdx + 1;
        const currentRound = rounds[rIdx];

        for (let i = 0; i < currentRound.length; i++) {
            const match = currentRound[i];

            if (match.teamAId && match.teamBId && shouldFinishMatch(roundNum, i)) {
                const [winScore, loseScore] = getSportScore(sport, roundNum * 7 + i);
                const teamAWins = (roundNum + i) % 2 === 0;

                match.scoreA = teamAWins ? winScore : loseScore;
                match.scoreB = teamAWins ? loseScore : winScore;
                match.winnerId = teamAWins ? match.teamAId : match.teamBId;
                match.status = MatchStatus.FINISHED;

                if (rIdx + 1 < totalRounds) {
                    const nextMatch = rounds[rIdx + 1][Math.floor(i / 2)];
                    if (i % 2 === 0) {
                        nextMatch.teamAId = match.winnerId;
                    } else {
                        nextMatch.teamBId = match.winnerId;
                    }
                }
            } else if (
                match.teamAId &&
                match.teamBId &&
                shouldMarkOngoing?.(roundNum, i)
            ) {
                match.status = MatchStatus.ONGOING;
                match.date = new Date();
            }
        }
    }

    // Повертаємо від фіналу до 1-го раунду, щоб nextMatchId завжди існував у БД перед вставкою
    return rounds.reverse().flat();
}

async function ensureSixteenTeams(prisma: PrismaClient): Promise<Team[]> {
    const defaultPassword = await bcrypt.hash("password123", 10);

    for (const playerData of EXTRA_PLAYERS_DATA) {
        const player = await prisma.user.upsert({
            where: { email: playerData.email },
            update: {
                name: playerData.name,
                isEmailVerified: true,
            },
            create: {
                email: playerData.email,
                username: playerData.username,
                name: playerData.name,
                password: defaultPassword,
                role: Role.PLAYER,
                isEmailVerified: true,
                stats: {
                    create: {
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                    },
                },
            },
        });

        await prisma.playerStats.upsert({
            where: { userId: player.id },
            update: {},
            create: {
                userId: player.id,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
            },
        });
    }

    const players = await prisma.user.findMany({
        where: { role: Role.PLAYER },
    });
    const playersByEmail = new Map(players.map(p => [p.email, p]));

    for (const config of EXTRA_TEAMS_CONFIG) {
        const owner = playersByEmail.get(config.ownerEmail);
        if (!owner) {
            throw new Error(`Не знайдено власника команди ${config.ownerEmail}`);
        }

        const team = await prisma.team.upsert({
            where: { name: config.name },
            update: { ownerId: owner.id },
            create: {
                name: config.name,
                ownerId: owner.id,
                isPrivate: false,
            },
        });

        for (const email of config.memberEmails) {
            const member = playersByEmail.get(email);
            if (!member) continue;
            await prisma.teamMember.upsert({
                where: {
                    userId_teamId: {
                        userId: member.id,
                        teamId: team.id,
                    },
                },
                update: {},
                create: {
                    userId: member.id,
                    teamId: team.id,
                },
            });
        }
    }

    // Обираємо 16 команд, де кожна має рівно 2 унікальних гравці без перетинів
    const allTeams = await prisma.team.findMany({
        include: { members: true },
        orderBy: { createdAt: "asc" },
    });

    const selectedTeams: Team[] = [];
    const usedPlayerIds = new Set<string>();

    for (const team of allTeams) {
        if (team.members.length !== 2) continue;
        const hasOverlap = team.members.some(m => usedPlayerIds.has(m.userId));
        if (hasOverlap) continue;

        team.members.forEach(m => usedPlayerIds.add(m.userId));
        selectedTeams.push(team);
        if (selectedTeams.length === 16) break;
    }

    if (selectedTeams.length < 16) {
        throw new Error(
            `Знайдено лише ${selectedTeams.length} незалежних команд по 2 гравці (потрібно 16). Спочатку запустіть базові сіди (npm run seed).`,
        );
    }

    return selectedTeams;
}

async function syncAllPlayerStats(prisma: PrismaClient): Promise<void> {
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

    const membersByTeamId = new Map(teams.map(t => [t.id, t.members.map(m => m.userId)]));
    const statsMap = new Map<string, { gamesPlayed: number; wins: number; losses: number }>();

    for (const player of players) {
        statsMap.set(player.id, { gamesPlayed: 0, wins: 0, losses: 0 });
    }

    for (const match of finishedMatches) {
        if (!match.teamAId || !match.teamBId || !match.winnerId) continue;

        const loserTeamId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
        for (const userId of membersByTeamId.get(match.winnerId) ?? []) {
            const stat = statsMap.get(userId);
            if (stat) {
                stat.gamesPlayed += 1;
                stat.wins += 1;
            }
        }
        for (const userId of membersByTeamId.get(loserTeamId) ?? []) {
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

export async function seedBracketShowcase(prisma: PrismaClient): Promise<void> {
    console.log("🏟️ Запуск сід-демонстрації багаторівневих турнірних сіток (3 і 4 раунди)...\n");

    const [categories, organizers] = await Promise.all([
        prisma.category.findMany(),
        prisma.user.findMany({
            where: { role: Role.ORGANIZER },
            orderBy: { email: "asc" },
        }),
    ]);

    const categoryBySlug = new Map(categories.map(c => [c.slug, c]));

    if (categories.length < 4) {
        throw new Error("Категорії відсутні. Спочатку запустіть npm run seed:categories.");
    }
    if (organizers.length < 3) {
        throw new Error("Недостатньо організаторів. Спочатку запустіть npm run seed:users.");
    }

    const teams16 = await ensureSixteenTeams(prisma);
    console.log(`✅ Підготовлено ${teams16.length} команд (по 2 унікальних гравці, без перетинів).`);

    const now = new Date();

    const showcaseSpecs = [
        {
            title: "Гран-прі України з футболу (Сітка 8 команд · 3 раунди)",
            description:
                "Активний турнір на 8 команд із 3-раундовою сіткою (1/4 → 1/2 → Фінал). Чвертьфінали та перший півфінал завершено, другий півфінал триває — можна внести рахунок для автоматичного виходу у фінал.",
            sport: "football" as SportSlug,
            organizer: organizers[0],
            status: TournamentStatus.ACTIVE,
            teams: teams16.slice(0, 8),
            startDate: addDays(now, -2),
            generateMatches: true,
            shouldFinishMatch: (round: number, idx: number) =>
                round === 1 || (round === 2 && idx === 0),
            shouldMarkOngoing: (round: number, idx: number) => round === 2 && idx === 1,
        },
        {
            title: "Всеукраїнський Кубок з баскетболу (Завершена сітка 8 команд · 3 раунди)",
            description:
                "Повністю завершений турнір на 8 команд (7 матчів: 4 чвертьфінали, 2 півфінали та фінал) із визначеним чемпіоном.",
            sport: "basketball" as SportSlug,
            organizer: organizers[1],
            status: TournamentStatus.FINISHED,
            teams: teams16.slice(4, 12),
            startDate: addDays(now, -14),
            generateMatches: true,
            shouldFinishMatch: () => true,
        },
        {
            title: "Суперліга Волейболу 2026 (Велика сітка 16 команд · 4 раунди)",
            description:
                "Масштабний турнір на 16 команд із 4-раундовою сіткою (1/8 → 1/4 → 1/2 → Фінал, 15 матчів). 1/8 фіналу та 2 чвертьфінали завершено, решта матчів готові до проведення.",
            sport: "volleyball" as SportSlug,
            organizer: organizers[0],
            status: TournamentStatus.ACTIVE,
            teams: teams16,
            startDate: addDays(now, -3),
            generateMatches: true,
            shouldFinishMatch: (round: number, idx: number) =>
                round === 1 || (round === 2 && idx < 2),
            shouldMarkOngoing: (round: number, idx: number) => round === 2 && idx === 2,
        },
        {
            title: "Grand Slam Парний Теніс (8 команд · Готовий до старту)",
            description:
                "8 схвалених команд готові до запуску. Зайдіть як організатор (org3@gmail.com) та натисніть «Розпочати турнір», щоб наживо згенерувати 3-раундову сітку на 7 матчів.",
            sport: "tennis-doubles" as SportSlug,
            organizer: organizers[2],
            status: TournamentStatus.REGISTRATION,
            teams: teams16.slice(8, 16),
            startDate: addDays(now, 2),
            generateMatches: false,
            shouldFinishMatch: () => false,
        },
    ];

    let createdCount = 0;

    for (const spec of showcaseSpecs) {
        const existing = await prisma.tournament.findFirst({
            where: { title: spec.title },
        });
        if (existing) {
            console.log(`ℹ️ Пропущено (вже існує): "${spec.title}"`);
            continue;
        }

        const category = categoryBySlug.get(spec.sport);
        if (!category) {
            throw new Error(`Не знайдено категорію "${spec.sport}".`);
        }

        const tournament = await prisma.tournament.create({
            data: {
                title: spec.title,
                description: spec.description,
                format: TournamentFormat.SINGLE_ELIMINATION,
                status: spec.status,
                maxTeams: spec.teams.length,
                startDate: spec.startDate,
                categoryId: category.id,
                organizerId: spec.organizer.id,
            },
        });

        for (const team of spec.teams) {
            await prisma.registration.create({
                data: {
                    tournamentId: tournament.id,
                    teamId: team.id,
                    status: ApplicationStatus.APPROVED,
                },
            });
        }

        let matchesCount = 0;
        if (spec.generateMatches) {
            const bracketMatches = buildBracketTree({
                tournamentId: tournament.id,
                teams: spec.teams,
                sport: spec.sport,
                startDate: spec.startDate,
                shouldFinishMatch: spec.shouldFinishMatch,
                shouldMarkOngoing: spec.shouldMarkOngoing,
            });

            for (const match of bracketMatches) {
                await prisma.match.create({
                    data: {
                        id: match.id,
                        tournamentId: match.tournamentId,
                        round: match.round,
                        teamAId: match.teamAId,
                        teamBId: match.teamBId,
                        scoreA: match.scoreA,
                        scoreB: match.scoreB,
                        winnerId: match.winnerId,
                        nextMatchId: match.nextMatchId,
                        status: match.status,
                        date: match.date,
                    },
                });
            }
            matchesCount = bracketMatches.length;
        }

        createdCount++;
        console.log(
            `✅ Створено: "${spec.title}" — ${spec.teams.length} команд, ${matchesCount} матчів (${spec.status}).`,
        );
    }

    await syncAllPlayerStats(prisma);
    console.log(
        `\n🎉 Готово! Додано ${createdCount} турнір(ів) із багаторівневими сітками та синхронізовано статистику гравців.`,
    );
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedBracketShowcase(prisma)
        .catch(error => {
            console.error("❌ Помилка при запуску сід-демонстрації сіток:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
