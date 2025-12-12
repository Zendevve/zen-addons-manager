# ADR-001: Secure Electron Architecture

**Status**: Accepted
**Date**: 2024 (retroactive)

---

## Context

Electron applications have historically been vulnerable to security issues when Node.js APIs are exposed directly to the renderer process. A compromised renderer (via XSS or malicious content) could access the file system, spawn processes, or perform other dangerous operations.

Zen Addons Manager requires:
- File system access (read/write addons)
- Git operations (clone, pull)
- Process spawning (launch games)
- Network requests (GitHub API)

---

## Decision

Implement a **secure, context-isolated architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                        │
│  React + TypeScript (src/)                                 │
│  NO Node.js, NO require(), NO file system                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC (invoke/handle)
┌─────────────────────────▼───────────────────────────────────┐
│                     Preload Script                          │
│  electron/preload.ts                                       │
│  contextBridge.exposeInMainWorld('electronAPI', {...})     │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC (invoke/handle)
┌─────────────────────────▼───────────────────────────────────┐
│                     Main Process                            │
│  electron/main.ts                                          │
│  Full Node.js: fs, child_process, simple-git, axios        │
└─────────────────────────────────────────────────────────────┘
```

**Configuration**:
```typescript
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,     // No Node.js in renderer
    contextIsolation: true,     // Isolated contexts
    preload: path.join(__dirname, 'preload.js')
  }
});
```

---

## Consequences

### Positive
- Renderer cannot directly access Node.js APIs even if compromised
- Clear separation between UI logic and system operations
- Type-safe IPC through `electronService` wrapper
- Easier to audit security-sensitive code (all in main.ts)

### Negative
- More boilerplate for each new IPC channel
- Must explicitly expose each API through preload
- Slightly more complex debugging (two process contexts)

---

## References

- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [ADR-002: IPC Bridge Pattern](002-ipc-bridge-pattern.md)
