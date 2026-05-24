const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d[\s-]?){10,15}\b/g;
const API_KEY_PATTERN = /\b(?:sk|pk|rk|api)[-_][A-Za-z0-9_-]{16,}\b/g;

export function redactPreview(value: string, maxLength = 300) {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(API_KEY_PATTERN, "[redacted-key]")
    .slice(0, maxLength);
}
