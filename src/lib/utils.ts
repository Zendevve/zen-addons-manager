import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidGithubUsername(username: string): boolean {
  // GitHub username rules:
  // 1. Alphanumeric and single hyphens
  // 2. Cannot begin or end with a hyphen
  // 3. Max length 39 characters
  // 4. No spaces
  if (!username || username.length > 39 || username.includes(' ')) return false

  // Check for invalid characters (anything not a-z, A-Z, 0-9, -)
  if (!/^[a-zA-Z0-9-]+$/.test(username)) return false

  // Check for leading/trailing hyphens or double hyphens
  if (username.startsWith('-') || username.endsWith('-') || username.includes('--')) return false

  return true
}
