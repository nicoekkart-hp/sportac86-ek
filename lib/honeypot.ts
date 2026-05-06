// Returns true if the honeypot field was filled in (i.e. the request looks like a bot).
export function isHoneypotTripped(formData: FormData): boolean {
  const value = formData.get("website");
  return typeof value === "string" && value.trim().length > 0;
}
