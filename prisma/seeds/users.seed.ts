import { PrismaClient, Role, ApplicationStatus, User } from "@prisma/client";
import * as bcrypt from "bcrypt";

const ORGANIZERS_DATA = [
    {
        email: "org1@gmail.com",
        username: "organizer_1",
        name: "Олександр Коваленко",
        organizationName: "Київська Спортивна Ліга",
    },
    {
        email: "org2@gmail.com",
        username: "organizer_2",
        name: "Марія Шевченко",
        organizationName: "Українська Асоціація Турнірів",
    },
    {
        email: "org3@gmail.com",
        username: "organizer_3",
        name: "Дмитро Бондаренко",
        organizationName: "ProArena Events",
    },
];

const PLAYERS_DATA = [
    { email: "player1@gmail.com", username: "player_1", name: "Артем Мельник" },
    { email: "player2@gmail.com", username: "player_2", name: "Іван Ткаченко" },
    { email: "player3@gmail.com", username: "player_3", name: "Максим Кравченко" },
    { email: "player4@gmail.com", username: "player_4", name: "Богдан Олійник" },
    { email: "player5@gmail.com", username: "player_5", name: "Владислав Сидоренко" },
    { email: "player6@gmail.com", username: "player_6", name: "Назар Поліщук" },
    { email: "player7@gmail.com", username: "player_7", name: "Денис Савченко" },
    { email: "player8@gmail.com", username: "player_8", name: "Тарас Мороз" },
    { email: "player9@gmail.com", username: "player_9", name: "Андрій Лисенко" },
    { email: "player10@gmail.com", username: "player_10", name: "Сергій Павленко" },
    { email: "player11@gmail.com", username: "player_11", name: "Олена Гончаренко" },
    { email: "player12@gmail.com", username: "player_12", name: "Софія Романенко" },
];

export interface SeededUsers {
    admin: User;
    organizers: User[];
    players: User[];
}

export async function seedUsers(prisma: PrismaClient): Promise<SeededUsers> {
    console.log("👥 [2/4] Заповнення користувачів...");

    const saltRounds = 10;
    const adminPassword = await bcrypt.hash("123123123zxc", saltRounds);
    const defaultPassword = await bcrypt.hash("password123", saltRounds);

    const admin = await prisma.user.upsert({
        where: { email: "admin@gmail.com" },
        update: {
            isEmailVerified: true,
        },
        create: {
            email: "admin@gmail.com",
            username: "superuser",
            name: "Admin",
            password: adminPassword,
            role: Role.ADMIN,
            isApprovedOrganizer: false,
            isEmailVerified: true,
        },
    });

    const organizers: User[] = [];
    for (const orgData of ORGANIZERS_DATA) {
        const organizer = await prisma.user.upsert({
            where: { email: orgData.email },
            update: {
                name: orgData.name,
                organizationName: orgData.organizationName,
                isApprovedOrganizer: true,
                organizerStatus: ApplicationStatus.APPROVED,
                isEmailVerified: true,
            },
            create: {
                email: orgData.email,
                username: orgData.username,
                name: orgData.name,
                organizationName: orgData.organizationName,
                password: defaultPassword,
                role: Role.ORGANIZER,
                isApprovedOrganizer: true,
                organizerStatus: ApplicationStatus.APPROVED,
                isEmailVerified: true,
            },
        });
        organizers.push(organizer);
    }

    const players: User[] = [];
    for (const playerData of PLAYERS_DATA) {
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

        players.push(player);
    }

    console.log(
        `✅ Користувачі готові: 1 адмін (${admin.email}), ${organizers.length} організатори, ${players.length} учасників.`,
    );

    return { admin, organizers, players };
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedUsers(prisma)
        .catch(error => {
            console.error("❌ Помилка при заповненні користувачів:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
