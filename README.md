# The Round Table

> A candlelit hall for seminar dialogue — where drafts stay private, courage is cultivated, and every knight may speak with honor.

A **Vite + React + TypeScript + Tailwind CSS** frontend for structured academic discussion. Themed around a medieval round-table aesthetic, it supports round-robin turn-taking, AI-assisted drafting, and real-time facilitator monitoring — ideal for classroom seminars, book clubs, and small-group debates.

The root directory hosts a standalone **landing page** (`index.html`). The app itself lives in the `app/` directory.

---

## Features

| Module | Description |
|--------|-------------|
| Chamber Hall | Browse, search, and filter discussion chambers; join via invite code; filter by mode and security level |
| Thought Space | Private draft area with AI-powered polish & rewrite; one-click publish to the public discussion |
| AI Guardian | Keyword highlighting, AI knight auto-contributions, safety alerts with explanations |
| Structured Turns | Round-robin speaking order with configurable quotas (speech count / seconds); AI bots fill empty seats |
| Facilitator HUD | Participation dashboard, trend charts, heatmap, alert management; pause/resume, prompt cards, quick polls, Markdown export |
| Auth | Local nickname-based registration and login |

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **Routing**: react-router-dom v7
- **State**: zustand + localStorage with cross-tab event sync
- **Styling**: Tailwind CSS 3 + custom design system (parchment & gold theme)
- **Icons**: lucide-react
- **Testing**: Vitest + @testing-library/react + jsdom
- **AI Backend**: Vercel Edge Functions + DeepSeek API
- **Deployment**: Vercel

---

## Getting Started

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173`. Six seed chambers and nine demo posts are pre-loaded — no backend required.

---

## Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build (includes TypeScript check)
npm run preview     # Preview production build
npm run check       # TypeScript type check
npm run lint        # ESLint
npm test            # Run tests (vitest watch)
npm run test:run    # Run all tests once
```

---

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Landing | Auth gate → chamber hall |
| `/create` | Create Chamber | Configure title, topic, prompt, etc. |
| `/lobby` | Lobby | Create or join a chamber; recent rooms |
| `/room/:roomId` | Room | Core page: speaking, drafting, AI assistance |
| `/facilitator` | Facilitator Index | Select a chamber to monitor |
| `/facilitator/:roomId` | Facilitator HUD | Dashboard, alerts, controls, export |
| `/auth` | Auth | Register / login |
| `/profile` | Profile | View / edit profile |

---

## Discussion Modes

### Free Form
Participants speak at any time, no enforced order. Suited for informal discussion and brainstorming.

### Structured
Round-robin speaking order with per-person time limits. Ideal for formal seminars and classroom debates. Features:
- AI bots auto-fill seats to reach target participants
- Speech quotas (count and seconds)
- Countdown timer
- Facilitator can manually advance or reassign the speaker

---

## Security Levels

| Level | Tone | AI Behavior |
|-------|------|-------------|
| **Fortified** | High guard | Low temperature, safety-first language, minimal edits |
| **Guarded** | Balanced | Moderate temperature, facilitative phrasing |
| **Open** | Free | Higher temperature, encourages bold but respectful expression |

---

## AI Setup (Optional)

Enable DeepSeek-powered AI features:

```bash
# .env (local) or Vercel environment variables
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com   # optional
DEEPSEEK_MODEL=deepseek-chat                  # optional
```

The frontend toggles AI mode via the `VITE_AI_BASE_URL` env var:
- **Unset** → local stub (deterministic simulated responses, works offline)
- **Set** → HTTP calls to the API routes

---

## Deploy to Vercel

1. Push the repo to GitHub
2. Open [Vercel](https://vercel.com) → Add New → Project → select the repo
3. Set **Root Directory** to `app`
4. Framework Preset: **Vite** (usually auto-detected)
5. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add `DEEPSEEK_API_KEY` env var if using AI features
7. Deploy

A `vercel.json` with SPA rewrite rules is included — no 404s on refresh.

---

## Project Structure

```
├── index.html                     # Landing / marketing page
├── app/                           # The Vite React application
│   ├── api/ai/                    # Vercel Edge Functions
│   │   ├── _deepseek.ts           # DeepSeek API client
│   │   ├── prompt.ts              # AI prompt suggestions
│   │   ├── rewrite.ts             # AI draft polish
│   │   ├── weave.ts               # AI knight contribution
│   │   └── explain-alert.ts       # AI alert explanation
│   ├── src/
│   │   ├── components/            # Shared UI components
│   │   ├── flows/                 # Integration tests (~27 user-flow tests)
│   │   ├── hooks/                 # Custom hooks (auth, theme, motion)
│   │   ├── lib/                   # Utilities (guardian, localStorage, virtual list)
│   │   ├── pages/                 # Route pages (8 pages)
│   │   ├── repositories/          # Data layer (localStorage CRUD)
│   │   └── services/              # AI client (stub / http dual-mode)
│   ├── index.html                 # App entry point
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vercel.json
├── graph/                         # Screenshots & team photos
└── ai-logs/                       # AI interaction logs
```

---

## Design System

The project uses a custom design system called **"Round Table"**:

- **Palette**: Parchment base with dark gold accents (`--rt-gold`, `--rt-parchment`)
- **Fonts**: [Cinzel](https://fonts.google.com/specimen/Cinzel) (display) + [Fraunces](https://fonts.google.com/specimen/Fraunces) (body)
- **Textures**: CSS pseudo-element paper grain and vignette overlays
- **Animations**: Fade-up page entrance, slow-rotating crest seal, gold-sweep hover effect
- **Utility classes**: `rt-surface`, `rt-field`, `rt-gild`, `rt-subpanel`

---

## License

MIT
