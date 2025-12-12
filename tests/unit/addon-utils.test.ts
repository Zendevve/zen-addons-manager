import { describe, it, expect } from 'vitest';
import { mapInterfaceToVersion, parseGithubUrl, parseTocContent } from '../../src/lib/utils/addon-utils';

describe('mapInterfaceToVersion', () => {
  it('maps Vanilla interface versions', () => {
    expect(mapInterfaceToVersion(11200)).toEqual(['1.12']);
    expect(mapInterfaceToVersion(11299)).toEqual(['1.12']);
  });

  it('maps TBC interface versions', () => {
    expect(mapInterfaceToVersion(20400)).toEqual(['2.4.3']);
    expect(mapInterfaceToVersion(20499)).toEqual(['2.4.3']);
  });

  it('maps WotLK interface versions', () => {
    expect(mapInterfaceToVersion(30300)).toEqual(['3.3.5']);
  });

  it('maps Cataclysm interface versions', () => {
    expect(mapInterfaceToVersion(40300)).toEqual(['4.3.4']);
  });

  it('maps MoP interface versions', () => {
    expect(mapInterfaceToVersion(50400)).toEqual(['5.4.8']);
  });

  it('maps Retail/Classic for modern interfaces', () => {
    expect(mapInterfaceToVersion(110000)).toEqual(['retail', 'classic']);
    expect(mapInterfaceToVersion(110002)).toEqual(['retail', 'classic']);
  });

  it('returns empty array for unknown versions', () => {
    expect(mapInterfaceToVersion(10000)).toEqual([]);
    expect(mapInterfaceToVersion(0)).toEqual([]);
  });
});

describe('parseGithubUrl', () => {
  it('parses standard GitHub URLs', () => {
    const result = parseGithubUrl('https://github.com/user/repo');
    expect(result.repoUrl).toBe('https://github.com/user/repo.git');
    expect(result.branch).toBeUndefined();
  });

  it('parses GitHub URLs with .git suffix', () => {
    const result = parseGithubUrl('https://github.com/user/repo.git');
    expect(result.repoUrl).toBe('https://github.com/user/repo.git');
  });

  it('parses GitHub URLs with tree/branch', () => {
    const result = parseGithubUrl('https://github.com/user/repo/tree/develop');
    expect(result.repoUrl).toBe('https://github.com/user/repo.git');
    expect(result.branch).toBe('develop');
  });

  it('parses GitHub URLs with nested tree paths', () => {
    const result = parseGithubUrl('https://github.com/user/repo/tree/feature/some-path');
    expect(result.repoUrl).toBe('https://github.com/user/repo.git');
    expect(result.branch).toBe('feature');
  });

  it('returns original URL for non-GitHub URLs', () => {
    const result = parseGithubUrl('https://gitlab.com/user/repo');
    expect(result.repoUrl).toBe('https://gitlab.com/user/repo');
  });
});

describe('parseTocContent', () => {
  it('parses standard TOC fields', () => {
    const toc = `## Interface: 30300
## Title: My Addon
## Version: 1.0.0
## Author: TestAuthor
## Notes: A test addon`;

    const result = parseTocContent(toc);
    expect(result.title).toBe('My Addon');
    expect(result.version).toBe('1.0.0');
    expect(result.author).toBe('TestAuthor');
    expect(result.description).toBe('A test addon');
    expect(result.interface).toBe(30300);
  });

  it('handles Authors plural field', () => {
    const toc = `## Authors: Author1, Author2`;
    const result = parseTocContent(toc);
    expect(result.author).toBe('Author1, Author2');
  });

  it('handles X-Author fallback', () => {
    const toc = `## X-Author: FallbackAuthor`;
    const result = parseTocContent(toc);
    expect(result.author).toBe('FallbackAuthor');
  });

  it('prefers Author over X-Author', () => {
    const toc = `## Author: MainAuthor
## X-Author: FallbackAuthor`;
    const result = parseTocContent(toc);
    expect(result.author).toBe('MainAuthor');
  });

  it('returns defaults for empty TOC', () => {
    const result = parseTocContent('');
    expect(result.title).toBe('Unknown');
    expect(result.version).toBe('Unknown');
    expect(result.author).toBe('Unknown');
    expect(result.description).toBe('');
    expect(result.interface).toBeUndefined();
  });
});
