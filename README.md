# X-Map: Real-Time Breaking News Visualization

An interactive, open-source map application that visualizes breaking news stories from around the world using X (Twitter) API and Grok AI. Built with Next.js, React, and MapLibre GL.

## Features

- 🌍 **Interactive Globe/Map View**: Switch between 3D globe and 2D map projections
- 📰 **Real-Time Breaking News**: Fetch and display breaking news stories with geolocation
- 🐦 **Real X (Twitter) Tweets**: Display actual tweets from X API for each news story
- 🔍 **Smart Search**: Search for news by topic, location, or keyword
- 🎨 **Category Filtering**: Filter news by category (Politics, Science, Conflict, etc.)
- 🌓 **Dark/Light Mode**: Theme support with system preference detection
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16.0.7
- **UI Library**: React 19.2.0
- **Mapping**: MapLibre GL, react-map-gl
- **Database**: Prisma with SQLite
- **AI**: Grok AI (xAI)
- **APIs**: X (Twitter) API v2
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI

## Prerequisites

- Node.js 20+ (v20.14.0 or higher recommended)
- npm or yarn
- X (Twitter) API Bearer Token
- xAI API Key (for Grok)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd x-map
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy the example environment file and fill in your API keys:
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` with your actual API keys:
   ```env
   XAI_API_KEY=your_xai_api_key_here
   X_BEARER_TOKEN=your_x_bearer_token_here
   # OR
   BEARER_TOKEN=your_x_bearer_token_here
   ```
   
   **Where to get API keys:**
   - **X (Twitter) API**: https://developer.twitter.com/en/portal/dashboard
   - **xAI API**: https://console.x.ai/

4. **Set up the database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Launch the Map**: Click "Launch Map" on the landing page or navigate to `/map`

2. **Fetch Breaking News**: 
   - Click "Top News" in the navbar to fetch global breaking news
   - Or use the search bar to search for specific topics

3. **Explore News**:
   - Click on news items in the sidebar to zoom to their location
   - Hover over map markers to see news details
   - Use category filters to filter by news type

4. **View Tweets**: 
   - Click on news items to see associated X (Twitter) tweets
   - Tweets are fetched in real-time from X API

## API Routes

### `/api/grok/breaking-news`
- **Method**: GET
- **Query Parameters**: 
  - `query` (optional): Search query for news
- **Response**: Server-Sent Events (SSE) stream
- **Description**: Fetches breaking news using Grok AI and X API

### `/api/geocode`
- **Method**: GET
- **Query Parameters**: 
  - `location` (required): Location name to geocode
- **Response**: JSON with coordinates
- **Description**: Geocodes location names to coordinates

### `/api/x-api/geo`
- **Method**: GET
- **Query Parameters**: 
  - `query` (optional): Search query
- **Response**: JSON with geo-tagged tweets
- **Description**: Fetches geo-tagged tweets from X API

### `/api/x-api/search`
- **Method**: GET
- **Query Parameters**: 
  - `query` (optional): Search query
  - `maxResults` (optional): Maximum results to return
- **Response**: JSON with search results
- **Description**: Searches X (Twitter) for tweets

## Project Structure

```
x-map/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── grok/         # Grok AI endpoints
│   │   ├── geocode/      # Geocoding endpoint
│   │   └── x-api/        # X (Twitter) API endpoints
│   ├── map/              # Main map page
│   └── page.tsx          # Landing page
├── components/           # React components
│   ├── ui/              # UI components (shadcn/ui)
│   └── navbar.tsx       # Navigation bar
├── prisma/              # Database schema
│   └── schema.prisma   # Prisma schema
├── scripts/             # Utility scripts
│   ├── test-all-routes.mjs  # Route testing script
│   └── cleanup-dev.sh      # Dev server cleanup
└── lib/                 # Utility functions
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI API key for Grok AI | Yes |
| `X_BEARER_TOKEN` | X (Twitter) API Bearer Token | Yes |
| `BEARER_TOKEN` | Alternative name for X_BEARER_TOKEN | Optional |

## Testing

### Test All Routes

```bash
npm run test:routes
```

This will test all API routes with realistic payloads to ensure production readiness.

### Cleanup Dev Server

If you encounter lock file issues:

```bash
npm run cleanup
```

## Database

The application uses Prisma with SQLite for local development. The database stores:
- News items with geolocation
- Associated tweets
- Search query cache

To reset the database:
```bash
rm prisma/dev.db
npx prisma db push
```

## Troubleshooting

### Port Already in Use
If port 3000 is in use:
```bash
npm run cleanup
npm run dev
```

### Missing API Keys
Ensure your `.env.local` file contains:
- `XAI_API_KEY`
- `X_BEARER_TOKEN` or `BEARER_TOKEN`

### Database Issues
If you encounter database errors:
```bash
npx prisma generate
npx prisma db push
```

## Contributing

This is an open-source project. Contributions are welcome!

## License

Open Source - See LICENSE file for details

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Maps powered by [MapLibre GL](https://maplibre.org/)
- AI powered by [Grok](https://x.ai/)
- Data from [X (Twitter) API](https://developer.twitter.com/)
