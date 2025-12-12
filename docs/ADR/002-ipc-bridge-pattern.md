# ADR-002: IPC Bridge Pattern

**Status**: Accepted
**Date**: 2024 (retroactive)

---

## Context

With context isolation enabled (ADR-001), the renderer process needs a way to communicate with the main process for all system operations. We needed a pattern that is:

- Type-safe (TypeScript)
- Easy to extend with new operations
- Consistent across the codebase
- Testable (when test infra exists)

---

## Decision

Use a **typed service wrapper** pattern:

### Layer 1: Preload (Bridge)
```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getAddons: (id: string) => ipcRenderer.invoke('get-addons', id),
  installAddon: (data) => ipcRenderer.invoke('install-addon', data),
  // ... other methods
});
```

### Layer 2: Typed Service
```typescript
// src/services/electron.ts
export const electronService = {
  getAddons: async (installationId: string): Promise<Addon[]> => {
    return window.electronAPI.getAddons(installationId);
  },
  // ... typed wrappers for all operations
};
```

### Layer 3: Main Process Handlers
```typescript
// electron/main.ts
function setupIpcHandlers() {
  ipcMain.handle('get-addons', async (_, installationId: string) => {
    // Implementation with full Node.js access
  });
}
```

---

## Consequences

### Positive
- Full type safety from renderer to main process
- Single source of truth for IPC channel names in `electron.ts`
- Easy to add new operations by following existing pattern
- Renderer code reads cleanly: `await electronService.getAddons(id)`

### Negative
- Three places to update for each new operation (preload, service, handler)
- Channel name strings duplicated between preload and main
- No automatic validation of data crossing IPC boundary

---

## Future Improvements

- Add shared type definitions between main and renderer
- Consider IPC validation layer (zod schemas)
- Generate preload bindings from handler definitions

---

## References

- [ADR-001: Electron Architecture](001-electron-architecture.md)
- [src/services/electron.ts](../../src/services/electron.ts)
- [electron/preload.ts](../../electron/preload.ts)
