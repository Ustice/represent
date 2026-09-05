import { rsvpContract, validateRequestJson } from "./contract.js";
import { escapeHtml, json } from "./ui.js";

let source = JSON.stringify(
  { memberId: "member-1", eventId: "event-1" },
  null,
  2,
);
let result: ReturnType<typeof validateRequestJson> | undefined;
export function contractPanel() {
  return `<section class="contract-lab" aria-label="Contract lab"><span class="eyebrow">DERIVED FROM THE MODEL</span><h2>One request. Two validators.</h2><p>Represent defines the RSVP request once. Its JSON Schema adapter produces the contract below; Ajv uses that artifact to validate JSON independently of Represent's parser.</p><div class="contract-grid"><div><label for="contract-request">RSVP request JSON</label><textarea id="contract-request" rows="9" spellcheck="false">${escapeHtml(source)}</textarea><button type="button" id="validate-contract">Validate request</button><div role="status" class="contract-result">${result ? `<strong>${result.status === "accepted" ? "Contract accepted" : result.status === "rejected" ? "Contract rejected" : "Invalid JSON"}</strong><ul>${result.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>` : "Try removing eventId, leaving an identifier empty, or adding an extra field."}</div><p class="muted">This checks the request's shape. It does not look up members, check deadlines, execute a signup, or save data.</p></div><details open><summary>Generated JSON Schema · 2020-12</summary><pre>${json(rsvpContract)}</pre></details></div></section>`;
}
export function bindContract(render: () => void) {
  const input =
    document.querySelector<HTMLTextAreaElement>("#contract-request");
  input?.addEventListener("input", () => {
    source = input.value;
    result = undefined;
    const status = document.querySelector(".contract-result");
    if (status) status.textContent = "Request changed. Validate again.";
  });
  document
    .querySelector("#validate-contract")
    ?.addEventListener("click", () => {
      result = validateRequestJson(source);
      render();
      document.querySelector<HTMLButtonElement>("#validate-contract")?.focus();
    });
}
