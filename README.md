# Tribe Finder

![Tribe Finder UI](image.png)

A free Chrome extension that helps you discover where your X (formerly Twitter) friends are located around the world. Inspired by [Smallworld](https://github.com/devonzuegel/smallworld).

## How It Works

1. **User Input**: Enter any public X username (including your own)
2. **Data Collection**: The extension injects a content script (`inject.js`) that makes authenticated requests to X's internal GraphQL API using your logged-in session:
   - `UserByScreenName` — resolves a handle to a user ID
   - `Following` — fetches the user's following list (paginated, 100 per page)
   - `CombinedLists` — fetches the user's X Lists
   - `ListMembers` — fetches members from each list (paginated, 100 per page)
3. **Data Processing**:
   - Extracts location strings from user profiles
   - Geocodes locations using Mapbox's Geocoding API
   - Aggregates data by country and city
4. **Storage**: All data is stored locally in Chrome's `chrome.storage.local`
5. **Display**: A Next.js-based UI renders the data as an interactive list with statistics

### Authentication

The extension uses your existing X session — no API keys or paid access needed. It reads the `ct0` CSRF cookie from `document.cookie` and makes requests with `credentials: "include"` so your session cookies handle auth. The only hardcoded token is X's public app-level bearer token (same one embedded in x.com's own frontend JS).

### Features

- **City Discovery**: Find cities where your X community is concentrated
- **Travel Planning**: Identify friends to meet when traveling
- **Sunshine Data**: See climate information for each city
- **X Lists Support**: Include list members in your analysis
- **Privacy-First**: No login required beyond your existing X session, all data stored locally
- **Flexible**: Analyze any public X profile, not just your own
- **Fast**: All fetches run in parallel with automatic rate-limit backoff

### Updating GraphQL Query IDs

X periodically rotates their GraphQL query IDs. If the extension stops working, open the browser Network tab on x.com, filter for `graphql`, and update the `queryIds` in `public/inject.js`.

## Tech Stack

- **Frontend**: Next.js 14 (static export), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI components
- **Chrome Extension**: Manifest V3, content scripts, chrome.storage API
- **APIs**: X GraphQL API (internal), Mapbox Geocoding API

## Architecture

```
┌─────────────────┐
│  Chrome Popup   │  (Next.js static export)
│   (index.tsx)   │
└────────┬────────┘
         │
         ├─ chrome.storage.local (data persistence)
         │
         ├─ inject.js (injected into x.com / pro.x.com)
         │     │
         │     ├─ Fetches following list (GraphQL)
         │     ├─ Fetches user lists (GraphQL)
         │     ├─ Fetches list members (GraphQL, parallel)
         │     └─ All running concurrently
         │
         └─ Mapbox Geocoding API
```

## Local Development

1. Clone the repository
2. Run `bun install`
3. Run `bun run dev` to start the development server
4. Go to `chrome://extensions/` in your browser
5. Enable developer mode
6. Click on `Load unpacked` and select the `out` folder

You must be logged into X in the same browser for the extension to work.

## Read More

For more context on why this project was built, see the [original blog post](https://www.mohamed3on.com/tribe-finder/).

## License

MIT
