<div align="center">

# Zen Addons Manager

<a href="https://github.com/catppuccin/catppuccin/blob/main/LICENSE"><img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/palette/macchiato.png" width="400" alt="Catppuccin Palette"/></a>

### A modern, beautiful World of Warcraft addon manager

[![Catppuccin](https://img.shields.io/badge/catppuccin-mocha-cba6f7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIgZmlsbD0iI2NiYTZmNyIvPgo8L3N2Zz4K)](https://github.com/catppuccin/catppuccin)
[![License](https://img.shields.io/github/license/Zendevve/zen-addons-manager?style=for-the-badge&color=89b4fa)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Development](#-development)

</div>

---

## ✨ Features

### 🎨 **Beautiful Catppuccin Theme**
Soothing pastel colors designed for extended gaming sessions. Built with the Catppuccin Mocha palette for a premium, modern aesthetic.

### 🌍 **Multi-Version WoW Support**
Manage addons across **all** WoW versions:
- Vanilla (1.12)
- The Burning Crusade (2.4.3)
- Wrath of the Lich King (3.3.5)
- Cataclysm (4.3.4)
- Mists of Pandaria (5.4.8)
- Retail

### ⚡ **Lightning Fast Operations**
- **Drag-and-drop** installation - just drop .zip files onto the addon list
- **Bulk operations** - enable, disable, update, or remove multiple addons at once
- **Parallel updates** - update all Git addons simultaneously
- **Smart auto-detection** - finds your WoW installations automatically

### 🎮 **Game Integration**
- **Play time tracking** - see when you last played each WoW installation
- **Direct game launch** - start WoW right from the manager
- **Installation profiles** - switch between WoW versions instantly

### 🐙 **GitHub Integration**
- **Featured addons** - curated list of popular WoW addons on launch
- **GitHub profile pictures** - see addon creators' avatars
- **Smart search** - find any WoW addon from GitHub
- **Git repository support** - install directly from Git with branch switching

### 🎯 **Why Choose Zen Addons Manager?**

| Feature | Zen Addons Manager | Other Managers |
|---------|-------------------|----------------|
| **Multi-version support** | ✅ All WoW versions | ❌ Usually Retail only |
| **Modern UI** | ✅ Catppuccin theme | ⚠️ Dated interfaces |
| **Drag-and-drop** | ✅ Instant install | ❌ Manual file selection |
| **Bulk operations** | ✅ Full support | ⚠️ Limited |
| **GitHub integration** | ✅ Featured addons | ❌ Manual searching |
| **Play time tracking** | ✅ Built-in | ❌ Not available |
| **Lightweight** | ✅ Fast & efficient | ⚠️ Resource heavy |

---

## 📦 Installation

### Windows
Download the latest `.exe` installer from [Releases](https://github.com/Zendevve/zen-addons-manager/releases) and run it.

### Build from Source
```bash
# Clone the repository
git clone https://github.com/Zendevve/zen-addons-manager.git
cd zen-addons-manager

# Install dependencies
npm install

# Build the app
npm run build

# Package for Windows
npm run package
```

---

## 🛠 Development

### Prerequisites
- Node.js (v18+)
- npm

### Setup
```bash
npm install
```

### Running in Development

```bash
# Start the dev server (Vite + React)
npm start

# The Electron app will launch automatically
```

### Building
```bash
# Build for production
npm run build

# Create Windows installer
npm run package
```

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn UI + Catppuccin
- **Desktop**: Electron
- **State**: LocalStorage + React hooks

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Main app layout
│   └── ui/                 # Shadcn UI components
├── pages/
│   ├── Dashboard.tsx       # Home page with stats
│   ├── Manage.tsx          # Addon management
│   ├── Browse.tsx          # Discover addons
│   └── Settings.tsx        # WoW installation config
├── services/
│   ├── electron.ts         # IPC communication
│   └── storage.ts          # LocalStorage wrapper
└── types/
    ├── addon.ts            # Addon interfaces
    └── installation.ts     # WoW installation types

electron/
├── main.ts                 # Electron main process
└── preload.ts              # IPC bridge
```

---

## 🎨 Design Philosophy

Zen Addons Manager follows strict UX principles:

- **Keep decisions small** - One action per moment
- **Reduce cognitive load** - Auto-detect everything possible
- **Show only what matters** - Progressive disclosure
- **Instant feedback** - Toast notifications for all actions
- **Beautiful by default** - Catppuccin aesthetic throughout

---

## 📝 License

[MIT](LICENSE) © 2025 Zendevve

---

<div align="center">

**[⬆ back to top](#zen-addons-manager)**

Made with 💜 using [Catppuccin](https://github.com/catppuccin/catppuccin)

</div>
