import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("Початок заповнення бази даних...");

    const football = await prisma.category.upsert({
        where: { name: "Футбол" },
        update: {},
        create: {
            name: "Футбол",
            minPlayers: 11,
            maxPlayers: 26,
            slug: "football",
        },
    });

    const tennis = await prisma.category.upsert({
        where: { name: "Теніс (Парний)" },
        update: {},
        create: {
            name: "Теніс (Парний)",
            minPlayers: 2,
            maxPlayers: 2,
            slug: "tennis-doubles",
        },
    });

    const basketball = await prisma.category.upsert({
        where: { name: "Баскетбол" },
        update: {},
        create: {
            name: "Баскетбол",
            minPlayers: 5,
            maxPlayers: 12,
            slug: "basketball",
        },
    });

    const volleyball = await prisma.category.upsert({
        where: { name: "Волейбол" },
        update: {},
        create: {
            name: "Волейбол",
            minPlayers: 6,
            maxPlayers: 8,
            slug: "volleyball",
        },
    });

    console.log({ football, tennis, basketball, volleyball });
    console.log("База успішно наповнена категоріями!");

    const adminEmail = "admin@gmail.com";

    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (!existingAdmin) {
        console.log("Створення облікового запису адміністратора...");

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash("123123123zxc", saltRounds);

        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                username: "superuser",
                name: "Admin",
                password: hashedPassword,
                role: "ADMIN",
                isApprovedOrganizer: false,
            },
        });
        console.log(`Адміністратор успішно створений! Email: ${admin.email}`);
    } else {
        console.log("Адміністратор вже існує, пропускаємо створення.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
