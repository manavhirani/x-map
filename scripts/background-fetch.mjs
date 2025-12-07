
// Native fetch used (Node 18+)

const API_URL = "http://localhost:3000/api/grok/breaking-news";

async function fetchNews() {
    console.log(`[${new Date().toISOString()}] Triggering background fetch...`);
    try {
        const res = await fetch(API_URL);
        if (!res.ok) {
            console.error(`Fetch failed: ${res.status} ${res.statusText}`);
            return;
        }

        // For simplicity with native fetch in Node 18+:
        for await (const chunk of res.body) {
            // Consume stream to ensure full execution
        }
        console.log("Fetch complete.");
    } catch (error) {
        console.error("Error fetching news:", error);
    }
}

// Run immediately then every 5 mins
fetchNews();
setInterval(fetchNews, 5 * 60 * 1000);
