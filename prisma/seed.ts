import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seeds/categories.seed";
import { seedUsers } from "./seeds/users.seed";
import { seedTeams } from "./seeds/teams.seed";
import { seedTournaments } from "./seeds/tournaments.seed";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Початок комплексного заповнення бази даних...\n");

    await seedCategories(prisma);
    await seedUsers(prisma);
    await seedTeams(prisma);
    await seedTournaments(prisma);

    console.log("\n🎉 Seeding успішно завершено!");
    console.log("-----------------------------------------");
    console.log("🔑 Тестові акаунти:");
    console.log("Адмін:         admin@gmail.com  (пароль: 123123123zxc)");
    console.log("Організатори:  org1@gmail.com .. org3@gmail.com  (пароль: password123)");
    console.log("Учасники:      player1@gmail.com .. player12@gmail.com  (пароль: password123)");
    console.log("-----------------------------------------");
}

main()
    .catch(error => {
        console.error("❌ Помилка при заповненні бази даних:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
