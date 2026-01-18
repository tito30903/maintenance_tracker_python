let techniciansCache = [];

const STATUSES = [
  { text: 'All Status' },
  { text: 'Open' },
  { text: 'In Progress' },
  { text: 'Closed' }
];

const PRIORITIES = [
  { shortLabel: "All" },
  { shortLabel: "High" },
  { shortLabel: "Medium" },
  { shortLabel: "Low" }
];

const TZ = "Europe/Vienna";

function formatVienna(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("de-AT", { timeZone: TZ });
}


document.addEventListener("DOMContentLoaded", async () => {
  techniciansCache = await fetchTechnicians();
  await loadHistory();
});

//Fetch all users with role=technician from backend.
async function fetchTechnicians() {
  try {
    const r = await fetch("/api/users?role=technician");
    const d = await r.json();
    return d.users || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}


//Resolve a technician ID to their display name using the cache. - null/undefined => "Unassigned" - not found => "Unknown"
function getTechnicianName(id) {
  if (!id) return "Unassigned";
  const t = techniciansCache.find(x => x.id === id);
  return t ? t.name : "Unknown";
}

function statusText(s) {
  return STATUSES[s]?.text || "Unknown";
}
function priorityText(p) {
  return PRIORITIES[p]?.shortLabel || "Unknown";
}

function isMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

// Load ticket history from backend and render it:
// - table rows into #history-body
// - mobile cards into #history-cards (only when mobile)
async function loadHistory() {
  const q = document.getElementById("history-search")?.value || "";
  const url = q ? `/api/tickets/history?q=${encodeURIComponent(q)}` : "/api/tickets/history";

  const body = document.getElementById("history-body");
  const cards = document.getElementById("history-cards");
  if (cards) cards.innerHTML = `<div class="text-gray-500 text-sm">Loading...</div>`;

  body.innerHTML = `<tr><td class="p-3 text-gray-500" colspan="8">Loading...</td></tr>`;

  try {
    const r = await fetch(url);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || "failed");

    if (!d.entries || d.entries.length === 0) {
      if (cards) cards.innerHTML = `<div class="text-gray-500 text-sm">No entries found.</div>`;
      body.innerHTML = `<tr><td class="p-3 text-gray-500" colspan="8">No entries found.</td></tr>`;
      return;
    }


    body.innerHTML = "";
    if (cards) cards.innerHTML = "";
    for (const row of d.entries) {
      const created = formatVienna(row.ticket_created_at);
      const updated = formatVienna(row.updated_at);

      const photosHtml = (row.photos || []).slice(0, 3).map(p => `
        <img src="${p.url}" class="w-10 h-10 object-cover rounded border cursor-pointer"
             onclick="window.open('${p.url}','_blank')" alt="photo">
      `).join("");

      const more = (row.photos || []).length > 3 ? `<span class="text-xs text-gray-500">+${row.photos.length - 3}</span>` : "";

      // Build table row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-3 font-medium">${escapeHtml(row.ticket_name || "")}</td>
        <td class="p-3">${escapeHtml(created)}</td>
        <td class="p-3">${escapeHtml(updated)}</td>
        <td class="p-3">${escapeHtml(getTechnicianName(row.assignee))}</td>
        <td class="p-3 whitespace-pre-wrap break-words">${escapeHtml(formatUpdateText(row))}</td>
        <td class="p-3">${escapeHtml(statusText(row.status))}</td>
        <td class="p-3">${escapeHtml(priorityText(row.priority))}</td>
        <td class="p-3">
            <div class="flex flex-wrap gap-2 max-w-[220px] overflow-hidden">
                ${(row.photos || []).slice(0, 6).map(p => `
                <img src="${p.url}"
                    class="w-12 h-12 object-cover rounded border cursor-pointer block"
                    style="max-width:48px; max-height:48px;"
                    onclick="window.open('${p.url}','_blank')" alt="photo">
                `).join("")}
            </div>

            ${(row.photos || []).length > 6
                ? `<div class="mt-1 text-xs text-gray-500">+${row.photos.length - 6} more</div>`
                : ``}
            </td>
      `;
      body.appendChild(tr);
      if (cards && isMobile()) {
        cards.appendChild(renderMobileCard(row));
      }
    }
  } catch (e) {
    console.error(e);
    body.innerHTML = `<tr><td class="p-3 text-red-600" colspan="8">Error loading history.</td></tr>`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

// Build the "update text" shown in the UI from
function formatUpdateText(row) {
  const lines = [];
  const note = (row.update || "").trim();
  if (note) lines.push(note);

  const changes = row.changes || [];
  for (const c of changes) {
    if (!c || !c.field) continue;

    if (c.field === "status") {
      lines.push(`Status changed to: ${statusText(c.to)}`);
    } else if (c.field === "priority") {
      lines.push(`Priority changed to: ${priorityText(c.to)}`);
    } else if (c.field === "assignee") {
      lines.push(`Assignee changed to: ${getTechnicianName(c.to)}`);
    }
  }

  return lines.join("\n");
}

// Render a compact card for mobile screens.
// Shows: ticket name, updated time, assignee, status, priority, truncated update text, photo thumbnails.
function renderMobileCard(row) {
  const updated = formatVienna(row.updated_at);
  const assignee = getTechnicianName(row.assignee);
  const updateText = formatUpdateText(row);

  const div = document.createElement("div");
  div.className = "border border-gray-200 rounded-xl p-3 bg-white shadow-sm";

  const photos = (row.photos || []).slice(0, 4).map(p => `
    <img src="${p.url}"
         class="w-8 h-8 object-cover rounded-lg border flex-none"
         onclick="event.stopPropagation(); window.open('${p.url}','_blank')"
         alt="photo">
  `).join("");

  div.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="font-semibold truncate">${escapeHtml(row.ticket_name || "")}</div>
        <div class="text-xs text-gray-500 mt-1">${escapeHtml(updated)} · ${escapeHtml(assignee)}</div>
      </div>
      <div class="flex flex-col items-end gap-1 text-xs flex-none">
        <span class="px-2 py-1 rounded-full bg-gray-100">${escapeHtml(statusText(row.status))}</span>
        <span class="px-2 py-1 rounded-full bg-gray-100">${escapeHtml(priorityText(row.priority))}</span>
      </div>
    </div>

    <div class="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words"
         style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
      ${escapeHtml(updateText || "") || `<span class="text-gray-500">No update</span>`}
    </div>

    ${photos ? `<div class="mt-3 flex gap-2 overflow-x-auto">${photos}</div>` : ``}
  `;
  return div;
}
