export function element<Element extends HTMLElement>(selector: string) {
  const found = document.querySelector<Element>(selector);
  if (!found) throw new Error(`Missing application element: ${selector}`);
  return found;
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
export const json = (value: unknown) =>
  escapeHtml(JSON.stringify(value, null, 2));
export const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

export function showError(selector: string, error: unknown) {
  const target = element(selector);
  target.hidden = false;
  target.textContent =
    error instanceof Error ? error.message : "The change could not be saved.";
}
