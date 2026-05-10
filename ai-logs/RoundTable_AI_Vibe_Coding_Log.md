# Round Table (圆桌学术讨论厅) — AI Vibe Coding Log

CPT208 Human-Centric Computing — Coursework Project  
Topic B1: XJTLU Group Discussions  
Generated: May 2026

---

## AI Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| **DeepSeek API** | deepseek-chat | Runtime AI engine: draft rewriting, prompt suggestions, alert explanations, AI Knight discussion contributions |
| **Gemini 3.1 Pro** | gemini 3.1 pro  (via Google AI Studio) | Design brainstorming, user persona generation, medieval theme conceptualization, poster content drafting, README writing |
| **Claude Code** | v4.x (Claude Opus 4.7 / Sonnet 4.6) | Primary vibe coding tool: project scaffolding, React component generation, business logic implementation, TypeScript debugging, test authoring |

---

## 1. DeepSeek API Integration Layer

### Overview

DeepSeek's `deepseek-chat` model serves as the runtime AI engine for all four AI-powered features in Round Table. Requests flow through Vercel Functions (`api/ai/`) with JSON response format. Each endpoint includes a primary prompt, a compact retry prompt (triggered on length validation failure), and language-specific CJK/EN fallbacks.

### Configuration

```
Model: deepseek-chat (configurable via DEEPSEEK_MODEL env)
Base URL: https://api.deepseek.com (configurable via DEEPSEEK_BASE_URL env)
Default temperature: 0.4
Response format: json_object
```

### 1.1 Draft Rewrite (`/api/ai/rewrite`)

**Purpose:** Rewrite a student's private draft into a polished, discussion-ready contribution. Adapts tone based on room security profile and shield strength.

**Security Profiles:**

| Profile | Temperature | Style |
|---------|-------------|-------|
| fortified | 0.2 | safety-first, very careful, formal, concise |
| guarded | 0.5 | balanced, clear, respectful |
| open | 0.75 | expressive, respectful, preserves writer voice |

Temperature is further modulated: `clamp(baseTemp + (50 - shieldStrength) / 500, 0.1, 0.9)`

**System Prompt (Initial):**

```
You rewrite a student draft for a seminar room app. Safety profile: {style}. Rewrite intensity: {intensity}. Higher shieldStrength implies stricter politeness and reduced confrontational tone. The rewrite must feel noticeably more polished than the original: tighten wording, add a clearer claim, and make it dialogue-ready. Do not prepend meta phrases like "In response to the prompt". Output JSON only with keys: rewrite (string), tone ("academic"|"neutral"|"gentle"), bulletPoints (string[]). The rewrite must be 2-4 sentences, no line breaks, and should be at least as long as the input draft while staying concise (prefer <= 220 chars). bulletPoints must be exactly 3 concise, draft-specific, non-duplicated action phrases.
```

**User Message (Initial):**

```
Task: Rewrite the draft so it reads like a stronger, more mature contribution to a seminar discussion.

{moderate: "Rules: moderate rephrasing is allowed; keep meaning; improve structure."}
{substantial: "Rules: you may substantially restructure for clarity and flow; keep meaning; preserve the writer voice."}

Topic: {topic}
Prompt: {prompt}

Draft:
{text}

Security: {security}
ShieldStrength: {shieldStrength}
```

**System Prompt (Compact Retry — triggered when result exceeds 220 chars or is shorter than input):**

```
Rewrite into 2-4 concise sentences, no line breaks, preserve meaning, and ensure length is >= source draft length while <= 220 chars. Output JSON key rewrite.
```

**User Message (Compact Retry):**

```
Source draft ({N} chars): {text}
Current rewrite: {result_or_original}
Topic: {topic}
Prompt: {prompt}
```

Temperature (retry): 0.45

**CJK/EN Fallback:**
- CJK: `先明确结论，再补具体例子，最后提出可讨论的问题。`
- EN: `State a clear claim, support it with one concrete example, and end with a discussion question.`

### 1.2 Prompt Suggestions (`/api/ai/prompt`)

**Purpose:** Generate a single-sentence writing prompt (≤50 chars) to help users overcome writer's block.

**System Prompt (Initial):**

```
You generate a single-sentence writing prompt for a seminar-room app. Output JSON only with key: prompt (string). The prompt must be <= 50 characters, exactly one sentence, no quotes, no markdown, no line breaks, and it must be specific and actionable rather than generic.
```

**User Message (Initial):**

```
Task: Provide one sentence that helps the user write a stronger private draft for the current discussion.

Topic/Prompt: {topic or prompt or roomTitle}

Security: {security}
ShieldStrength: {shieldStrength}
```

Temperature: 0.6

**System Prompt (Compact Retry — triggered when > 50 chars):**

```
Rewrite to <= 50 characters, one sentence, no line breaks. Output JSON key prompt.
```

**User Message (Compact Retry):**

```
Original prompt: {result}
```

Temperature (retry): 0.2

**CJK/EN Fallback:**
- CJK: `先写立场一句，再补一个具体例子。`
- EN: `Write one claim, then add one concrete example.`

### 1.3 Alert Explanation (`/api/ai/explain-alert`)

**Purpose:** Explain AI safety/fairness alerts in the Facilitator dashboard with evidence snippets.

**System Prompt:**

```
You explain an AI safety or fairness alert in a seminar room app. Output JSON only with keys: explanation (string), evidence (string[]). Keep it short and actionable.
```

**User Message:**

```json
{
  "task": "Explain the alert and cite brief evidence snippets.",
  "alertTitle": "{alert_title}",
  "alertDetail": "{alert_detail}",
  "context": {
    "roomId": "...",
    "roomTitle": "...",
    "prompt": "...",
    "topic": "...",
    "mode": "..."
  }
}
```

Temperature: 0.4 (default)

### 1.4 AI Knight Weave (`/api/ai/weave`)

**Purpose:** Generate AI-authored discussion contributions from AI Knight personas in structured mode. Either continues the previous speaker's point or states own position. Includes de-duplication (up to 3 retries) and CJK/EN fallback pools.

**System Prompt (Initial):**

```
You are an AI knight speaking in a seminar room app. Style: {style}. Output JSON only with keys: script (string), followUps (string[]). The script must be over 20 characters and at most 180 characters, and should sound natural in dialogue. Content rule: either (A) continue the previous speaker by adding a concrete supplement, or (B) state your own view on the discussion topic. Do not quote or restate recent AI lines. Do not start with phrases like "Building on", "Building upon", or "To build on".
```

**Style by profile:**

| Profile | Style |
|---------|-------|
| fortified | safety-first, inclusive, low-conflict; avoid sharp claims |
| guarded | balanced, facilitative, and grounded |
| open | curious, bold, but still respectful; invite disagreement constructively |

**User Message (Initial):**

```
Task: {speakerLabel} should provide a fresh line for turn {turnNumber}, attempt {aiAttempt}.

Prompt: {prompt}
Topic: {topic}

{with latest speaker} Latest speaker: {latestSpeakerLabel}
Latest content: {latestSpeakerContent}

Recent:
{contribution}

{with recent AI lines} Recent AI lines (avoid wording overlap):
{recentAiLines joined}

Security: {security}
ShieldStrength: {shieldStrength}
```

Temperature: 0.2 (fortified) / 0.5 (guarded) / 0.75 (open), modulated by shield strength

**System Prompt (Compact Retry — triggered when ≤ 20 chars or > 180 chars):**

```
Rewrite into one dialogue-style line, over 20 and <= 250 characters, no quotes, no repeated wording, keep topic-specific angle. Output JSON key script.
```

**User Message (Compact Retry):**

```
Original line: {cleaned_result}
{with recent AI lines} Avoid overlap:
{recentAiLines joined}
```

Temperature (retry): 0.6

**CJK Fallback Pool:**

| # | Text |
|---|------|
| 1 | 我接着上一位的观点补充，建议给出一个具体情境并说明这条结论在什么条件下会失效。 |
| 2 | 围绕"{topic}"，我的看法是先明确立场，再用一个具体例子说明理由。 |
| 3 | 顺着这个思路，我们需要考虑实际执行时的资源限制和潜在阻力。 |
| 4 | 探讨这个问题时，往往被忽略的是不同利益相关者的诉求差异。 |

**EN Fallback Pool:**

| # | Text |
|---|------|
| 1 | I would continue the previous point by adding one concrete scenario and clarifying when the claim fails. |
| 2 | On "{topic}", my view is to state a clear position and support it with one concrete case. |
| 3 | Following that train of thought, we must also consider practical constraints and friction. |
| 4 | A critical aspect that is often overlooked here is the divergence of stakeholder interests. |

**Discourse connector prefixes (rotated by turn × attempt):**

| CJK | EN |
|-----|-----|
| (none) | (none) |
| 另外， | Also, |
| 退一步讲， | Taking a step back, |
| 其实换个角度看， | From another angle, |
| 或者我们也可以说： | Alternatively, |
| 不可否认的是， | Admittedly, |

---

## 2. Gemini 3.1 Pro: Design Brainstorming & Concept Generation

### Overview

Google Gemini 3.1 Pro (via Google AI Studio) was used for high-level design thinking, user research synthesis, and content generation. These prompts informed the human-centric design decisions before any code was written. All core design logic and user requirements remained the group's original work — Gemini assisted with articulation and ideation.

### 2.1 Project Concept & Motivation

**Prompt: App Concept Brainstorming**

> We are designing a web app for XJTLU students to have meaningful campus discussions. The theme should be medieval/Arthurian — think King Arthur's Round Table, where everyone sits as equals. The app needs to feel scholarly but playful. Give us:
> 1. A catchy project name (Chinese + English)
> 2. A 200-word motivation statement for why this matters for XJTLU students
> 3. Three core "playful" features that would make discussions feel like a game rather than a chore
> 4. A metaphor we can use throughout the UI to reinforce the Round Table concept

**Response used for:** Project name "Round Table / 圆桌学术讨论厅", motivation statement foundation, core feature ideation (AI Guardian, AI Knight, Structured Turn-Based Mode).

**Prompt: Stakeholder Persona Generation**

> Create two distinct user personas for a campus discussion platform at a Sino-British university in Suzhou, China. The personas should reflect real challenges students face in academic discussions: language barriers (Chinese/English), reluctance to speak up in groups, and uneven participation.

**Response used for:** Persona definitions in Process Portfolio — "Shy Scholar" (first-year student with ideas but rarely speaks) and "Dominant Debater" (confident speaker who unintentionally crowds out others).

### 2.2 Medieval Theme Design System

**Prompt: Visual Design Language**

> We need a complete visual design language for a medieval/scholarly discussion app called "Round Table." Describe:
> 1. Color palette (primary, accent, surface, text)
> 2. Typography pairings (display + body) with Google Fonts recommendations
> 3. UI metaphors (what do buttons, cards, and modals look like?)
> 4. Icon style and decorative elements
> 5. How to make the UI feel "dark gold and parchment" without looking dated

**Response used for:** The dark gold (#b9902e) + warm parchment design system, Cinzel/Fraunces font pairing, rounded-3xl translucent card aesthetic, CrestSeal/HelmSigil decorative components.

**Prompt: Component Naming Conventions**

> We're building a React app with Arthurian theming. Suggest medieval-themed names for these UI elements: discussion room, private draft area, moderator dashboard, AI assistant, user joining a room, like/vote button.

**Response used for:** "Thought Space" (private draft area), "Facilitator's Helm" (moderator dashboard), "AI Guardian" / "AI Knight" (AI assistants), "Claim a Seat" (joining flow), "Round Table" / "Live Scroll" (discussion area).

### 2.3 Poster Content Drafting

**Prompt: Poster Aims & Objectives**

> Help us draft the Aims & Objectives section for our academic poster about Round Table, a playful seminar discussion app for XJTLU students. The project is for CPT208 Human-Centric Computing. Focus on: supporting equality in discussions, bridging language gaps, and making academic conversations more engaging. Keep it concise — this goes on an A1 poster.

**Prompt: Novelty & Significance Statement**

> Write a 150-word statement explaining what makes the Round Table app novel compared to existing discussion tools (like Padlet, Piazza, or WeChat study groups). Focus on: AI-mediated fairness, Arthurian gamification, and the private-to-public Thought Space workflow that reduces speaking anxiety.

**Response used for:** Poster content (Week 8 presentation). The group substantially edited and verified all claims.

### 2.4 README & Documentation

**Prompt: README Generation**

> Write a bilingual (Chinese + English) README.md for our Round Table MVP project repository. Include: project description, key features (landing page, discussion lobby, discussion room, facilitator panel), tech stack (Vite, React 18, Tailwind CSS 3, TypeScript, Zustand), local development setup (npm install, npm run dev), testing commands, Vercel deployment instructions.

**Response used for:** The project README.md, with group edits for accuracy.

### 2.5 User Journey Map Narration

**Prompt: User Journey Story**

> Describe a typical user journey for an XJTLU student using the Round Table app for the first time. Start from landing on the homepage, through joining a discussion room, writing in Thought Space, getting AI help, publishing, and seeing their contribution in the live discussion. Use narrative style suitable for a CHI-style video script.

**Response used for:** Foundation for the 2-minute video demo storyboard and user journey map in the Process Portfolio.

---

## 3. Claude Code: Project Scaffolding & Architecture

### Overview

Claude Code (Claude Opus 4.7 / Sonnet 4.6) was the primary vibe coding tool used to scaffold the project, implement the repository pattern, generate React components, and write integration tests. All Claude-generated code was verified through TypeScript compilation, ESLint, and Vitest test suites.

### 3.1 Initial Project Setup

**Prompt: Scaffold Vite + React + TypeScript Project**

```
Create a new Vite + React + TypeScript project with the following configuration:

- Use React 18 with TypeScript 5.8
- Set up Tailwind CSS 3 with PostCSS and Autoprefixer
- Configure Vitest 3 with Testing Library (React, Jest DOM, User Event) and jsdom
- Add ESLint 9 flat config with typescript-eslint and react-hooks plugin
- Set up react-router-dom v7 with BrowserRouter and route definitions
- Configure Zustand 5 for state management
- Add lucide-react for icons
- Configure the project for Vercel deployment with SPA rewrite rules in vercel.json
- Use Cinzel (display) and Fraunces (body) serif fonts from Google Fonts for a scholarly medieval aesthetic
- Set up vite-tsconfig-paths for path aliases (@/ → src/)
```

**Files generated:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `vercel.json`

### 3.2 Component Architecture Design

**Prompt: Design the Complete Component Tree**

```
You are a senior React architect designing a medieval-themed academic discussion web application called "Round Table" with Arthurian aesthetics (dark gold, parchment, crest motifs).

Design the complete React component tree for a seminar discussion room app with these features:

1. Landing page with animated background and branded hero
2. Discussion room lobby with create/join rooms, display recent rooms
3. Discussion room with: private draft area (Thought Space), AI polish button, publish flow, live message scroll with likes
4. Facilitator (moderator) panel with: participation distribution donut chart, trend charts, participant breakdown, control deck (pause/resume, prompt cards, quick polls), fairness rules sliders, guardian alerts, round-robin speaker control
5. Authentication flow (seats, display names, anonymous option)
6. Navigation drawer with room links
7. Two discussion modes: free-form (default) and structured (turn-based with quotas)

Organise by: Pages, Components, Hooks, Services, Repositories.
Include the data flow pattern (repository pattern with localStorage via a publish/subscribe store).
```

**Output:** Component tree used as the architecture blueprint:
- Pages: Root, Home, Lobby, CreateChamber, Room, Facilitator, FacilitatorIndex, Auth, Profile
- Repositories: room, post, seat, draft, session, auth
- Services: aiClient (abstraction over DeepSeek API)
- Hooks: useAuthSession, useTheme, usePrefersReducedMotion

### 3.3 Vercel Deployment Configuration

**Prompt: Create vercel.json SPA Rewrite**

```
Create a vercel.json configuration file for a Vite SPA with the following requirements:
- Rewrite all routes (/*) to /index.html for client-side routing via react-router-dom
- Exclude /api/* paths from the rewrite rule so Vercel Functions can handle them
- Ensure the configuration works for both preview and production deployments
```

### 3.4 Repository Pattern Implementation

**Prompt: Implement Data Access Layer**

```
You are implementing a data access layer for a React SPA using the Repository pattern. All data is persisted to localStorage with JSON serialization. Use a publish/subscribe pattern for cross-component reactivity.

Create the following repository modules in src/repositories/:

1. roomRepository.ts: CRUD for discussion rooms
   Fields: title, topic, prompt, tags[], mode ("free-form"|"structured"), security ("fortified"|"guarded"|"open"), shieldStrength (0-100), capacity, participants, facilitatorCode, aiGuardEnabled (boolean)
   
2. postRepository.ts: CRUD for published posts
   Fields: id, roomId, authorId, authorLabel, content, likes, createdAt
   Methods: listPosts(roomId), createPost(roomId, input), likePost(postId)

3. seatRepository.ts: Claim/release seats
   Fields: id, roomId, displayName, isAnonymous, isBot, isFacilitator
   Human-readable labels (e.g., "Knight Alaric", "Lady Guinevere")

4. draftRepository.ts: Private drafts (Thought Space)
   Fields: id, roomId, seatId, text, status ("draft"|"published"), lastActivityAt
   Methods: upsertDraft (auto-save), listDrafts(roomId), markPublished(id)

5. sessionRepository.ts: Structured discussion session
   Fields: order (speaker list), currentSpeakerId, turnNumber, turnSeconds, turnEndsAt, maxSpeeches, maxSeconds, stats (per-participant), endedAt
   Methods: ensureSession, advanceTurn, setCurrentSpeaker, moveParticipant, recordSpeech, resetSession

6. authRepository.ts: Simplified auth
   Fields: session (nickname, createdAt)

Each repository must:
- Accept a storage key prefix for test isolation
- Use localStore helpers (getJson, setJson, removeKey, subscribeKey)
- Publish changes for reactive re-renders
- Include .test.ts files with Vitest
```

### 3.5 AiClient Service Abstraction

**Prompt: Create Dual-Mode AI Client Service**

```
Create an AI client abstraction (src/services/aiClient.ts) that supports two modes:

1. "stub" mode: Deterministic, scripted responses (no API calls, no cost)
   - rewriteDraft: Hash-based template selection (CJK/EN)
   - suggestPrompt: Minimal universal prompts
   - explainAlert: Pass-through concatenation
   - weaveContribution: Template pools with de-duplication, CJK/EN fallbacks

2. "http" mode: POST to Vercel Functions at /api/ai/*
   - rewriteDraft → /api/ai/rewrite
   - suggestPrompt → /api/ai/prompt
   - explainAlert → /api/ai/explain-alert
   - weaveContribution → /api/ai/weave

Mode selection: Use http if VITE_AI_BASE_URL is set OR if in production (import.meta.env.PROD), otherwise stub.

Type definitions: AiClientMode, AiContext, RewriteDraftInput/Result, SuggestPromptInput/Result, ExplainAlertInput/Result, WeaveContributionInput/Result, AiClient interface
```

### 3.6 Storage Key & LocalStore Utilities

**Prompt: Build localStorage Abstraction**

```
Create a localStorage abstraction for a React SPA:

1. src/lib/localStore.ts:
   - getJson<T>(key): T | null — read and parse
   - setJson(key, value): void — serialize and write
   - removeKey(key): void — delete
   - subscribeKey(key, callback): () => void — listen for changes (StorageEvent + custom events)

2. src/lib/storageKeys.ts:
   - Centralized key factories (e.g., postsKey(roomId), sessionKey(roomId))
   - Avoid key collisions between rooms

The subscribeKey function must handle cross-tab changes (window 'storage' event), same-tab changes (custom event dispatching), and cleanup (return unsubscribe function).
```

---

## 4. Claude Code: Core Page Components

### 4.1 Discussion Room Page (`Room.tsx`)

**Prompt:**

```
You are building a medieval-themed seminar discussion room in React + TypeScript + Tailwind CSS. Use Cinzel for display headings and Fraunces for body text. The color palette uses dark gold (#b9902e), warm parchment, and stone tones. Components should use rounded-2xl/3xl borders, subtle gold borders, and translucent white backgrounds. Follow the repository pattern for data access.

Build a Room.tsx page component with these sections:

1. HEADER:
   - Room title, topic, tags (max 6), security badge (Fortified/Guarded/Open), participant count (N/capacity), AI Active indicator, invite code display
   - CrestSeal decorative SVG with slow rotation animation
   - Back button to lobby, menu button for nav drawer

2. PROMPT CARD:
   - Gold-styled surface showing the discussion prompt text
   - "PROMPT" label in tracked-out uppercase gold

3. STRUCTURED MODE (conditional):
   - Current speaker display with label
   - Turn countdown timer (Clock3 icon + seconds remaining)
   - Advance Turn / Restart buttons
   - Speaker order badges (current speaker highlighted in gold)
   - Undo banner (6s auto-dismiss) after advancing turn

4. THOUGHT SPACE (private draft):
   - Textarea for private draft writing (placeholder: "Write a private draft…")
   - Auto-save to localStorage via draftRepo (300ms debounce)
   - "Polish with AI" button → calls ai.rewriteDraft()
   - "Publish from Draft" button (gold, primary action)
   - AI SUGGESTION panel (grid side-by-side with draft):
     - Shows rewritten text + "Use Rewrite" button to replace draft
     - "Prompt" button → calls ai.suggestPrompt() for writing direction
     - Bullet points from AI structured feedback
   - Draft help nudge ("Want help polishing this before you speak?") — appears after 9s if draft > 30 chars
   - Quota display for structured mode (speeches remaining, seconds remaining)

5. LIVE SCROLL (message list):
   - Reverse-chronological display of published posts
   - Each post: author label, content with keyword highlighting (via guardian.ts), like button with count
   - "Show latest 30" / "Show all messages" toggle when > 30 messages
   - Empty state: "No messages yet. Start in Thought Space..."

6. AI KNIGHT AUTO-POST (structured mode only):
   - Trigger when current speaker is a bot (isBot flag)
   - Build context: recent messages (8), recent AI lines (5), latest human post
   - Retry up to 3 times if duplicate content detected (normalize + compare)
   - Fallback to CJK/EN template on all retries exhausted

7. CLAIM SEAT MODAL: Shown when user has no seat in the room.

8. CONFIRM DIALOGS: Publish confirmation, advance turn confirmation.

9. FACILITATOR CONTROLS DISPLAY:
   - Paused banner (red) when facilitator pauses
   - Facilitator prompt card display
   - Poll display with vote buttons (Agree/Disagree/Unsure), live results

10. KEYWORD HIGHLIGHTING:
    - When aiGuardEnabled, compute keywords from all posts (computeKeywords)
    - Apply highlightTextParts to each post's content
    - Highlighted spans get gold background (bg-[#e0c06a]/35)

Use the AiClient service with stub/HTTP mode switching based on VITE_AI_BASE_URL env var.
All state: React useState + useEffect. No external state library (repos handle persistence).
```

**Output:** `src/pages/Room.tsx` (~867 lines)

### 4.2 Facilitator Dashboard (`Facilitator.tsx`)

**Prompt:**

```
You are building a monitoring and control dashboard for a seminar discussion app. The page is called "Facilitator's Helm" with an Arthurian/medieval theme. Use the same design system: dark gold accents (#b9902e), translucent cards, Cinzel/Fraunces fonts, rounded-3xl surfaces.

Build a Facilitator.tsx dashboard with these sections:

1. HEADER BANNER:
   - HelmSigil decorative SVG (rotating, with segment colors from participation distribution)
   - Page title "Facilitator's Helm" with Swords icon
   - Room selector tabs (link to /facilitator/:roomId for each room)
   - Menu, Export Summary, Back to Room buttons

2. KPI CARDS (4-column grid):
   - Active Knights: unique participant count (Users2 icon)
   - Shield Status: participation balance % (Shield icon)
   - Guardian Alerts: active alert count (AlertTriangle icon)
   - Engagement: High/Medium/Low label (Gauge icon)

3. PARTICIPATION DISTRIBUTION:
   - Hand-coded SVG donut chart using polarToCartesian/describeArc math
   - Color-coded segments per participant with percentage bars
   - Legend with participant labels, percentage, progress bars
   - Three mini stat cards: Balance %, Dominance level, Engagement label
   - Total contributions count

4. TRENDS SECTION:
   - Last 30 minutes bar/line chart (30 buckets, 1 minute each)
   - Cumulative posts line chart (24-point interpolation over total time span)
   - Metric pills: Msg/min, Avg response (s), Coverage %, Coverage 10m %, Silence gaps, Turn info
   - Mini stat grid: Total Likes, Total Words, Alerts, Drafting Now

5. CONTRIBUTION HEATMAP:
   - 7-day × 13-hour (09:00–21:00) grid
   - Color intensity: rgba(185,144,46, 0.18–0.73) proportional to post count
   - Day labels ("Today", "1 day ago", ... "6 days ago")
   - Hour column headers, peak hour indicator, gradient legend

6. PARTICIPANT BREAKDOWN:
   - Table with initials avatars, name, last activity (relative time), contribution count, tag (High/Medium/Low)
   - Virtual scrolling for 50+ participants (computeVirtualRange with overscan=6)
   - Color-coded tags: emerald (High), amber (Medium), red (Low)

7. CONTROL DECK:
   - Pause/Resume toggle (with event logging)
   - Turn rotation: "Next Speaker" button
   - Prompt Cards: 4 predefined prompts as quick-action buttons
   - Quick Poll: 3-option Agree/Disagree/Unsure with live results bar chart
   
8. FAIRNESS RULES:
   - Three HTML range sliders: Silence Threshold (30–600s), Dominance Share (20–95%), Consecutive Posts (2–8)
   - Current values displayed, persisted per-chamber, event logging on changes

9. TIMELINE:
   - Reverse-chronological event log (last 12 events)
   - Event types: Paused/Resumed, Advanced speaker, Prompt card, Poll started, Rules updated
   - Each event: title, detail, relative time, actor name

10. GUARDIAN ALERTS:
    - Rule-based detection (runs in useMemo): Cold Start, Silence Stretch, Participation Imbalance, Rapid Streak, Turn Order Missing
    - Alert cards with severity badges (critical/warning/info), color coding
    - Controls: Dismiss, Expand/Collapse, Mute All
    - "Spark" button → calls ai.explainAlert() for AI-generated context and evidence

11. AI EQUITABLE PARTICIPATION REPORT:
    - Overall Participation Score (0–100) with delta from previous session
    - Three expandable sections: Speaking Time Distribution, Facilitator Recommendations, Session Highlights
    - "Regenerate report" button

12. NEAR CONTRIBUTIONS:
    - Drafts in progress (≤6 most recent with content), "Drafting now" indicator
    - "Weave with AI" button → calls ai.weaveContribution()
    - "Make Speaker" button for facilitator override

13. ROUND-ROBIN CONTROL (structured mode only):
    - Speaker list with stats (speeches/max, seconds/max)
    - Current speaker highlighted, per-speaker: Make Speaker, Move Up, Move Down buttons
    - Advance Turn action

Metrics calculation functions: computeParticipationBalance, buildHourHeatmap, computeVirtualRange, buildFacilitatorExport, formatAgo, initials, polarToCartesian, describeArc.

State management: useState for UI state, useEffect for localStorage subscriptions, useMemo for derived metrics.
```

**Output:** `src/pages/Facilitator.tsx` (~1817 lines)

### 4.3 AI Guardian Panel (`AiGuardianPanel.tsx`)

**Prompt:**

```
Create an AiGuardianPanel.tsx React component for displaying discussion safety alerts. This component appears above the Live Scroll in the Room page when the room has aiGuardEnabled = true.

Props: room: Room, posts: Post[]

Features:
1. Compute keywords from posts using guardian.ts computeKeywords()
2. Display a summary bar: "AI Guardian Active" with Sparkles icon and keyword count
3. Show extracted keywords as clickable chips/tags
4. When a keyword chip is clicked, highlight matching words in the Live Scroll
5. Expandable panel with guardian suggestions for discussion improvement
6. Use violet/purple accent (not gold) to distinguish AI Guardian from main UI

Design: same rounded-2xl translucent card style, violet border/background scheme
```

**Output:** `src/components/AiGuardianPanel.tsx`

---

## 5. Stub Mode & Deterministic Fallbacks

### Overview

When the DeepSeek API is unavailable (no `VITE_AI_BASE_URL` set and not in production), the AiClient operates in "stub" mode — producing deterministic, algorithmic responses. This keeps the app fully functional for development and testing without API costs. The stub logic lives in `src/services/aiClient.ts` (`createAiClient` with `mode: "stub"`).

### 5.1 Deterministic Draft Rewrite

**Implementation prompt:**

```
Implement a deterministic draft rewrite function that works without API calls. Requirements:

1. If input is empty, return: { rewrite: "Draft something first...", tone: "academic", bulletPoints: [] }

2. Detect CJK characters in input text or topic (regex: /[㐀-鿿]/)

3. Extract a focus word from the draft:
   - Split on whitespace and CJK/EN punctuation
   - Find the longest token >= 2 characters
   - Fallback: "point" (EN) or "主题" (CJK)

4. Use a hash of (cleaned draft + topic + focus) to deterministically pick from 3 rewrite templates:

   CJK templates:
   - "把"{focus}"写成明确结论，再补一个具体例子，并说明其意义。"
   - "围绕"{focus}"先给判断，再给证据，最后用问题引导回应。"
   - "删掉空泛表达，保留立场、理由和一个可讨论的问题。"

   EN templates:
   - "Turn \"{focus}\" into a clear claim, add one concrete example, then explain why it matters."
   - "State your position on \"{focus}\", support it with evidence, and close with a discussion question."
   - "Remove vague phrases and keep a crisp claim, one reason, and one invitation to respond."

5. Generate bullet points (3 items, de-duplicated):
   CJK: ["聚焦{focus}", "给出具体例证", "说明影响范围", "提出可讨论问题"]
   EN: ["Focus on {focus}", "Add concrete evidence", "Clarify the implication", "End with one question"]

Hash helper: simple DJB2-style hash: h = (h * 31 + charCode) >>> 0
Pick helper: pickByHash(items, seed) = items[hash(seed) % items.length]
```

### 5.2 Deterministic Prompt Suggestion

**Implementation prompt:**

```
Implement a deterministic prompt suggestion function:

1. Extract anchor text: topic > prompt > roomTitle (first non-empty after trim)
2. Detect CJK in anchor
3. Return universal prompts:
   - CJK: "先写立场一句，再补一个具体例子。"
   - EN: "Write one claim, then add one concrete example."
```

### 5.3 Deterministic Alert Explanation

**Implementation prompt:**

```
Implement a trivial alert explanation passthrough:

1. Concatenate: "{alertTitle}: {alertDetail}"
2. Evidence: ["Prompt: {room.prompt}"] or ["No additional evidence available."]
```

### 5.4 Deterministic AI Knight Weave

**Implementation prompt:**

```
Implement a deterministic AI Knight contribution generator with these requirements:

1. Build a seed string from: speakerLabel | anchor (topic or prompt) | latestSpeakerContent | turn | attempt | last 80 chars of contribution

2. Determine language: CJK if anchor or latest content has CJK characters

3. Build template pools:

   CJK continuation (continuation of previous speaker):
   - "接着上一位的发言，关键在于把判断落到可验证的具体场景。"
   - "延续刚才的观点，我认为还要补上边界条件，否则结论容易被误用。"
   - "基于上一条发言，我建议给出一个反例来检验结论是否稳健。"
   - "补充一点，前面的看法如果放到极端情况下，可能会得出相反的结论。"
   - "顺着这个思路，我们还需要考虑实际执行时的资源限制和阻力。"
   - "我也认同上一位的看法，不过在定义核心概念时还可以更精准些。"

   EN continuation:
   - "Adding to the previous point, we should ground the claim in one testable scenario."
   - "I would extend that point by adding boundary conditions so the conclusion is not overgeneralized."
   - "To continue the previous idea, we should add one counterexample to stress-test the claim."
   - "As a supplement, if we push the previous logic to the extreme, it might backfire."
   - "Following that train of thought, we must also consider practical constraints and friction."
   - "I agree with the previous speaker, but we could define the core concepts more sharply."

   CJK stance (own position on topic):
   - "关于"{anchor}"，我的看法是先给明确立场，再用证据说明为什么成立。"
   - "围绕"{anchor}"，我更关注结论对下一步行动的实际影响。"
   - "就"{anchor}"而言，最重要的是把观点写成可被反驳也可被验证的判断。"
   - "对于"{anchor}"，我们需要区分表象和本质，不能只看短期效应。"
   - "针对"{anchor}"这个议题，我的立场是必须结合具体业务场景来谈，不能空对空。"
   - "探讨"{anchor}"时，往往被忽略的是不同利益相关者的诉求差异。"

   EN stance:
   - "On \"{anchor}\", my view is that a clear stance must be paired with concrete evidence."
   - "For \"{anchor}\", the key is explaining the practical consequence of the claim."
   - "Regarding \"{anchor}\", a strong point should be both testable and falsifiable."
   - "When discussing \"{anchor}\", we need to separate the symptoms from the root cause."
   - "My stance on \"{anchor}\" is that it must be evaluated within a specific business context."
   - "A critical aspect of \"{anchor}\" that is often overlooked is the divergence of stakeholder interests."

4. Pool selection:
   - If latestSpeakerContent exists: merge continuation + stance pools (12 items)
   - If no latestSpeakerContent: use only stance pools (6 items)

5. De-duplication (pickNonDuplicate):
   - Normalize text: toSingleLine(text).toLowerCase() (collapse whitespace)
   - Skip candidates where any recent AI line (normalized) contains the core template text
   - Iterate from hash position until non-duplicate found or pool exhausted
   - If all candidates are duplicates, fall back to hash selection

6. Apply discourse connector prefix (rotated):
   CJK prefixes: ["", "另外，", "退一步讲，", "其实换个角度看，", "或者我们也可以说：", "不可否认的是，"]
   EN prefixes: ["", "Also, ", "Taking a step back, ", "From another angle, ", "Alternatively, ", "Admittedly, "]
   Index: (turn * 11 + attempt * 5) % prefixPool.length

7. Format: "{speakerLabel}{separator}{prefix}{core}"
   CJK separator: "：", EN separator: ": "

8. Follow-ups (always English):
   ["Can someone provide an example?", "What is a counterargument?", "How would we test this claim?"]
```

### 5.5 Server-Side Fallbacks (api/ai/*.ts)

Each Vercel Function endpoint also has server-side fallback logic when the DeepSeek API response fails length validation:

| Endpoint | Validation | Fallback |
|----------|-----------|----------|
| rewrite.ts | rewrite must be ≥ source length AND ≤ 220 chars | 2nd API call with compact prompt; if still fails → CJK/EN template |
| prompt.ts | prompt must be ≤ 50 chars | 2nd API call with compact prompt; if still fails → CJK/EN template |
| explain-alert.ts | (no length validation) | Returns API response as-is |
| weave.ts | script must be > 20 chars AND ≤ 180 chars | 2nd API call with compact prompt; if still fails → hashed fallback from CJK/EN pool with prefix rotation |

The `charCount` function uses `Array.from(text).length` to correctly count multi-byte CJK characters.

### 5.6 Utility Helper Functions

```typescript
function hasCjk(text: string): boolean       // Detect CJK characters
function toSingleLine(text: string): string   // Collapse whitespace
function shortHash(text: string): number      // DJB2-style hash
function pickByHash<T>(items, seed): T        // Hash-based selection
function pickNonDuplicate(coreItems, seed, recent, renderCandidate): string  // De-duplicating pick
function uniq(items: string[]): string[]      // Case-insensitive dedup
```

---

## 6. Guardian Module & Utility Components

### 6.1 Guardian: Keyword Extraction & Highlighting (`guardian.ts`)

**Prompt:**

```
Write a TypeScript module (src/lib/guardian.ts) for lightweight NLP in a discussion room app:

1. computeKeywords(posts: Array<{ content: string }>): string[]
   - Tokenize: lowercase, strip non-alphanumeric (keep # for hashtags), split on whitespace
   - Filter: remove English stop words (the, a, an, and, or, to, of, in, on, for, with, is, are, be, we, i, you, it, that, this, as, at, by, from, can, could, should, would)
   - Filter: tokens with length <= 2
   - Count term frequency (Map<string, number>)
   - Return top 10 keywords sorted by descending frequency

2. highlightTextParts(text: string, keywords: string[]): TextPart[]
   TextPart = { text: string; isHighlight: boolean }
   - Build regex from active keywords (escape regex special chars)
   - Split text into segments: non-matching (isHighlight: false) and matching (isHighlight: true)
   - Case-insensitive matching (/gi flag)
   - Return at least one TextPart (unchanged if no matches)
   - Properly escapeRegExp for keywords with regex meta-characters

Test file: guardian.test.ts
```

### 6.2 Virtual List for Large Datasets (`virtualList.ts`)

**Prompt:**

```
Write a computeVirtualRange utility for virtual scrolling in React:

interface VirtualRangeInput {
  scrollTop: number        // current scroll position
  itemHeight: number       // fixed height per item in px
  viewportHeight: number   // visible area height in px
  overscan: number         // extra items to render above/below
  total: number            // total number of items
}

function computeVirtualRange(input: VirtualRangeInput): { start: number; end: number }

Implementation:
- start = max(0, floor(scrollTop / itemHeight) - overscan)
- end = min(total, ceil((scrollTop + viewportHeight) / itemHeight) + overscan)
- Used by Facilitator.tsx for participant breakdown (50+ participants)
```

### 6.3 Tailwind Theme Configuration

**Prompt:**

```
Configure Tailwind CSS 3 for a medieval-themed academic discussion app:

// tailwind.config.js — extend:
fontFamily:
  display: ['Cinzel', 'serif']     // headings, tracked-out labels
  body: ['Fraunces', 'serif']       // body text
  mono: ['ui-monospace', 'monospace'] // invite codes

colors:
  gold: { 50: '#fdf8ed', 100: '#f6edd5', 200: '#e0c06a', 300: '#b9902e', 400: '#7a5b10', 500: '#3d2e08' }

animation:
  'rt-rotate-slow': 'rt-rotate 60s linear infinite'
  'rt-fade-up': 'rt-fade-up 0.5s ease-out both'

borderRadius: '2xl': '1rem', '3xl': '1.25rem', '4xl': '1.75rem'
```

### 6.4 Accessibility Features

**Prompt:**

```
Add accessibility features to all major page components (Room.tsx, Facilitator.tsx, Home.tsx, Lobby.tsx, Root.tsx):

1. Add "Skip to content" anchor link as first focusable element (sr-only, visible on focus, href="#main")
2. Add id="main" to main content wrapper
3. aria-label on ALL icon-only buttons
4. aria-label on SVG charts, textareas, range inputs
5. Proper heading hierarchy: h1 → h2, no skipped levels
6. focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9902e]/35 on all interactive elements
7. Semantic HTML: <main>, <nav>, <section>
8. role="status" on live regions
9. WCAG AA color contrast on gold-on-light combinations
```

### 6.5 clsx + tailwind-merge Utility (`utils.ts`)

**Prompt:**

```
Create a cn() utility function using clsx and tailwind-merge for conditional Tailwind class merging:

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

---

## 7. Testing Prompts

### 7.1 Integration Test Flow Template

**Prompt: Create a Room Flow Test**

```
Write an integration test flow (src/flows/roomConfirmAndGuidanceFlow.test.tsx) for a React discussion room app using Vitest + Testing Library (render, screen, waitFor) + User Event.

Test flow:
1. Seed localStorage with a test room, test seat, and session
2. Render <Room /> wrapped in <MemoryRouter> with roomId param
3. Assert the room title, topic, and prompt are visible
4. Assert the Thought Space textarea is present and enabled
5. Type a draft: "I believe the core issue is the lack of clear definitions in the debate."
6. Wait for auto-save (debounce)
7. Click "Polish with AI" button
8. Wait for AI suggestion panel to appear with rewritten text
9. Assert the AI suggestion is visible and not empty
10. Click "Use Rewrite" to replace draft text
11. Assert the textarea now contains the AI rewrite
12. Click "Publish from Draft", confirm the dialog
13. Wait for the Live Scroll to show the published post
14. Assert the post content and author label are visible
15. Click the Like button, assert count increments

Use stub mode AiClient for deterministic, reproducible assertions.
```

### 7.2 Additional Flow Tests Created (27 total)

```
authFlow, claimSeatGateFlow, createChamberFromCreatePageFlow, createRoomFlow, drawerFlow,
facilitatorEnglishFlow, facilitatorFairnessRulesFlow, facilitatorHudFlow, facilitatorIndexFlow,
guardianExplainFlow, inviteCodeJoinFlow, keywordHighlightFlow, postInRoomFlow, profileDemoSeedFlow,
roomAdvanceTurnConfirmFlow, roomFacilitatorControlsFlow, roomMessageFoldFlow, roomNoRitualBannerFlow,
roomShareInviteFlow, roomTagsLayoutFlow, rootLandingFlow, structuredAiKnightFlow,
structuredQuotaFlow, structuredRestartFlow, structuredTurnGateFlow, thoughtSpaceFlow,
thoughtSpacePolishUseFlow
```

For each flow: seed localStorage, render with MemoryRouter, assert UI, simulate interactions with userEvent, use waitFor for async, test success and error paths.

### 7.3 Repository Unit Tests

```
roomRepository.test.ts: createRoom, getRoom, listRooms, field defaults
postRepository.test.ts: createPost, listPosts (sorted), likePost (atomic increment), room isolation
seatRepository.test.ts: claimSeat (increments participants), getSeat, releaseSeat, isBot/isFacilitator flags
sessionRepository.test.ts: ensureSession, advanceTurn, recordSpeech (quota check), resetSession
draftRepository.test.ts: upsertDraft (create + update), listDrafts (status filter), markPublished

Each test: unique storage prefix, localStorage cleanup in afterEach, edge case coverage.
```

### 7.4 AI Client Stub Mode Tests

```
aiClient.test.ts:
- rewriteDraft with CJK input → CJK template
- rewriteDraft with empty input → fallback
- rewriteDraft with English input → English template
- rewriteDraft determinism (same input → same output)
- suggestPrompt with topic → ≤ 50 chars
- explainAlert concatenates title + detail
- weaveContribution generates non-empty script with speaker prefix
- weaveContribution de-duplication (different attempt → different output)
- weaveContribution with CJK topic → CJK script
- weaveContribution includes followUps array
```

---

## 8. Verification & Ethical Considerations

### Code Verification Process

**TypeScript Compilation:** All code passes `tsc -b --noEmit` with strict TypeScript 5.8 configuration. No type errors. Uses exactOptionalPropertyTypes and strictNullChecks.

**ESLint Static Analysis:** ESLint 9 flat config with typescript-eslint and react-hooks plugin. The `react-hooks/exhaustive-deps` rule caught several missing dependencies in AI-generated useEffect hooks that would have caused stale closure bugs.

**Vitest Test Suite:** All 27 integration flow tests + unit tests pass in stub mode. Deterministic AI responses enable reproducible assertions.

**Manual UI Verification:** Tested at 375px (mobile), 768px (tablet), 1280px+ (desktop). Verified across Chrome, Edge, Firefox. CSS layouts, SVG charts, localStorage persistence, and animations all function correctly.

**AI Output Quality Checks:** For each AI feature, manually verified against real DeepSeek API responses — rewrite quality, prompt length (≤50 chars), alert explanation relevance, weave naturalness and non-duplication.

### Ethical Considerations

**1. Accessibility:** All AI-generated components include aria-labels, skip-to-content links, focus-visible rings, semantic HTML, proper heading hierarchy, and WCAG AA color contrast.

**2. Bias in AI-Generated Content:** Configurable safety profiles (fortified/guarded/open) control response temperature and tone. Fortified mode uses temperature 0.2 with safety-first, inclusive prompting to minimize biased or confrontational outputs. Shield strength (0–100) modulates politeness.

**3. AI Transparency:** AI Knight marked as bot in speaker order. AI alerts show "AI Context" section. AI-rewritten drafts in distinct "AI SUGGESTION" panel separate from user's draft. Users must explicitly click "Use Rewrite" — AI never overwrites automatically. "AI Active" badge visible in room header.

**4. Data Privacy:** DeepSeek API sends only discussion content (drafts, posts, topics) — no PII. Anonymous participation option. No server-side logging of API content. All user data is client-side localStorage only. No backend database or user accounts.

**5. Academic Integrity:** AI features assist, not replace. Draft rewrite preserves original meaning. Prompt suggestions are generic writing direction. AI Knight is a discussion catalyst, not an answer provider. All core design logic, user research, and human-centric justifications produced by the group without AI assistance (per CPT208 policy).

**6. Fairness in Facilitator Controls:** All Guardian rules are rule-based (not black-box AI) — Silence Threshold, Dominance Share, Consecutive Posts. Transparent, user-configurable, auditable. "Spark" button provides AI explanation with evidence for each alert.

---

## 9. Web Deliverables (GitHub Pages + Vercel)

### Overview

This repository produces two public-facing web deliverables:

- **Process Portfolio (static, single-file HTML):** https://strangefake-ex.github.io/
- **Round Table App (Vite SPA + Vercel Functions):** https://round-table-app.vercel.app/

The prompts below capture the primary prompts used to generate and polish each deliverable so the work can be reproduced consistently.

### 9.1 Process Portfolio: Single-File `index.html` (GitHub Pages)

**Prompt: Generate the Process Portfolio Page**

```
You are building a single-file portfolio website (index.html only) for a Human-Centric Computing project called "Round Table". Requirements:

- No build step: use Tailwind via CDN (https://cdn.tailwindcss.com).
- Use Google Fonts: Cinzel (display), Cormorant Garamond (serif headings), Plus Jakarta Sans (body).
- Visual style: dark navy + gold + parchment; cinematic, scholarly, medieval/Arthurian; avoid generic SaaS look.
- Create a long-scrolling page with anchored sections:
  Motivation, Research, Review, Personas, Journey, Requirements, Ideation, Prototype, Evaluation, Team, References.
- Include micro-interactions:
  reveal-on-scroll, hover polish, subtle background aura, and motion-reduce support.
- Use semantic HTML (main/nav/section), correct heading hierarchy, and visible focus rings for keyboard users.
- Embed local PNG/JPG images via relative paths and keep them centrally managed in one folder.
- Include outbound links to:
  1) the Round Table App production URL (Vercel),
  2) the Figma prototype URL.

Output a complete, production-ready index.html with no placeholders.
```

**Output used for:** `/index.html` (deployed on GitHub Pages).

### 9.2 Process Portfolio: Consolidate Local Images into `graph/`

**Prompt: Organize Local Images Without Visual Changes**

```
We have a static index.html that references multiple local .png and .jpg files from the repository root.

Task:
1) Create a folder named "graph/" at the repository root.
2) Move ALL local .png and .jpg files into graph/.
3) Update ALL references in index.html (img src and CSS url()) to the new paths.
4) Ensure the rendered page does not change (no DOM changes other than file paths; no layout/style changes).

Constraints:
- Keep filenames unchanged (including spaces) unless absolutely necessary.
- Do not touch external image URLs.
- After the change, run a quick verification that every referenced local image exists on disk.
```

**Output used for:** `graph/*` asset organization + path updates in `/index.html`.

### 9.3 Process Portfolio: One-Off HTML Hygiene Pass (Accessibility + Consistency)

**Prompt: Write One-Off Fix Scripts (Run Once, Do Not Depend on Them at Runtime)**

```
Write small Python scripts that make safe, mechanical edits to a single static file /workspace/index.html:

1) fix_html_images.py
   - Ensure every <img> has an alt attribute (default alt="").
   - Ensure every <img> has explicit width and height attributes (use sensible defaults).

2) fix_html_links.py
   - Ensure every <a> tag has focus-visible ring classes for keyboard navigation.

3) fix_html_transitions.py
   - Replace "transition-all" with "transition motion-reduce:transition-none" to respect reduced motion.

Do not change the page structure or content semantics beyond these mechanical edits.
```

**Output used for:** A one-time hygiene pass to improve accessibility and reduce-motion support, with the final result committed directly into `/index.html` so the deployed site has no runtime script dependency.

### 9.4 Round Table App: Production Deployment (Vercel)

**Prompt: Deploy a Vite SPA + Serverless AI Endpoints**

```
We have a Vite + React + TypeScript app under /app and serverless endpoints under /app/api/ai/*.

Goal: deploy to Vercel as https://round-table-app.vercel.app/ with these requirements:

- SPA routing works (react-router): all non-/api routes rewrite to /index.html
- /api/ai/* routes are handled by Vercel Functions (no SPA rewrite)
- The frontend can run with stub AI mode in development but call real endpoints in production
- Environment variables:
  - DEEPSEEK_API_KEY (server-side only; never exposed to the client)
  - DEEPSEEK_BASE_URL and DEEPSEEK_MODEL (optional)
  - VITE_AI_BASE_URL (optional override)

Provide a vercel.json that satisfies the routing constraints and a short production checklist.
```

**Output used for:** `/app/vercel.json` routing rules + production deployment readiness checklist.

---

## 10. AI Tool Citations

In accordance with CPT208 Generative AI Permissions policy (mandatory citation requirement for Portfolio, System & Video Demo submissions).

---

### Formal Citations

**[1]** DeepSeek API, `deepseek-chat` model, accessed March–May 2026, available at https://platform.deepseek.com. Used as the runtime AI engine for the system's four AI-powered features: draft rewriting, prompt suggestions, alert explanations, and AI Knight discussion contributions. Integrated via Vercel Functions.

**[2]** Gemini 3.1 Pro , via Google AI Studio, accessed March–May 2026, available at https://aistudio.google.com. Used for design brainstorming, user persona generation, medieval theme conceptualization, poster content drafting, user journey map narration, and README.md documentation writing.

**[3]** Claude Code (Claude Opus 4.7 / Sonnet 4.6), v4.x, accessed March–May 2026, available at https://claude.ai. Used for vibe coding the system's full codebase: project scaffolding (Vite + React + TypeScript + Tailwind), repository pattern implementation, all React page components (Room, Facilitator, AiGuardianPanel, etc.), AI client service abstraction, Guardian NLP module, virtual list utility, Vitest integration tests (30+ flows), unit tests, ESLint/TypeScript configuration, and Vercel deployment setup.

---

### Usage Summary

| Phase | Tool | Contribution |
|-------|------|-------------|
| Research & Ideation | Gemini 3.1 Pro | Personas, user journey, theme exploration, poster content |
| Architecture & Design | Gemini 3.1 Pro + Claude Code | Component tree, design system, naming conventions |
| Implementation | Claude Code | All source code (pages, components, repos, services, libs) |
| Runtime AI | DeepSeek API | Draft rewrite, prompt suggestions, alert explanations, AI Knight weave |
| Testing | Claude Code | Integration flows, unit tests, test infrastructure |
| Documentation | Gemini 3.1 Pro + Claude Code | README, AI logs, inline documentation |

---

### AI Log Completeness Statement

The prompts documented in this file represent the primary prompts used to generate core components of the Round Table system. Per CPT208 mandatory requirements (Portfolio, System & Video Demo section), this log explains:

1. **What prompts were used to generate the core logic** — Exact system prompts, user messages, and temperature settings for all AI integrations
2. **How we verified the code met user requirements** — TypeScript, ESLint, Vitest (30+ tests), manual UI verification, cross-browser testing
3. **Ethical considerations regarding AI-generated code** — Accessibility, bias mitigation, AI transparency, data privacy, academic integrity, fairness controls

The core design logic, user research findings, human-centric justifications, and all design decisions remain the group's original work. AI tools were used for coding assistance (vibe coding) and content drafting within the scope permitted by CPT208 policy.

---

*— End of AI Vibe Coding Log —*
