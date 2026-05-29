# AGENTS.md for Chunkplayer

## Project Overview

Vanilla JavaScript application - a gamified movie chunk player with D20 dice rolling mechanics.

- **No build process, no npm, no package managers**
- A daily movie chunk viewer with D20 dice rolling mechanics
- Entry point: `index.html` (open directly in browser)

## Development Commands

```bash
# Run the application
open index.html  # macOS
start index.html # Windows

# No build, test, or lint commands - vanilla JS
```

## Architecture Overview

### Modular Structure

The application follows a clean, layered architecture:

- **`app.js`** - Main application controller and orchestrator (ChunkPlayerApp)
- **`config.js`** - Configuration classes (Config, DebugConfig)
- **`errorHandler.js`** - Global error handling utilities

### Utils (`utils/`)

- **`dateHelpers.js`** - Date formatting and helper functions
- **`diceRollLogic.js`** - Dice roll mechanics and outcome determination

### Repositories (`repositories/`)

- **`visitRepository.js`** - LocalStorage persistence for visit tracking

### Services (`services/`)

- **`apiService.js`** - Cloudflare Workers API communication
- **`audioService.js`** - Sound effects and audio playback
- **`dateService.js`** - Date logic and special day detection
- **`domService.js`** - DOM manipulation and UI state management
- **`effectService.js`** - Visual effects (poster animations, snow/particles)
- **`soundBoardService.js`** - Interactive soundboard with tabbed sets
- **`videoService.js`** - Video playback and chunk selection

### Use Cases (`useCases/`)

- **`dailyFlowUseCase.js`** - Daily flow orchestration (Sunday check, lockdown, poster selection)
- **`diceRollUseCase.js`** - D20 dice rolling flow
- **`lockdownUseCase.js`** - Pre-7 AM lockdown timer management
- **`videoPlaybackUseCase.js`** - Video sequence handling (normal, morb, critical success)

### Configuration

- **`CONFIG` object** - Global settings (API URL, debug flags, movie data)
- **`urls.json`** - Dice roll videos and sound collections
- **API endpoint** (`chunkplayerneo.quickreactor.workers.dev`) provides daily data

### Data Flow

```
API (daily data) → CONFIG.movieData → DateService → ChunkPlayerApp → UseCases → Services → DOM
```

## Key Application Flows

### Daily Flow

1. Check if Sunday → Show rest day screen
2. Check if before 7 AM → Show lockdown countdown
3. Check first visit today → Show poster selection with ROLL button
4. User clicks ROLL → Play D20 video → Determine outcome
5. **Roll 1**: Morb (punishment movie)
6. **Roll 20**: Critical success (Dark Realm sequence with pre-roll + normal chunk + post-roll)
7. **Roll 2-19**: Normal movie chunk

### Critical Success Sequence (`playCriticalSuccessSequence`)

- **Phase 1**: Play Dark Realm intro (`rewardMovie.preRoll[pointer]`)
- **Phase 2**: Play normal daily chunk (auto-transitions)
- **Phase 3**: Play Dark Realm outro (`rewardMovie.postRoll[pointer]`)

### Lockdown System

- Content locked until 7 AM daily
- Sunday = no chunk (rest day)
- Countdown timer updates every second

## Debug Mode

Set in `config.js`:

```javascript
// In Config class constructor or via Debug utilities:
Debug.setTestDate("19/01", 9); // Test specific date (day/month, hour)
Debug.forceRoll(20); // Force specific dice outcome (1-20)
Debug.clearLastVisit(); // Reset first visit state
```

### Console Utilities

Available via `window.Debug` or globally:

```javascript
Debug.clearLastVisit()
Debug.setTestDate(dateString)
Debug.forceRoll(number)
Debug.fakeTomorrow()
Debug.showConfig()
Debug.showStorageData()
```

## Critical Files to Modify

| File | Purpose |
|------|---------|
| `app.js` | Main application orchestrator |
| `config.js` | Configuration and debug settings |
| `index.html` | DOM structure and element IDs |
| `style.css` | Styling and CSS variables for theming |
| `urls.json` | Dice roll video URLs and sound collections |
| `services/` | Service layer for specific concerns |
| `useCases/` | Business logic and application flows |

## Important Patterns

### Movie Data Structure (from API)

```javascript
{
  roll: 1-20,           // Daily dice roll
  morbed: boolean,      // Whether punishment is active
  normalMovie: { chunks, titles, posterUrl, bgColor, faviconUrl, name, pointer },
  punishmentMovie: { ... },  // "MORBIUS" or similar
  rewardMovie: { preRoll, postRoll, ... }  // Dark Realm content
}
```

### Easter Eggs

- Type "morbius" → Triggers punishment movie
- Tap body 10x in 3 seconds → Triggers punishment movie
- Robert's birthday (Nov 28) → Snow effect + special sounds
- December 18 → Auto-crit (roll 20)

### Date-based Randomness

- Sound selection uses `DiceRollLogic.getDateBasedRandomIndex()` for consistency across users
- Same date = same random sounds for everyone

## Testing Changes

1. Open `index.html` in browser (or reload)
2. Use browser DevTools Console for `Debug.*` commands
3. Check Network tab for API calls to `/get-daily-data`
4. Use Application > Local Storage to check visit state

## External Dependencies

- **Plyr.js** (v3.7.8) - Video player (CDN: `cdn.plyr.io`)
- **Particles.js** (v2.0.0) - Snow effect (CDN: `cdn.jsdelivr.net`)
- **Cloudflare Workers API** - Daily data provider

---

## Cloudflare Worker Development

The backend uses Cloudflare Workers with KV storage. Worker code lives in the `worker/` directory.

### Worker Structure

```
worker/
├── worker.js          # Main Worker code (scheduled tasks + API endpoints)
├── wrangler.toml     # Wrangler configuration (KV bindings, env vars)
├── package.json      # NPM scripts (dev, deploy)
├── .dev.vars         # Local environment variables (gitignored)
└── README.md         # Worker documentation
```

### Local Worker Development

#### Prerequisites

1. **Node.js** (LTS) and **Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Authenticate** with Cloudflare:
   ```bash
   wrangler login
   ```

3. **Configure KV namespace** in `worker/wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "MOVIE_STORAGE"
   id = "your-kv-namespace-id"
   ```

#### Running Worker Locally

```bash
cd worker
npm run dev
```

Worker runs at `http://localhost:8787` with KV emulation.

#### Deploying to Production

```bash
cd worker
npm run deploy
```

Deploys directly to Cloudflare - no git push required.

### Frontend Auto-Detection

The frontend automatically detects local vs production:

```javascript
// config.js
static get API_BASE_URL() {
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
    return isLocal
        ? "http://localhost:8787"  // Local Worker
        : "https://chunkplayerneo.quickreactor.workers.dev";  // Production
}
```

Open `index.html` directly or via HTTP server - it will use the correct API URL.

### Worker API Endpoints

See `worker/README.md` for complete API documentation:

- `GET /get-daily-data` - Daily movie data (roll, chunks, pointers)
- `POST /report-punishment` - Increment punishment pointer
- `POST /self-morb` - Admin trigger
- `GET /set-*-pointer?value=X` - Pointer management
- `GET /state` - Full application state
- `GET /test-roll` - Manual dice roll trigger

### KV Storage Schema

**Key: `app_state`** - Complete application state:
```json
{
  "normalMoviesArray": [{ name, pointer, chunks, titles, ... }],
  "punishmentMoviesArray": [{ name, pointer, chunks, ... }],
  "rewardMoviesArray": [{ name, pointer, preRoll, postRoll, ... }]
}
```

**Key: `daily_data`** - Cached daily digest:
```json
{
  "roll": 15,
  "morbed": false,
  "criticalRoll": false,
  "result": "fanatic",
  "normalMovie": { ... },
  "punishmentMovie": { ... },
  "rewardMovie": { ... }
}
```

### Monorepo Git Workflow

Use commit prefixes for clarity:

- `[worker]` - Worker-only changes (deploy via `wrangler deploy`)
- `[frontend]` - Frontend-only changes (deploy via git push to GitHub Pages)
- `[both]` - API contract changes (update both frontend and Worker)

Example:
```bash
# Worker change - no git push needed
cd worker && wrangler deploy

# Frontend change - push to GitHub
git add services/ && git commit -m "[frontend] update poster animation" && git push

# API change - update both
git add worker/worker.js services/apiService.js
git commit -m "[both] add new /self-morb endpoint"
```

### Worker Troubleshooting

- **KV errors**: Verify namespace ID in `wrangler.toml` matches Cloudflare dashboard
- **CORS errors**: All endpoints include CORS headers; check API URL in browser console
- **Local dev issues**: Ensure `.dev.vars` exists (copy from `.dev.vars.example`)
- **Deployment fails**: Run `wrangler login` again, check account permissions

### Windows-Specific Notes

- Use PowerShell or Git Bash for Wrangler commands
- Wrangler works natively on Windows
- Run as Administrator if you encounter permission issues

### Related Files

| File | Purpose |
|------|---------|
| `worker/worker.js` | Worker code (API endpoints + scheduled tasks) |
| `worker/wrangler.toml` | Wrangler config (KV bindings, environment) |
| `worker/package.json` | NPM scripts for dev/deploy |
| `services/apiService.js` | Frontend API client (calls Worker) |
| `config.js` | API URL detection (local vs production) |
