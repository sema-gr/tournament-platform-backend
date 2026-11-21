import { PrismaClient, Category } from "@prisma/client";

const CATEGORIES_DATA = [
    { name: "Волейбол", slug: "volleyball", minPlayers: 6, maxPlayers: 8 },
    { name: "Футбол", slug: "football", minPlayers: 11, maxPlayers: 26 },
    { name: "Баскетбол", slug: "basketball", minPlayers: 5, maxPlayers: 12 },
    { name: "Теніс (Парний)", slug: "tennis-doubles", minPlayers: 2, maxPlayers: 2 },
];

export async function seedCategories(prisma: PrismaClient): Promise<Category[]> {
    console.log("📂 [1/4] Заповнення категорій...");

    const categories: Category[] = [];

    for (const item of CATEGORIES_DATA) {
        const category = await prisma.category.upsert({
            where: { slug: item.slug },
            update: {
                name: item.name,
                minPlayers: item.minPlayers,
                maxPlayers: item.maxPlayers,
            },
            create: item,
        });
        categories.push(category);
    }

    console.log(
        `✅ Категорії готові (${categories.length}): ${categories.map(c => c.name).join(", ")}.`,
    );

    return categories;
}

if (require.main === module) {
    const prisma = new PrismaClient();
    seedCategories(prisma)
        .catch(error => {
            console.error("❌ Помилка при заповненні категорій:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
