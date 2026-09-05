import {
  contracts,
  validateRequestJson,
  type ContractKind,
} from "./contract.js";
import { escapeHtml, json } from "./ui.js";

const samples = {
  rsvp: { memberId: "member-1", eventId: "event-1" },
  event: {
    id: "event-1",
    title: "  Weekend gathering  ",
    startsAt: "2026-09-12T10:00Z",
    endsAt: "2026-09-12T12:00Z",
  },
};
let kind: ContractKind = "rsvp";
const drafts = {
  rsvp: JSON.stringify(samples.rsvp, null, 2),
  event: JSON.stringify(samples.event, null, 2),
};
let result: ReturnType<typeof validateRequestJson> | undefined;
const labels = {
  accepted: "Contract accepted",
  rejected: "Contract rejected",
  "invalid-json": "Invalid JSON",
  decoded: "Contract accepted · Event decoded",
  "domain-rejected": "Contract accepted · Domain rejected",
};
export function contractPanel() {
  const isEvent = kind === "event";
  return `<section class="contract-lab" aria-label="Contract lab"><span class="eyebrow">DERIVED FROM THE MODEL</span><h2>${isEvent ? "A contract is the beginning." : "One request. Two validators."}</h2><p>${isEvent ? "The Event API contract combines Represent structure with the existing Zod timestamp schema. Ajv checks JSON first; the actual Event decoder then normalizes the title, converts timestamps to Dates, and checks domain rules." : "Represent defines the RSVP request once. Its JSON Schema adapter produces the contract below; Ajv uses that artifact to validate JSON independently of Represent's parser."}</p><label for="contract-kind">Representation</label><select id="contract-kind"><option value="rsvp" ${!isEvent ? "selected" : ""}>RSVP request</option><option value="event" ${isEvent ? "selected" : ""}>Event API</option></select><div class="contract-grid"><div><label for="contract-request">${isEvent ? "Event API" : "RSVP request"} JSON</label><textarea id="contract-request" rows="11" spellcheck="false">${escapeHtml(drafts[kind])}</textarea><button type="button" id="validate-contract">${isEvent ? "Validate and decode" : "Validate request"}</button><div role="status" class="contract-result">${result ? `<strong>${labels[result.status]}</strong><ul>${result.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>${result.status === "decoded" ? `<h3>Decoded Event</h3><pre>${json(result.decoded)}</pre><p class="muted">Timestamps are Date objects in the decoded value; JSON display renders them as ISO strings.</p>` : ""}` : isEvent ? "Try the padded title, whitespace alone, an invalid timestamp, or an end time before the start." : "Try removing eventId, leaving an identifier empty, or adding an extra field."}</div><p class="muted">${isEvent ? "Decoding runs the Event's real validation. Nothing is saved." : "This checks the request's shape. It does not look up members, check deadlines, execute a signup, or save data."}</p></div><details open><summary>Generated JSON Schema · 2020-12</summary><pre>${json(contracts[kind])}</pre></details></div></section>`;
}
export function bindContract(render: () => void) {
  const select = document.querySelector<HTMLSelectElement>("#contract-kind");
  select?.addEventListener("change", () => {
    if (select.value !== "rsvp" && select.value !== "event") return;
    kind = select.value;
    result = undefined;
    render();
    document.querySelector<HTMLSelectElement>("#contract-kind")?.focus();
  });
  const input =
    document.querySelector<HTMLTextAreaElement>("#contract-request");
  input?.addEventListener("input", () => {
    drafts[kind] = input.value;
    result = undefined;
    const status = document.querySelector(".contract-result");
    if (status) status.textContent = "Request changed. Validate again.";
  });
  document
    .querySelector("#validate-contract")
    ?.addEventListener("click", () => {
      result = validateRequestJson(drafts[kind], kind);
      render();
      document.querySelector<HTMLButtonElement>("#validate-contract")?.focus();
    });
}
