# AGENTS.md

## Project Overview

A single-page todo list app — tasks, calendar, kanban board and a Pomodoro timer —
built with vanilla JavaScript. It is **fully client-side**: there is no backend,
no database and no build step. All data lives in the browser's `localStorage`.

- **Live site:** <https://todo-list-afolabi.netlify.app>
- **Repository:** <https://github.com/Aphoe4x/todo-list>
- **Default branch:** `master` — every push deploys to production

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6), HTML5, CSS3 with custom properties
- **Icons:** Font Awesome 6.4 (CDN)
- **Hosting:** Netlify (static)
- **CI/CD:** GitHub Actions → Netlify

No frameworks, no bundler, no package dependencies. Do not introduce them.

## File Structure

```
todo-list/
├── index.html                  # App shell: Tasks, Calendar, Board, Timer tabs
├── css/
│   └── style.css               # All styles (light/dark themes, responsive)
├── js/
│   └── app.js                  # All application logic
├── .github/
│   └── workflows/
│       └── deploy.yml          # Push to master → deploy to Netlify
├── README.md                   # Human-facing docs
└── AGENTS.md                   # This file
```

Anything else at the root (`portfolio-clone/`, `portfolio-rs/`, `portfolio-static/`,
`setup-portfolio.bat`, `package-lock.json`) is unrelated scratch work and is **not**
part of this app. Do not deploy or refactor it.

## Data Model

Everything is stored in `localStorage` under three keys:

| Key | Contents |
|---|---|
| `todos` | Array of task objects (see below) |
| `theme` | `"light"` or `"dark"` |
| `pomodoroStats` | `{ sessions, totalMinutes }` |

A task object:

```js
{
  id: 1700000000000,        // Date.now() — number, not a string
  text: "Task name",
  priority: "low" | "medium" | "high",
  completed: false,         // boolean
  dueDate: "2026-12-31",    // "YYYY-MM-DD" or null
  subtasks: [               // nested, one level deep
    { id: 1700000000001, text: "Step one", completed: false }
  ],
  status: "backlog" | "progress" | "done",
  createdAt: "2026-11-14T18:00:00.000Z"   // ISO string
}
```

State is held in a module-level `todos` array in `js/app.js` and written back with
`saveTodos()`. There is no server sync — a task added on one device is invisible
on another.

## Features

- Add, edit, complete and delete tasks; priorities and due dates
- Subtasks (add, toggle, delete)
- Filters: all / active / completed, plus filter-by-priority
- Calendar tab — tasks grouped by `dueDate`
- Board tab — drag and drop between backlog / progress / done (updates `status`)
- Timer tab — Pomodoro with session statistics
- Dark mode, persisted via `localStorage`
- Responsive down to phone widths

## Local Development

There is nothing to build or install.

**XAMPP:** the project lives at `C:\xampp\htdocs\todo-list`. Start Apache, then open
<http://localhost/todo-list/>.

**Or** just open `index.html` directly in a browser.

After editing, hard-refresh (`Ctrl+Shift+R`) — `index.html` links its assets with
`?v=2` query strings, so bump the version when changing `style.css` or `app.js`:

```html
<link rel="stylesheet" href="css/style.css?v=3">
<script src="js/app.js?v=3"></script>
```

## Deployment

Netlify site: `todo-list-afolabi` (`https://todo-list-afolabi.netlify.app`).

`.github/workflows/deploy.yml` copies `index.html`, `css/` and `js/` into `dist/` and
runs `netlify deploy --prod`. It needs two repository secrets, already configured:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Manual deploy from the project root:

```bash
netlify deploy --prod --dir=dist
```

The local folder is linked to the site via `.netlify/state.json` (git-ignored).

## Testing Rules

There is no API to test. After any change, verify manually (or with a headless
browser) that:

1. The page loads with **no console errors** and no failed requests
2. A task can be added, and it still appears after a page reload
3. Toggling complete, deleting a task, and adding a subtask all persist
4. The Calendar, Board and Timer tabs still work
5. Dark mode toggle survives a reload
6. No horizontal overflow at 1440px, 390px and 320px widths

Quick sanity check that the site is serving:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost/todo-list/
```

## Development Guidelines

- Keep it vanilla — no frameworks, no npm dependencies, no build step
- Keep `index.html` valid HTML (it is not a PHP file; it must stay `.html` so static hosts serve it)
- Persist every mutation through `saveTodos()` so a refresh never loses data
- Escape user text before inserting into `innerHTML`
- Keep the light/dark themes in sync — use the existing CSS custom properties
- Test at desktop and phone widths before pushing

## History

This repo previously contained an unused PHP/PostgreSQL backend (`api/`, `db/`,
`Dockerfile`, `render.yaml`) intended for cross-device sync. The frontend never
called it, and it caused failed deployments on Render. It was removed. If sync is
ever wanted, build it properly (e.g. Netlify Functions + a hosted Postgres) and wire
the frontend to it — do not resurrect those files.
