# Development Setup

Get Zen Addons Manager running locally.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Git | 2.30+ | For addon Git features |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Zendevve/zen-addons-manager.git
cd zen-addons-manager

# Install dependencies
npm install

# Start development mode
npm start
```

This launches:
- Vite dev server at `http://localhost:5173`
- Electron app connected to the dev server

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Electron + Vite development |
| `npm run dev` | Start Vite dev server only |
| `npm run electron:dev` | Full Electron development mode |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint (zero warnings policy) |
| `npm run preview` | Preview production build |

---

## Project Structure

```
zen-addons-manager/
├── electron/           # Main process (Node.js)
│   ├── main.ts         # Entry point, IPC handlers
│   └── preload.ts      # IPC bridge
├── src/                # Renderer process (React)
│   ├── components/     # UI components
│   ├── pages/          # Route components
│   ├── services/       # Business logic
│   └── types/          # TypeScript interfaces
├── docs/               # Documentation (MCAF)
└── AGENTS.md           # AI agent rules
```

---

## Development Tips

### Hot Reload
- React changes hot-reload automatically
- Main process changes require restart (`npm start` again)

### Debugging
- **Renderer**: DevTools (Ctrl+Shift+I in app)
- **Main**: VSCode "Attach to Main Process" configuration

### Path Alias
Use `@/` for src imports:
```typescript
import { Button } from '@/components/ui/button';
```

---

## Building for Production

```bash
# Full build (main + renderer + package)
npm run build
```

Output: `dist/` (compiled assets) and installer in project root.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Electron won't start | Delete `node_modules`, run `npm install` |
| Port 5173 in use | Kill existing Vite process or change port |
| Git operations fail | Ensure Git is installed and in PATH |
