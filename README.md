# Todo List

A clean, fast todo app with tasks, a calendar, a kanban board and a Pomodoro timer.

**🔗 Live site: <https://todo-list-afolabi.netlify.app>**

No build step, no framework, no backend — just HTML, CSS and vanilla JavaScript.

---

## Features

- **Tasks** — add, edit, complete and delete tasks with priority (low / medium / high) and due dates
- **Filters** — view all, active, completed, or filter by priority
- **Calendar** — see tasks laid out by due date
- **Board** — drag and drop tasks between backlog / in-progress / done
- **Timer** — Pomodoro timer with session statistics
- **Dark mode** — toggle persisted between visits
- **Responsive** — works on desktop, tablet and phone

## Tech stack

| Layer | Choice |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 with custom properties (light/dark themes) |
| Logic | Vanilla JavaScript (no dependencies) |
| Icons | Font Awesome 6.4 |
| Hosting | Netlify (static) |

## Where the data lives

Tasks, theme and timer statistics are stored in the browser's **`localStorage`**
under the keys `todos`, `theme` and `pomodoroStats`.

This means:

- ✅ It works offline and needs no server or database
- ✅ Data survives refreshes and browser restarts
- ⚠️ Data is **per browser and per device** — it does not sync between devices
- ⚠️ Clearing browser data deletes the tasks

## Running locally

The app is static, so any web server works.

**Option 1 — XAMPP (what this project uses):**

1. Place the folder in `C:\xampp\htdocs\todo-list`
2. Start **Apache** from the XAMPP control panel
3. Open <http://localhost/todo-list/>

**Option 2 — no server at all:**

Just open `index.html` in a browser.

## Deployment

Hosted on Netlify at <https://todo-list-afolabi.netlify.app>.

Every push to `master` deploys automatically via the workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which publishes
`index.html`, `css/` and `js/`.

To deploy manually:

```bash
netlify deploy --prod --dir=dist
```

## Project structure

```
todo-list/
├── index.html          # The whole app shell (Tasks, Calendar, Board, Timer)
├── css/
│   └── style.css       # All styles, light + dark themes, responsive rules
├── js/
│   └── app.js          # All application logic
└── .github/
    └── workflows/
        └── deploy.yml  # Push to master → deploy to Netlify
```

## Notes

This app is fully client-side. An earlier PHP + PostgreSQL backend (`api/`, `db/`,
`Dockerfile`, `render.yaml`) was removed because the frontend never called it — it
was dead weight and the cause of failed deploys on Render.

