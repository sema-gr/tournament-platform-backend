import { PrismaClient, Role, Team } from "@prisma/client";

const TEAMS_CONFIG = [
    {
        name: "Київські Соколи",
        ownerEmail: "player1@gmail.com",
        memberEmails: ["player1@gmail.com", "player6@gmail.com"],
        isPrivate: false,
    },
    {
        name: "Львівські Леви",
        ownerEmail: "player2@gmail.com",
        memberEmails: ["player2@gmail.com", "player7@gmail.com"],
        isPrivate: false,
    },
    {
        name: "Одеські Акули",
        ownerEmail: "player3@gmail.com",
        memberEmails: ["player3@gmail.com", "player8@gmail.com"],
        isPrivate: false,
    },
    {
        name: "Дніпровські Титани",
        ownerEmail: "player4@gmail.com",
        memberEmails: ["player4@gmail.com", "player9@gmail.com"],
        isPrivate: false,
    },
    {
        name: "Харківські Вовки",
        ownerEmail: "player5@gmail.com",
        memberEmails: ["player5@gmail.com", "player10@gmail.com"],
        isPrivate: true,
    },
];

export async function seedTeams(prisma: PrismaClient): Promise<Team[]> {
    console.log("🛡️ [3/4] Заповнення команд...");

    const players = await prisma.user.findMany({
        where: { role: Role.PLAYER },
    });

    const playersByEmail = new Map(players.map(player => [player.email, player]));

    if (players.length < 10) {
        throw new Error(
            "Недостатньо гравців у базі даних для створення 5 команд. Спочатку запустіть users.seed.ts.",
        );
    }

    const teams: Team[] = [];

    for (const config of TEAMS_CONFIG) {
        const owner = playersByEmail.get(config.ownerEmail);
        if (!owner) {
            throw new Error(`Не знайдено капітана з email ${config.ownerEmail}.`);
        }

        const members = config.memberEmails.map(email => {
            const member = playersByEmail.get(email);
            if (!member) {
                throw new Error(`Не знайдено гравця з email ${email} для команди "${config.name}".`);
            }
            return member;
        });

        const team = await prisma.team.upsert({
            where: { name: config.name },
            update: {
                ownerId: owner.id,
                isPrivate: config.isPrivate,
            },
            create: {
                name: config.name,
                ownerId: owner.id,
                isPrivate: config.isPrivate,
            },
        });

        for (const member of members) {
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

        teams.push(team);
    }

    console.log(
        `✅ Команди готові (${teams.length}): ${teams.map(t => t.name).join(", ")}.`,
    );

    return teams;
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedTeams(prisma)
        .catch(error => {
            console.error("❌ Помилка при заповненні команд:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
