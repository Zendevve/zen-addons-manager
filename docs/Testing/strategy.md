# Testing Strategy

Test approach and roadmap for Zen Addons Manager.

---

## Current State

> [!WARNING]
> No automated test infrastructure currently exists.

Manual testing is currently performed for:
- Install/update/remove addon operations
- GitHub search and clone
- Multi-installation switching
- Cross-platform file operations

---

## Target Test Levels

### Unit Tests
**Scope**: Pure functions and utilities
**Examples**:
- `parseTocFile()` — TOC parsing logic
- `mapInterfaceToVersion()` — Version detection
- `parseGithubUrl()` — URL parsing

**Framework**: Vitest (Vite-native)

### Integration Tests
**Scope**: Main process IPC handlers with real file system
**Examples**:
- Install addon from zip to temp directory
- Clone repository and verify structure
- Enable/disable addon (folder rename)

**Framework**: Vitest + temp directories

### E2E Tests
**Scope**: Full user flows through the UI
**Examples**:
- Complete addon installation from browse → manage
- Multi-installation management
- Drag-drop zip installation

**Framework**: Playwright or Spectron

---

## Testing Principles (MCAF)

1. **Prefer integration over mocks** — Test real file operations, real Git
2. **No mocking internal systems** — File system, IPC must be real
3. **External services** — GitHub API may use recorded fixtures
4. **Real containers when possible** — For future database/service needs

---

## Proposed Test Structure

```
tests/
├── unit/
│   ├── toc-parser.test.ts
│   ├── version-mapper.test.ts
│   └── url-parser.test.ts
├── integration/
│   ├── addon-install.test.ts
│   ├── git-operations.test.ts
│   └── file-operations.test.ts
└── e2e/
    ├── browse-install.test.ts
    └── manage-addons.test.ts
```

---

## Implementation Roadmap

### Phase 1: Unit Tests
- [ ] Set up Vitest configuration
- [ ] Add tests for pure utility functions
- [ ] Integrate with `npm test` command

### Phase 2: Integration Tests
- [ ] Create test harness for main process
- [ ] Add temp directory management
- [ ] Test file operations in isolation

### Phase 3: E2E Tests
- [ ] Set up Playwright for Electron
- [ ] Create test fixtures (sample addons)
- [ ] Add critical path tests

---

## Running Tests (Future)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

---

## Coverage Goals

| Category | Target |
|----------|--------|
| Unit (utilities) | 80%+ |
| Integration (IPC handlers) | 70%+ |
| E2E (critical paths) | Key flows covered |
