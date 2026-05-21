const DANGEROUS_PATH_PATTERNS = [
  /\.\.[/\\]/,
  /\.\.$/,
  /\\\.\.\\/,
  /\0/,
  /[<>"|?*]/,
  /^\/[/\\]/,
  /^[A-Za-z]:[/\\]/,
  /^\\\\/,
];

export function isDangerousPath(filePath: string): boolean {
  for (const pattern of DANGEROUS_PATH_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }
  return false;
}
