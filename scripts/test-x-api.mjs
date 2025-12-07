
const bearerToken = process.env.XAI_API_KEY ? process.env.XAI_API_KEY : ""; // Wait, X_API needs X_BEARER_TOKEN
// I will read env file manually
import fs from 'fs';
import path from 'path';

const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const tokenMatch = envLocal.match(/X_BEARER_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1] : null;

async function fetchRealTweets(query) {
    if (!token) { console.log("No Token found"); return; }

    console.log(`Testing Query: "${query}"`);
    try {
        const params = new URLSearchParams({
            query: `${query} -is:retweet -is:reply lang:en`,
            max_results: "5",
            "tweet.fields": "created_at,author_id,public_metrics,text",
            "expansions": "author_id",
            "user.fields": "name,username,profile_image_url"
        });

        const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            console.log("Error Status:", res.status);
            console.log("Error Body:", await res.text());
            return;
        }

        const data = await res.json();
        console.log(`Found ${data.meta?.result_count || 0} tweets.`);
        if (data.data) {
            console.log("First Tweet:", data.data[0].text);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

fetchRealTweets("Earthquake Japan");
