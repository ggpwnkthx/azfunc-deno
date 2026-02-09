export function joinPosix(...parts: string[]): string {
  return parts
    .map((p) => p.replaceAll("\\", "/").replaceAll(/\/+$/g, ""))
    .filter((p) => p.length > 0)
    .join("/")
    .replaceAll(/\/{2,}/g, "/");
}
