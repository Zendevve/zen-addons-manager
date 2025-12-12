/**
 * Utility functions extracted for testing.
 * These are copied from electron/main.ts to enable unit testing
 * without requiring Electron dependencies.
 */

/**
 * Map WoW interface version to version labels
 */
export function mapInterfaceToVersion(interfaceVersion: number): string[] {
  const versions: string[] = [];

  if (interfaceVersion >= 11200 && interfaceVersion < 20000) versions.push('1.12');
  if (interfaceVersion >= 20400 && interfaceVersion < 30000) versions.push('2.4.3');
  if (interfaceVersion >= 30300 && interfaceVersion < 40000) versions.push('3.3.5');
  if (interfaceVersion >= 40300 && interfaceVersion < 50000) versions.push('4.3.4');
  if (interfaceVersion >= 50400 && interfaceVersion < 100000) versions.push('5.4.8');
  if (interfaceVersion >= 110000) {
    versions.push('retail');
    versions.push('classic');
  }

  return versions;
}

/**
 * Parse GitHub URL to extract repo URL and branch
 */
export function parseGithubUrl(url: string): { repoUrl: string; branch?: string } {
  try {
    // Handle standard GitHub URLs with tree/branch
    // Format: https://github.com/user/repo/tree/branch/path...
    const treeMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/);
    if (treeMatch) {
      const [, user, repo, branch] = treeMatch;
      return {
        repoUrl: `https://github.com/${user}/${repo}.git`,
        branch
      };
    }

    // Handle standard URLs without tree
    // Format: https://github.com/user/repo
    const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
    if (repoMatch) {
      const [, user, repo] = repoMatch;
      return {
        repoUrl: `https://github.com/${user}/${repo}.git`
      };
    }

    // Return original if not matched (might be other git host or raw git url)
    return { repoUrl: url };
  } catch {
    return { repoUrl: url };
  }
}

export interface ParsedTocData {
  title: string;
  version: string;
  author: string;
  description: string;
  interface?: number;
}

/**
 * Parse TOC file content and extract metadata
 */
export function parseTocContent(tocContent: string): ParsedTocData {
  const lines = tocContent.split('\n');
  const data: ParsedTocData = {
    title: 'Unknown',
    version: 'Unknown',
    author: 'Unknown',
    description: '',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Title:')) {
      data.title = trimmed.replace('## Title:', '').trim();
    } else if (trimmed.startsWith('## Version:')) {
      data.version = trimmed.replace('## Version:', '').trim();
    } else if (trimmed.startsWith('## Author:') || trimmed.startsWith('## Authors:')) {
      data.author = trimmed.replace(/^## Authors?:/, '').trim();
    } else if (trimmed.startsWith('## X-Author:') || trimmed.startsWith('## X-Authors:')) {
      if (data.author === 'Unknown') {
        data.author = trimmed.replace(/^## X-Authors?:/, '').trim();
      }
    } else if (trimmed.startsWith('## Notes:')) {
      data.description = trimmed.replace('## Notes:', '').trim();
    } else if (trimmed.startsWith('## Interface:')) {
      const interfaceStr = trimmed.replace('## Interface:', '').trim();
      const interfaceNum = parseInt(interfaceStr, 10);
      if (!isNaN(interfaceNum)) {
        data.interface = interfaceNum;
      }
    }
  }

  return data;
}
