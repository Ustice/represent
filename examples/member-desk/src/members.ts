import {
  memberExchange,
  member,
  memberGraph,
  profileFor,
  readDirectory,
  sampleMembers,
  representationDescriptions,
  type Member,
} from "./model.js";
import { exportRoster } from "./roster.js";
import { element, escapeHtml, json, dateLabel, showError } from "./ui.js";
import { renderPage, download } from "./shell.js";

const storageKey = "represent.fieldwork.members.v1";
let notice = "";
let members = loadMembers();
let selectedId = members[0]?.id ?? "mem_01";
let view: "profile" | "api" | "csv" | "graph" = "profile";
const drafts = new Map<string, ReturnType<typeof formValue>>();
const apiDrafts = new Map<string, string>();

function loadMembers() {
  try {
    const saved = localStorage.getItem(storageKey);
    const input: unknown = saved ? JSON.parse(saved) : null;
    return input ? readDirectory(input) : sampleMembers;
  } catch {
    notice = "Saved members could not be opened. Showing the sample directory.";
    return sampleMembers;
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");

function selectedMember() {
  const selected = members.find(({ id }) => id === selectedId);
  if (!selected) throw new Error("The selected member is missing.");
  return selected;
}

function profilePanel(value: Member) {
  const profile = profileFor.convert(value);
  return `<div class="panel-heading"><div><span class="eyebrow">COMMUNITY VIEW</span><h2>A little less, on purpose.</h2></div><span class="pill">Public</span></div>
    <p class="muted panel-intro">The profile shares a name, role, and join date. Email and membership status stay in the directory.</p>
    <article class="profile-card" aria-label="Public member profile">
      <div class="profile-cover"><span>fieldwork / community</span><span class="cover-mark" aria-hidden="true">✳</span></div>
      <div class="profile-body"><div class="avatar large">${escapeHtml(initials(profile.name))}</div><span class="role-tag">${escapeHtml(profile.role)}</span><h3>${escapeHtml(profile.name)}</h3><p>Part of the Fieldwork community.</p><div class="joined"><span class="little-dot"></span>Joined ${dateLabel(new Date(profile.joinedAt))}</div></div>
      <div class="profile-foot">A shared space for people who make things.</div>
    </article>
    <details class="data-details"><summary>View public profile data <span>JSON ↗</span></summary><pre>${json(profile)}</pre></details>
    <div class="route-note"><span class="route-symbol">↳</span><div><strong>One record, two conversions</strong><p>Member → Member API → Public profile</p></div></div>`;
}

function apiPanel(value: Member) {
  const payload = memberExchange.encode.convert(value);
  const exportUrl = download(
    JSON.stringify(payload, null, 2),
    "application/json",
  );
  return `<div class="panel-heading"><div><span class="eyebrow">DATA EXCHANGE</span><h2>A record that travels.</h2></div><span class="pill">JSON</span></div>
    <p class="muted panel-intro">Dates become ISO strings for storage and export. Edit a payload below to try importing a change.</p>
    <label for="api-payload" class="payload-label">Member API payload</label>
    <textarea id="api-payload" class="code-input" spellcheck="false">${escapeHtml(apiDrafts.get(value.id) ?? JSON.stringify(payload, null, 2))}</textarea>
    <div class="api-actions"><button class="button primary" id="apply-api">Validate &amp; apply</button><a class="button secondary" id="download" href="${exportUrl}" download="${escapeHtml(value.id)}.json">Download JSON <span aria-hidden="true">↓</span></a></div>
    <div class="inline-error" id="api-error" role="alert" hidden></div>
    <div class="route-note"><span class="route-symbol">↔</span><div><strong>Dates come back as Dates</strong><p>Imported data is validated before it updates the member.</p></div></div>`;
}

function csvPanel() {
  const roster = exportRoster(members);
  const exportUrl = download(roster.csv, "text/csv;charset=utf-8");
  return `<div class="panel-heading"><div><span class="eyebrow">DIRECTORY EXPORT</span><h2>Your people, in a spreadsheet.</h2></div><span class="pill">CSV</span></div>
    <p class="muted panel-intro">All ${roster.rows.length} saved members, including email and membership status. Join dates use the UTC day. Save any edits before exporting.</p>
    <div class="roster-scroll" role="region" aria-label="Saved roster preview" tabindex="0"><table class="roster-table"><caption>All saved members</caption><thead><tr>${roster.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${roster.rows.map((row) => `<tr>${roster.columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="api-actions"><a class="button primary" id="download-csv" href="${exportUrl}" download="fieldwork-roster.csv">Download roster CSV <span aria-hidden="true">↓</span></a><span class="private-label">Includes private fields</span></div>
    <details class="data-details"><summary>View exported text <span>CSV ↗</span></summary><pre>${escapeHtml(roster.csv)}</pre></details>
    <div class="route-note"><span class="route-symbol">↳</span><div><strong>A roster for sharing with your team</strong><p>Time of day is omitted. Formula-like text gets an apostrophe prefix in the file.</p></div></div>`;
}

function graphPanel() {
  return `<div class="panel-heading"><div><span class="eyebrow">REPRESENT IN THIS APP</span><h2>Follow the record.</h2></div><span class="pill">${memberGraph.nodes.length} views</span></div>
    <p class="muted panel-intro">These connections come from the conversions the application actually runs.</p>
    <div class="graph-nodes">${memberGraph.nodes.map((node, index) => `<div class="graph-node"><span class="node-index">0${index + 1}</span><strong>${escapeHtml(node.name)}</strong><span>${escapeHtml(representationDescriptions.get(node.name) ?? "")}</span></div>`).join("")}</div>
    <div class="edge-list">${memberGraph.edges.map((edge) => `<div class="edge"><span aria-hidden="true">↗</span><div><strong>${escapeHtml(edge.name)}</strong><p>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</p></div></div>`).join("")}</div>
    <div class="graph-caption">The API codec supplies both directions. Public profiles omit email; roster rows keep only the UTC day. Neither has a reverse conversion.</div>`;
}

export function renderMembers() {
  const current = selectedMember();
  const fields =
    drafts.get(selectedId) ?? memberExchange.encode.convert(current);
  const activeCount = members.filter(
    ({ status }) => status === "Active",
  ).length;
  renderPage(
    "Members",
    () => `    <div class="page-heading"><div><span class="eyebrow">PEOPLE &amp; CONNECTIONS</span><h1>Member directory<span>.</span></h1><p>One place for your people. The right view for everyone else.</p></div><button class="button secondary reset-button" id="reset">Reset sample</button></div>
    <div class="notice" role="status" ${notice ? "" : "hidden"}>${escapeHtml(notice)}</div>
    <section class="directory" aria-label="Members"><div class="directory-heading"><h2>Your community <span>${members.length} members</span></h2><span>${activeCount} active <span class="subtle-separator">·</span> ${members.length - activeCount} invited</span></div><div class="member-list">${members.map((value, index) => `<button class="member-row ${value.id === selectedId ? "is-selected" : ""}" data-member="${escapeHtml(value.id)}" aria-pressed="${value.id === selectedId}"><span class="avatar tone-${index % 3}">${escapeHtml(initials(value.name))}</span><span class="member-name"><strong>${escapeHtml(value.name)}</strong><small>${escapeHtml(value.role)}</small></span><span class="status ${value.status.toLowerCase()}"><span></span>${escapeHtml(value.status)}</span><span class="row-arrow" aria-hidden="true">↗</span></button>`).join("")}</div></section>
    <div class="work-area"><section class="editor panel"><div class="panel-heading"><div><span class="eyebrow">DIRECTORY RECORD</span><h2>Member details</h2></div><span class="private-label">Private</span></div>
    <form id="member-form" novalidate><label for="name">Full name</label><input id="name" name="name" value="${escapeHtml(fields.name)}" autocomplete="off" required />
    <label for="email">Email address <span class="field-note">Only in your directory</span></label><input id="email" name="email" type="email" value="${escapeHtml(fields.email)}" autocomplete="off" required />
    <div class="form-pair"><div><label for="role">Community role</label><select id="role" name="role"><option ${fields.role === "Member" ? "selected" : ""}>Member</option><option ${fields.role === "Organizer" ? "selected" : ""}>Organizer</option></select></div><div><label for="status">Membership</label><select id="status" name="status"><option ${fields.status === "Active" ? "selected" : ""}>Active</option><option ${fields.status === "Invited" ? "selected" : ""}>Invited</option></select></div></div>
    <label for="joined-at">Joined at <span class="field-note">UTC</span></label><input id="joined-at" name="joinedAt" type="text" value="${escapeHtml(fields.joinedAt)}" aria-describedby="date-hint" /><small id="date-hint" class="input-hint">ISO date and time, including a timezone.</small>
    <div class="inline-error" id="form-error" role="alert" hidden></div><div class="form-footer"><button type="submit" id="save" class="button primary">Save changes <span aria-hidden="true">↗</span></button><span id="edit-status">${drafts.has(selectedId) ? "Unsaved changes" : "Saved in this browser"}</span></div></form>
    <div class="editor-note"><span aria-hidden="true">↳</span> Save once. The public profile and export update together.</div></section>
    <section class="preview panel" aria-label="Member representations"><div class="tabs" role="group" aria-label="Representation"><button aria-pressed="${view === "profile"}" data-view="profile">Public profile</button><button aria-pressed="${view === "api"}" data-view="api">API payload</button><button aria-pressed="${view === "csv"}" data-view="csv">Roster CSV</button><button aria-pressed="${view === "graph"}" data-view="graph">Connections</button></div><div class="preview-content">${view === "profile" ? profilePanel(current) : view === "api" ? apiPanel(current) : view === "csv" ? csvPanel() : graphPanel()}</div></section></div>
  `,
  );
  bindEvents();
}

function save(value: Member) {
  if (value.id !== selectedId)
    throw new Error("The member ID must match the selected member.");
  const next = members.map((item) => (item.id === selectedId ? value : item));
  localStorage.setItem(
    storageKey,
    JSON.stringify(next.map((item) => memberExchange.encode.convert(item))),
  );
  members = next;
  drafts.delete(selectedId);
  apiDrafts.delete(selectedId);
  notice = `${value.name} saved. Profile and exports are up to date.`;
  renderMembers();
}

function formValue() {
  return {
    id: selectedId,
    name: element<HTMLInputElement>("#name").value,
    email: element<HTMLInputElement>("#email").value,
    role: element<HTMLSelectElement>("#role").value,
    status: element<HTMLSelectElement>("#status").value,
    joinedAt: element<HTMLInputElement>("#joined-at").value,
  };
}

function bindEvents() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-member]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        selectedId = button.dataset.member ?? selectedId;
        notice = "";
        renderMembers();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-view]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const next = button.dataset.view;
        if (
          next === "profile" ||
          next === "api" ||
          next === "csv" ||
          next === "graph"
        )
          view = next;
        renderMembers();
      }),
    );
  const form = element<HTMLFormElement>("#member-form");
  form.addEventListener("input", () => {
    drafts.set(selectedId, formValue());
    element("#edit-status").textContent = "Unsaved changes";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      save(memberExchange.decode.run(formValue()));
    } catch (error) {
      showError("#form-error", error);
    }
  });
  document.querySelector("#api-payload")?.addEventListener("input", () => {
    apiDrafts.set(
      selectedId,
      element<HTMLTextAreaElement>("#api-payload").value,
    );
  });
  document.querySelector("#apply-api")?.addEventListener("click", () => {
    try {
      const input: unknown = JSON.parse(
        element<HTMLTextAreaElement>("#api-payload").value,
      );
      save(memberExchange.decode.run(input));
    } catch (error) {
      showError("#api-error", error);
    }
  });
  element("#reset").addEventListener("click", () => {
    try {
      localStorage.removeItem(storageKey);
      drafts.clear();
      apiDrafts.clear();
      members = sampleMembers.map((value) => member.parse(value));
      selectedId = members[0]?.id ?? "mem_01";
      notice = "Sample directory restored.";
      renderMembers();
    } catch (error) {
      showError("#form-error", error);
    }
  });
}
