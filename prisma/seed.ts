import {
    PrismaClient,
    Role,
    ApplicationStatus,
    TournamentStatus,
    TournamentFormat,
    MatchStatus,
    User,
    Team,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Початок заповнення бази даних...");

    // ==========================================
    // 1. КАТЕГОРІЇ
    // ==========================================
    const football = await prisma.category.upsert({
        where: { name: "Футбол" },
        update: {},
        create: { name: "Футбол", minPlayers: 11, maxPlayers: 26, slug: "football" },
    });

    const tennis = await prisma.category.upsert({
        where: { name: "Теніс (Парний)" },
        update: {},
        create: { name: "Теніс (Парний)", minPlayers: 2, maxPlayers: 2, slug: "tennis-doubles" },
    });

    const basketball = await prisma.category.upsert({
        where: { name: "Баскетбол" },
        update: {},
        create: { name: "Баскетбол", minPlayers: 5, maxPlayers: 12, slug: "basketball" },
    });

    const volleyball = await prisma.category.upsert({
        where: { name: "Волейбол" },
        update: {},
        create: { name: "Волейбол", minPlayers: 6, maxPlayers: 8, slug: "volleyball" },
    });

    console.log("✅ База успішно наповнена категоріями!");
    const categories = [football, tennis, basketball, volleyball];

    // ==========================================
    // 2. АДМІН ТА КОРИСТУВАЧІ
    // ==========================================
    const saltRounds = 10;
    const defaultPassword = await bcrypt.hash("password123", saltRounds);
    const adminPassword = await bcrypt.hash("123123123zxc", saltRounds);

    const adminEmail = "admin@gmail.com";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
        console.log("Створення облікового запису адміністратора...");
        await prisma.user.create({
            data: {
                email: adminEmail,
                username: "superuser",
                name: "Admin",
                password: adminPassword,
                role: Role.ADMIN,
                isApprovedOrganizer: false,
            },
        });
        console.log(`✅ Адміністратор успішно створений! Email: ${adminEmail}`);
    }

    // Створюємо Організаторів
    const organizers: User[] = [];
    for (let i = 1; i <= 2; i++) {
        const org = await prisma.user.upsert({
            where: { email: `org${i}@gmail.com` },
            update: {},
            create: {
                email: `org${i}@gmail.com`,
                username: `organizer_${i}`,
                name: `Організатор ${i}`,
                password: defaultPassword,
                role: Role.ORGANIZER,
                isApprovedOrganizer: true,
                organizerStatus: ApplicationStatus.APPROVED,
            },
        });
        organizers.push(org);
    }

    // Створюємо Гравців
    const players: User[] = [];
    for (let i = 1; i <= 20; i++) {
        const player = await prisma.user.upsert({
            where: { email: `player${i}@gmail.com` },
            update: {},
            create: {
                email: `player${i}@gmail.com`,
                username: `player_${i}`,
                name: `Гравець ${i}`,
                password: defaultPassword,
                role: Role.PLAYER,
                stats: {
                    create: {
                        gamesPlayed: Math.floor(Math.random() * 30),
                        wins: Math.floor(Math.random() * 15),
                    },
                },
            },
        });
        players.push(player);
    }
    console.log(`✅ Створено ${organizers.length} організаторів та ${players.length} гравців.`);

    // ==========================================
    // 3. КОМАНДИ
    // ==========================================
    const teams: Team[] = [];
    for (let i = 0; i < 10; i++) {
        const teamName = `Team ${String.fromCharCode(65 + i)} Esports`; // Team A, Team B...
        const owner = players[i];

        const team = await prisma.team.upsert({
            where: { name: teamName },
            update: {},
            create: {
                name: teamName,
                ownerId: owner.id,
                isPrivate: false,
                members: {
                    create: [
                        { userId: owner.id },
                        { userId: players[(i + 10) % 20].id }, // Додаємо ще одного гравця для масовки
                    ],
                },
            },
        });
        teams.push(team);
    }
    console.log(`✅ Створено 10 команд.`);

    // ==========================================
    // 4. ТУРНІРИ ТА МАТЧІ
    // ==========================================
    let createdTournaments = 0;

    for (let i = 1; i <= 15; i++) {
        const title = `Турнір Диплому #${i}`;
        const existingTournament = await prisma.tournament.findFirst({ where: { title } });

        if (!existingTournament) {
            // Розподіл статусів
            let status: TournamentStatus = TournamentStatus.PLANNED; // <- Додаємо : TournamentStatus

            if (i > 4 && i <= 8) status = TournamentStatus.REGISTRATION;
            if (i > 8 && i <= 12) status = TournamentStatus.ACTIVE;
            if (i > 12) status = TournamentStatus.FINISHED;

            const category = categories[i % categories.length];
            const organizer = organizers[i % organizers.length];

            // Створюємо турнір
            const tournament = await prisma.tournament.create({
                data: {
                    title,
                    description: `Тестовий турнір для перевірки пагінації та фільтрів. Категорія: ${category.name}.`,
                    format: TournamentFormat.SINGLE_ELIMINATION,
                    status: status,
                    maxTeams: 8,
                    startDate: new Date(new Date().setDate(new Date().getDate() + (i - 10))), // Мікс минулого та майбутнього
                    categoryId: category.id,
                    organizerId: organizer.id,
                },
            });

            // Беремо 4 команди для участі
            const tournamentTeams = teams.slice(i % 5, (i % 5) + 4);

            // Реєстрації
            for (const team of tournamentTeams) {
                await prisma.registration.create({
                    data: {
                        tournamentId: tournament.id,
                        teamId: team.id,
                        status: ApplicationStatus.APPROVED,
                    },
                });
            }

            // Генеруємо матчі тільки для ACTIVE та FINISHED
            if (status === TournamentStatus.ACTIVE || status === TournamentStatus.FINISHED) {
                const matchStatus =
                    status === TournamentStatus.FINISHED
                        ? MatchStatus.FINISHED
                        : MatchStatus.ONGOING;

                // Півфінал 1
                const semi1 = await prisma.match.create({
                    data: {
                        tournamentId: tournament.id,
                        teamAId: tournamentTeams[0].id,
                        teamBId: tournamentTeams[1].id,
                        round: 1,
                        status: MatchStatus.FINISHED,
                        scoreA: 3,
                        scoreB: 1,
                        winnerId: tournamentTeams[0].id,
                        date: new Date(new Date().setDate(new Date().getDate() - 2)),
                    },
                });

                // Півфінал 2
                const semi2 = await prisma.match.create({
                    data: {
                        tournamentId: tournament.id,
                        teamAId: tournamentTeams[2].id,
                        teamBId: tournamentTeams[3].id,
                        round: 1,
                        status: MatchStatus.FINISHED,
                        scoreA: 0,
                        scoreB: 2,
                        winnerId: tournamentTeams[3].id,
                        date: new Date(new Date().setDate(new Date().getDate() - 2)),
                    },
                });

                // Фінал
                await prisma.match.create({
                    data: {
                        tournamentId: tournament.id,
                        teamAId: semi1.winnerId,
                        teamBId: semi2.winnerId,
                        round: 2,
                        status: matchStatus,
                        scoreA: matchStatus === MatchStatus.FINISHED ? 2 : 0,
                        scoreB: matchStatus === MatchStatus.FINISHED ? 1 : 0,
                        winnerId: matchStatus === MatchStatus.FINISHED ? semi1.winnerId : null,
                        date: new Date(), // Грається сьогодні
                        previousMatches: {
                            connect: [{ id: semi1.id }, { id: semi2.id }],
                        },
                    },
                });
            }
            createdTournaments++;
        }
    }

    if (createdTournaments > 0) {
        console.log(
            `✅ Додано ${createdTournaments} нових турнірів (разом із матчами та реєстраціями).`,
        );
    } else {
        console.log(`ℹ️ Усі 15 турнірів уже існують, пропускаємо створення.`);
    }

    console.log("🎉 Seeding успішно завершено!");
    console.log("-----------------------------------------");
    console.log("🔑 Тестові акаунти (Пароль для всіх: password123)");
    console.log("Організатор: org1@gmail.com");
    console.log("Гравець (Капітан): player1@gmail.com");
    console.log("-----------------------------------------");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
