# Represent explorer

Part of the experimental `0.1.0-rc.0` candidate. See
[installation and tested scope](https://github.com/Ustice/represent/blob/main/docs/release-candidate.md).

A disposable browser viewer of Represent's public `Graph` data. It has no
Fieldwork imports and does not inspect source code or execute the model.

```ts
import { createExplorer } from "@represent/explorer";
import "@represent/explorer/style.css";

const explorer = createExplorer(model, {
  initial: { kind: "operation", name: "Prepare attendee roster" },
});
const host = document.querySelector<HTMLElement>("#explorer");
if (!host) throw new Error("Explorer host is missing");

function render() {
  host.innerHTML = explorer.render();
}
render();
explorer.bind(host, render);
// When removing the viewer: explorer.destroy();
```

`createExplorer` snapshots the supplied graph. Create a new instance to inspect
a new model. The host callback must render synchronously within the same host.
The viewer rebinds its listeners after each callback; calling `bind` again is
also safe. Each instance has its own selection, view, history, scoped event
listeners, and DOM IDs; `destroy()` removes its listeners. Optional `shortcuts`
are `{ item, label }` entries for useful starting points. An empty graph renders
an empty state.

**Relationships** shows the selected definition's immediate neighborhood. The
arrows follow named relationships: input travels into a conversion or operation;
output points toward its output contract; an operation points toward what it
reads or calls; a parent conversion points toward its field codecs. References
connect a source field to a target key. Repeated connections to the same
neighbor share a curve and retain individual labels. A gray curve can contain
multiple relationship families. Self relationships appear separately below the
map. Use the accompanying relationship list for a linear reading; the map
scrolls horizontally on small screens.

**Dependencies** answers either “what depends on this?” or “what does this
require?” using Represent's queries. Each result has a shortest path and all
reached immediate reasons. Selecting a result or path step navigates to that
definition. Back restores the previous selection; switching views and directions
keeps the selection. Input/output relationships are definition requirements, not
evidence that producing a value changes a schema or writes saved data.

Colors reinforce labels; kind icons also have text. Native buttons, select, and
disclosures provide keyboard navigation. Names and graph data are escaped at the
HTML boundary. The viewer is a grounding example for the library, not a
commitment to this layout or renderer.
