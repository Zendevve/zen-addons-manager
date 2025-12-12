# AGENTS.md — Zen Addons Manager

This document defines how AI coding agents work in this repository.

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Name** | Zen Addons Manager |
| **Purpose** | World of Warcraft addon manager with Git/GitHub integration |
| **Stack** | Electron 29, React 18, Vite 5, TypeScript 5, TailwindCSS, Shadcn UI |
| **Architecture** | Secure IPC bridge (Main ↔ Preload ↔ Renderer) |

---

## Commands

```bash
# Development
npm run dev          # Start Vite dev server only
npm start            # Start Electron dev mode (recommended)
npm run electron:dev # Full Electron + Vite development

# Build
npm run build        # Build for production
npm run electron:build # Build Electron main process only

# Code Quality
npm run lint         # ESLint with zero-warning policy
```

---

## Development Flow

When changing code in this repository:

1. **Read first** — Read relevant docs in `docs/` and this AGENTS.md before editing
2. **Plan before heavy coding** — For non-trivial features, create/update feature doc first
3. **Tests and code together** — Write tests alongside implementation (when test infra exists)
4. **Run lint** — `npm run lint` must pass with zero warnings
5. **Update docs** — Keep feature docs and ADRs current with actual behavior

---

## Testing Discipline

> [!NOTE]
> Test infrastructure is not yet established. See `docs/Testing/strategy.md` for the roadmap.

When test infrastructure exists:
- Run new/modified tests first
- Run related feature tests
- Run full test suite before completion

---

## Architecture Boundaries

### Security Model (CRITICAL)
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React/Frontend │ ←IPC→ │  Preload Script │ ←IPC→ │  Main Process   │
│  (No Node.js)   │      │  (Bridge Only)   │      │  (Full Node.js) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

**Hard Rules:**
- **Renderer (src/)**: No direct Node.js, no `require()`, no file system access
- **Preload (electron/preload.ts)**: Only exposes typed IPC methods via `contextBridge`
- **Main (electron/main.ts)**: All Node.js operations (fs, git, child_process)

**IPC Pattern:**
```typescript
// In renderer — use the typed service
import { electronService } from '@/services/electron';
await electronService.getAddons(installationId);

// In main — handler registered in setupIpcHandlers()
ipcMain.handle('get-addons', async (_, installationId) => { ... });
```

---

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types on public functions
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use path alias `@/` for src imports

### React
- Functional components only
- Use Shadcn UI components from `@/components/ui/`
- State management via React hooks (no Redux/Zustand)
- Toast notifications via Sonner

### Styling
- TailwindCSS utility classes
- Dark theme by default (neutral color palette)
- Follow existing component patterns in `src/components/ui/`

### File Organization
```
src/
├── components/     # Reusable UI components
│   └── ui/         # Shadcn UI primitives
├── pages/          # Route-level components
├── services/       # Business logic, IPC wrappers
├── types/          # TypeScript interfaces
└── lib/            # Utilities (cn, etc.)
```

---

## Coding Rules

### Do
- Use existing Shadcn UI components before creating new ones
- Parse `.toc` files to get addon metadata (title, version, interface)
- Handle `EXDEV` errors when moving files across drives (copy + delete fallback)
- Use `simple-git` for all Git operations in main process
- Show toast feedback for all user actions

### Don't
- Don't mock internal systems in tests (when testing exists)
- Don't add new dependencies without documenting in ADR
- Don't expose Node.js APIs to renderer process
- Don't use synchronous file operations (`fs.readFileSync`, etc.) in main process
- Don't hardcode WoW installation paths

---

## Self-Learning Rules

When receiving feedback during development:

### Capture Patterns
1. **Directive feedback** ("always do X", "never do Y") → Add to Coding Rules
2. **Preference feedback** (naming, style, verbosity) → Add to Code Style
3. **Process feedback** (workflow, deployment) → Update Development Flow
4. **Correction feedback** (explicit errors) → Add to Don't section

### Update Scope
- **Local pattern** (one feature/module) → Add to feature doc or local AGENTS.md
- **Global pattern** (whole codebase) → Update this root AGENTS.md

### Update Process
1. Propose changes to AGENTS.md in PR description
2. Human reviews and approves
3. Merge becomes the new source of truth

---

## Maintainer Preferences

- **Commit messages**: Conventional Commits format (`feat:`, `fix:`, `refactor:`)
- **PR descriptions**: Include what changed and why
- **Comments**: Explain non-obvious logic, not what code does
- **Error messages**: User-friendly, actionable

---

## Related Documentation

- [Development Setup](docs/Development/setup.md)
- [Testing Strategy](docs/Testing/strategy.md)
- [Architecture Decisions](docs/ADR/)
- [Feature Documentation](docs/Features/)
