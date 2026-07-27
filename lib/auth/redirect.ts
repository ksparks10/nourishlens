export function safeInternalPath(value: string | null, fallback = "/app") {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : fallback;
}
