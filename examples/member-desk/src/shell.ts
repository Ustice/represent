import { element } from "./ui.js";

const downloads = new Set<string>();
export function download(content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  downloads.add(url);
  return url;
}

export function renderPage(
  section: "Members" | "Events",
  content: () => string,
) {
  const focused = document.activeElement;
  const selector =
    focused instanceof HTMLElement
      ? focused.id
        ? `#${CSS.escape(focused.id)}`
        : ["view", "member", "event"].flatMap((key) =>
            focused.dataset[key]
              ? [`[data-${key}="${CSS.escape(focused.dataset[key])}"]`]
              : [],
          )[0]
      : undefined;
  for (const url of downloads) URL.revokeObjectURL(url);
  downloads.clear();
  element("#app").innerHTML = `<div class="shell">
    <aside class="sidebar"><a class="brand" href="#members" aria-label="Fieldwork home"><span class="brand-mark">f.</span>fieldwork</a><div class="workspace-label">COMMUNITY WORKSPACE</div>
    <nav class="workspace-nav" aria-label="Workspace"><a class="nav-item ${section === "Members" ? "selected" : ""}" href="#members" ${section === "Members" ? 'aria-current="page"' : ""}><span aria-hidden="true">◉</span> Members</a><a class="nav-item ${section === "Events" ? "selected" : ""}" href="#events" ${section === "Events" ? 'aria-current="page"' : ""}><span aria-hidden="true">▦</span> Events</a></nav>
    <div class="sidebar-bottom"><span class="tiny-mark">r</span><div>Built with Represent<small>A working example</small></div></div></aside>
    <main><header class="topbar"><span>Workspace <span class="breadcrumb-slash">/</span> <strong>${section}</strong></span><span class="demo-badge"><span class="little-dot"></span>Local demo</span></header>
    ${content()}
    <footer class="page-footer"><span>Fieldwork is a fictional community. All sample data is synthetic.</span><span>Local storage only · No server</span></footer></main></div>`;
  if (selector) document.querySelector<HTMLElement>(selector)?.focus();
}
