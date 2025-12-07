
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = "http://localhost:3000/api/grok/breaking-news?query=Global%20News";

async function main() {
    console.log("Starting DB Seed Process...");

    // 1. Clear existing "Global News" queries to ensure a fresh start
    try {
        const existing = await prisma.searchQuery.findMany({ where: { normalizedKey: "Global News" } });
        if (existing.length > 0) {
            console.log(`Found ${existing.length} existing 'Global News' queries. Clearing them (and related items)...`);
            // We need to delete the queries, which cascades to items if configured, or we can just delete items
            await prisma.searchQuery.deleteMany({ where: { normalizedKey: "Global News" } });
            // Ideally also delete orphaned NewsItems to be safe
            // await prisma.newsItem.deleteMany({}); // Optional: clear all for fresh start
            console.log("Cache cleared.");
        }
    } catch (e) {
        console.error("Cache clear failed:", e);
    }

    // 2. Loop until we have enough items linked to the Main Query
    let connectedCount = 0;
    let attempts = 0;
    const TARGET_COUNT = 15;
    const MAX_ATTEMPTS = 15;

    console.log(`Target: ${TARGET_COUNT} connected items.`);

    while (connectedCount < TARGET_COUNT && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`\n--- Attempt ${attempts}/${MAX_ATTEMPTS} (Current Linked: ${connectedCount}) ---`);

        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: { "x-api-key": process.env.XAI_API_KEY || "" }
            });

            if (!response.ok) {
                console.error(`Fetch failed: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.error("Response:", text);
                break;
            }

            // We must consume the stream for the API to process and save items
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // We don't strictly need to parse the chunks here, just consume them.
                // But logging helps verify activity.
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('data: {"type":"news"')) {
                        const json = JSON.parse(line.replace('data: ', ''));
                        console.log(`Received: ${json.news.headline.substring(0, 50)}...`);
                    } else if (line.includes('"type":"status"')) {
                        // console.log("Status update...");
                    }
                }
            }
            console.log("Stream finished.");

        } catch (error) {
            console.error("Error during fetch:", error);
            // Don't break immediately, maybe retry?
        }

        // 3. Check Database State
        try {
            const query = await prisma.searchQuery.findFirst({
                where: { normalizedKey: "Global News" },
                include: { items: true }
            });

            if (query) {
                connectedCount = query.items.length;
                console.log(`>> Database now has ${connectedCount} items linked to query.`);
            } else {
                console.log(">> No 'Global News' query found yet.");
                connectedCount = 0;
            }
        } catch (e) {
            console.error("DB Check failed:", e);
        }

        if (connectedCount < TARGET_COUNT) {
            console.log("Target not met. Waiting 2s before next fetch...");
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`\nSeeding Finished. Final Linked Items: ${connectedCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
