
import fs from 'fs';
import path from 'path';

// Manual env load
try {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    for (const line of envContent.split('\n')) {
        if (line.startsWith('XAI_API_KEY=')) {
            process.env.XAI_API_KEY = line.split('=')[1].trim();
        }
    }
} catch (e) { }

const apiKey = process.env.XAI_API_KEY;

async function testGrok() {
    if (!apiKey) {
        console.error("No API KEY provided");
        return;
    }

    const systemPrompt = `You are an AI journalist assistant powered by X's Grok.
Role: Identify confirmed, high-impact news events from the LAST 7 DAYS.
Requirement: Output ~3 distinct stories.
`;

    console.log("Sending request...");
    try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Find 3 breaking news stories with location and tweets." }
                ],
                model: "grok-4-fast-non-reasoning",
                stream: true, // Testing stream mode
                temperature: 0.1,
                tools: [{
                    type: "function",
                    function: {
                        name: "report_news",
                        description: "Report a news event",
                        parameters: {
                            type: "object",
                            properties: {
                                headline: { type: "string" },
                                location: { type: "string" },
                                summary: { type: "string" }
                            },
                            required: ["headline", "location", "summary"]
                        }
                    }
                }],
                tool_choice: { type: "function", function: { name: "report_news" } }
            })
        });

        if (!response.ok) {
            console.error("API Error", response.status, await response.text());
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Manual loop
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            console.log("RAW CHUNK:", chunk);
        }

    } catch (e) {
        console.error("Test Error", e);
    }
}

testGrok();
