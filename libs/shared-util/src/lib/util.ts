export function createUUID(): string {
  return crypto.randomUUID();
}

export function getCookie(name: string): string | null {
  return (
    document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + '='))
      ?.substring(name.length + 1) ?? null
  );
}
