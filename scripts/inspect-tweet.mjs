
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const item = await prisma.newsItem.findFirst({
        where: { tweets: { some: {} } },
        include: { tweets: true }
    });

    if (item && item.tweets.length > 0) {
        console.log("Tweet Inspection:");
        console.log("Headline:", item.headline);
        item.tweets.forEach((t, i) => {
            console.log(`[${i}] ID: ${t.id} (IsUUID: ${t.id.length > 20})`);
            console.log(`    URL: ${t.url}`);
            console.log(`    Text: ${t.text.substring(0, 50)}...`);
        });
    } else {
        console.log("No tweets found.");
    }
}

main().finally(() => prisma.$disconnect());
