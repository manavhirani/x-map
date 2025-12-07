
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Database State...");

    const queryCount = await prisma.searchQuery.count();
    const newsCount = await prisma.newsItem.count();

    console.log(`SearchQueries: ${queryCount}`);
    console.log(`NewsItems: ${newsCount}`);

    const globalQuery = await prisma.searchQuery.findFirst({
        where: { normalizedKey: "Global News" },
        include: { items: true }
    });

    if (globalQuery) {
        console.log(`Found "Global News" query:`);
        console.log(`- ID: ${globalQuery.id}`);
        console.log(`- Updated: ${globalQuery.timestamp.toISOString()}`);
        console.log(`- Items Connected: ${globalQuery.items.length}`);
        globalQuery.items.forEach(i => {
            console.log(`  > ${i.headline} (${i.timestamp.toISOString()})`);
        });
    } else {
        console.log(`❌ "Global News" query NOT found.`);
    }

    // Check recent items directly
    const recentItems = await prisma.newsItem.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
    });
    console.log("\nMost recent 5 raw items:");
    recentItems.forEach(i => {
        console.log(`- ${i.headline} [${i.timestamp.toISOString()}]`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
