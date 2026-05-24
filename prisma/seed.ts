import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Початок заповнення бази даних...");

    const football = await prisma.category.upsert({
        where: { name: "Футбол" },
        update: {},
        create: {
            name: "Футбол",
            minPlayers: 7,
            maxPlayers: 11,
            slug: "football",
        },
    });

    const tennis = await prisma.category.upsert({
        where: { name: "Теніс (Одиночний)" },
        update: {},
        create: {
            name: "Теніс (Одиночний)",
            minPlayers: 1,
            maxPlayers: 1,
            slug: "tenis",
        },
    });

    const basketball = await prisma.category.upsert({
        where: { name: "Баскетбол 3х3" },
        update: {},
        create: {
            name: "Баскетбол",
            minPlayers: 3,
            maxPlayers: 5,
            slug: "basketball",
        },
    });

    const valleyball = await prisma.category.upsert({
        where: { name: "Волейбол" },
        update: {},
        create: {
            name: "Волейбол",
            minPlayers: 12,
            maxPlayers: 18,
            slug: "valleyball",
        },
    });

    console.log({ football, tennis, basketball, valleyball });
    console.log("База успішно наповнена категоріями!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
