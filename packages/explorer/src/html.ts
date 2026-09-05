import type { GraphItem } from "@represent/core";
export const escape = (value: string) =>
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
export const json = (value: unknown) => escape(JSON.stringify(value, null, 2));
const icons = {
  representation: "◫",
  conversion: "⇄",
  operation: "▶",
  reference: "⌁",
} as const;
export const identity = (item: GraphItem) =>
  `<span class="rx-kind"><span aria-hidden="true">${icons[item.kind]}</span> ${item.kind}</span><strong>${escape(item.name)}</strong>`;
