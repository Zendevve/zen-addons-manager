# Zen Addons Manager

A clean, minimal World of Warcraft addon manager built with Angular, Tailwind CSS, and Electron.

## Features

- **Clean Interface**: Sidebar navigation (Dashboard, Manage, Browse, Settings)
- **Addon Management**: Install, update, and remove addons
- **Git Support**: Install addons from Git repositories with branch switching
- **Auto-Detection**: Automatically detect WoW installations and addon folders
- **Import/Export**: Backup and share your addon lists
- **Dark Theme**: Calm, tool-like aesthetic with consistent spacing

## Development

### Prerequisites

- Node.js (v18+)
- npm

### Setup

```bash
npm install
```

### Running the App

**Development Mode** (requires two terminals):

```bash
# Terminal 1: Angular dev server
npm start

# Terminal 2: Electron app
npm run electron:start
```

**Production Mode**:

```bash
npm run electron:prod
```

### Building

To create a Windows installer:

```bash
npm run package
```

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── sidebar/          # Left navigation
│   ├── pages/
│   │   ├── dashboard/        # Overview page
│   │   ├── manage/           # Addon management
│   │   ├── browse/           # Addon catalogue
│   │   └── settings/         # App configuration
│   └── services/
│       ├── addon.service.ts  # State management
│       └── electron.service.ts # IPC wrapper
└── styles.css                # Global styles (Tailwind)
```

## Design Philosophy

This app follows strict UX principles:

- **Keep decisions small**: One action per moment
- **Reduce steps**: Auto-detect everything possible
- **Show only what matters**: Hide complexity behind details
- **Predictable navigation**: Always know where you are
- **Quick feedback**: Toast notifications for all actions

See [design_guidelines.md](design_guidelines.md) for full details.
