// State
let techniciansCache = [];
let ticketsCache = [];
let currentSidebarTicketId = null;
let sidebarDraft = null;         
let sidebarStagedFiles = [];     

let filters = {
    technician: '',
    status: '',
    priority: ''
};

let picturesLoadToken = 0;

// Constants
const STATUSES = [
    { text: 'All Status', color: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-400' },
    { text: 'Open', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-400' },
    { text: 'In Progress', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
    { text: 'Closed', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' }
];

const PRIORITIES = [
    { id: "", name: "All Priorities", img: "all-priorities.svg" },
    { id: "1", name: "High Priority", shortLabel:"High", img: "high-priority.svg" },
    { id: "2", name: "Medium Priority", shortLabel: "Medium", img: "medium-priority.svg" },
    { id: "3", name: "Low Priority", shortLabel: "Low", img: "low-priority.svg" }
];


// Initialize
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('ticketCreated', loadTickets);

async function init() {
    techniciansCache = await fetchTechnicians();
    await loadTickets();
    setupShowTicketSidebarEventListener();
    setupSidebarEvents();
    initFilters();
}

function initFilters() {
    addPriorityButtonsToMenu(document.getElementById('filter-priority-menu'), setFilterPriority, true);
    addAssigneeButtonsToMenu(document.getElementById('filter-technician-menu'), setFilterTechnician, true);
    addStatusButtonsToMenu(document.getElementById('filter-status-menu'), setFilterStatus, true);
}

// ===================
// API Functions
// ===================

async function fetchTechnicians() {
    try {
        const response = await fetch('/api/users?role=technician');
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error fetching technicians:', error);
        return [];
    }
}

async function loadTickets() {
    try {
        const response = await fetch('/api/tickets');
        const data = await response.json();
        
        if (data.success) {
            ticketsCache = data.tickets;
            applyFilters();
            
            if (currentSidebarTicketId) {
                showTicketSidebar(currentSidebarTicketId);
            }
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

async function updateTicket(ticket) {
    try {
        const response = await fetch('/api/tickets/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticket)
        });
        
        if (response.ok) {
            await loadTickets();
        } else {
            console.error('Failed to update ticket');
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
    }
}

async function loadPictures(ticketId) {
  const container = document.getElementById('sidebar-attachments');
  if (!container || !ticketId) return;

  const token = ++picturesLoadToken;

  clearPictures();

  try {
    const response = await fetch(`/api/photos/${ticketId}`);
    const data = await response.json();

    if (token !== picturesLoadToken) return;
    if (!data.success) return;

    const pics = data.pictures || data.photos || [];

    for (const pic of pics) {
      const url = pic.url || pic;
      addPictureThumbnail(url);
    }
  } catch (error) {
      console.error('Error loading pictures:', error);
  }
}

async function handleFileUpload(event) {
  if (!sidebarDraft) return;

  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  for (const file of files) {
    const url = URL.createObjectURL(file);
    addPictureThumbnail(url);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  event.target.value = "";

  await autoSaveSidebar({}, files, "Photos uploaded");
}



// ===================
// Helper Functions
// ===================

function getStatusText(status) {
    return STATUSES[status]?.text || 'Unknown';
}

function getStatusColor(status) {
    return STATUSES[status]?.color || 'bg-gray-100 text-gray-800';
}

function getStatusDotColor(status) {
    return STATUSES[status]?.dotColor || 'bg-gray-400';
}

function getPriorityText(priority) {
    return PRIORITIES[priority].shortLabel || 'Unknown';
}

function getPriorityIcon(idx) {
    const priority = PRIORITIES[idx];

    if (!priority) {
        console.error("Invalid priority:", idx);
        return document.createTextNode(''); // return empty node
    }

    const img = document.createElement('img');
    img.src = "/static/images/" + priority.img;
    img.className = "w-4 h-4";
    img.alt = priority.name;
    return img;
}

function getTechnicianName(techId) {
    if (!techId) return 'Unassigned';
    const tech = techniciansCache.find(t => t.id === techId);
    return tech ? tech.name : 'Unknown';
}

// ===================
// Menu Functions
// ===================

function toggleMenu(menu) {
    if (menu.classList.contains('hidden')) {
        closeAllMenus();
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

function closeAllMenus() {
    document.querySelectorAll('.status-menu, .priority-menu, .assignee-menu, #sidebar-status-menu, #sidebar-priority-menu, #sidebar-assignee-menu, #filter-technician-menu, #filter-status-menu, #filter-priority-menu').forEach(menu => {
        menu.classList.add('hidden');
        console.log("this is still triggered");
    });
}

document.addEventListener('click', closeAllMenus);

// ===================
// Filter Functions
// ===================

function setFilterTechnician(technicianId) {
    filters.technician = technicianId;
    updateFilterUI();
    applyFilters();
}

function setFilterPriority(priority) {
    filters.priority = priority;
    updateFilterUI();
    applyFilters();
}

function setFilterStatus(status) {
    filters.status = status;
    updateFilterUI();
    applyFilters();
}

function toggleFilterTechnicianMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('filter-technician-menu'));
}

function toggleFilterStatusMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('filter-status-menu'));
}

function toggleFilterPriorityMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('filter-priority-menu'));
}

function clearFilters() {
    filters = { technician: '', status: '', priority: '' };
    updateFilterUI();
    applyFilters();
}

function updateFilterUI() {
    // Update technician filter label
    const techLabel = document.getElementById('filter-technician-label');
    if (filters.technician === '') {
        techLabel.textContent = 'All Technicians';
    } else if (filters.technician === 'unassigned') {
        techLabel.textContent = 'Unassigned';
    } else {
        techLabel.textContent = getTechnicianName(filters.technician);
    }
    
    // Update status filter
    const statusDot = document.getElementById('filter-status-dot');
    const statusLabel = document.getElementById('filter-status-label');
    if (filters.status === '') {
        statusDot.className = 'w-2 h-2 rounded-full bg-gray-400';
        statusLabel.textContent = 'All Statuses';
    } else {
        const statusNum = parseInt(filters.status);
        statusDot.className = 'w-2 h-2 rounded-full ' + getStatusDotColor(statusNum);
        statusLabel.textContent = getStatusText(statusNum);
    }
    
    // Update priority filter
    const priorityIcon = document.getElementById('filter-priority-icon');
    const priorityLabel = document.getElementById('filter-priority-label');
    priorityIcon.innerHTML = ''; // Clear existing content
    if (filters.priority === '') {
        priorityIcon.appendChild(getPriorityIcon(0));
        priorityLabel.textContent = 'All Priorities';
    } else {
        const priorityNum = parseInt(filters.priority);
        priorityIcon.appendChild(getPriorityIcon(priorityNum));
        priorityLabel.textContent = getPriorityText(priorityNum);
    }
    
    // Show/hide clear button
    const hasFilters = filters.technician || filters.status || filters.priority;
    document.getElementById('clear-filters-btn').classList.toggle('hidden', !hasFilters);
}

function applyFilters() {
    let filtered = [...ticketsCache];
    
    if (filters.technician === null) {
        filtered = filtered.filter(t => !t.assigned_to);
    } else if (filters.technician) {
        filtered = filtered.filter(t => t.assigned_to === filters.technician);
    }
    
    if (filters.status) {
        filtered = filtered.filter(t => t.status === parseInt(filters.status));
    }
    
    if (filters.priority) {
        filtered = filtered.filter(t => t.priority === parseInt(filters.priority));
    }
    
    renderTickets(filtered);
}

// ===================
// Ticket Card Functions
// ===================

function toggleTicketAssigneeMenu(e) {
    e.stopPropagation();
    const card = e.target.closest('.ticket-card');
    if (!card) return;
    toggleMenu(card.querySelector('.assignee-menu'));
}

function toggleTicketPriorityMenu(e) {
    e.stopPropagation();
    const card = e.target.closest('.ticket-card');
    if (!card) return;
    toggleMenu(card.querySelector('.priority-menu'));
}

function toggleTicketStatusMenu(e) {
    e.stopPropagation();
    const card = e.target.closest('.ticket-card');
    if (!card) return;
    toggleMenu(card.querySelector('.status-menu'));
}

function setupShowTicketSidebarEventListener() {
    document.getElementById('tickets-container').addEventListener('click', (e) => {
        const card = e.target.closest('.ticket-card');
        if (!card) return;
        
        const ticketId = card.dataset.ticketId;
        ticketPictures = [];
        clearPictures();
        // Click on the card itself - show sidebar
        showTicketSidebar(ticketId);
    });
}

function renderTickets(tickets) {
    const container = document.getElementById('tickets-container');
    const template = document.getElementById('ticket-template');
    
    container.innerHTML = '';
    
    if (tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No tickets found.</p>';
        return;
    }
    
    tickets.forEach(ticket => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.ticket-card');
        card.dataset.ticketId = ticket.id;

        // Name
        clone.querySelector('.ticket-name').textContent = ticket.name;
        
        // Assignee
        clone.querySelector('.assignee-name').textContent = getTechnicianName(ticket.assigned_to);
        
        // Populate assignee dropdown
        const assigneeMenu = clone.querySelector('.assignee-menu');
        addAssigneeButtonsToMenu(assigneeMenu, (assigneeId) => updateTicket({id: ticket.id, assigned_to: assigneeId}), false);
        
        // Status
        const statusEl = clone.querySelector('.ticket-status');

        statusEl.textContent = getStatusText(ticket.status);
        statusEl.className += ' ' + getStatusColor(ticket.status);

        // Populate status dropdown
        const statusMenu = clone.querySelector('.status-menu');
        addStatusButtonsToMenu(statusMenu, (status) => updateTicket({id: ticket.id, status: status}), false);
        
        // Priority
        clone.querySelector('.ticket-priority').appendChild(getPriorityIcon(ticket.priority));
        addPriorityButtonsToMenu(
            clone.querySelector('.priority-menu'),
            (priority) => updateTicket({ id: ticket.id, priority: parseInt(priority) }),
            false
        );
        
        container.appendChild(clone);
    });
}

// ===================
// Sidebar Functions
// ===================

function toggleSidebarStatusMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('sidebar-status-menu'));
}

function toggleSidebarPriorityMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('sidebar-priority-menu'));
}

function toggleSidebarAssigneeMenu(e) {
    e.stopPropagation();
    toggleMenu(document.getElementById('sidebar-assignee-menu'));
}

function setupSidebarEvents() {
  const nameEl = document.getElementById('sidebar-name');
  const descEl = document.getElementById('sidebar-description');
  const msgEl = document.getElementById('sidebar-update-message');

  if (nameEl) {
    nameEl.addEventListener('input', (e) => {
      if (!sidebarDraft) return;
      sidebarDraft.values.name = e.target.value;
      updateSaveButtonState();
    });
  }

  if (descEl) {
    descEl.addEventListener('input', (e) => {
      if (!sidebarDraft) return;
      sidebarDraft.values.description = e.target.value;
      updateSaveButtonState();
    });
  }

  if (msgEl) {
    msgEl.addEventListener('input', (e) => {
      if (!sidebarDraft) return;
      sidebarDraft.values.message = e.target.value;
      updateSaveButtonState();
    });
  }

  // Save button exists on both pages after you added it
  const saveBtn = document.getElementById('sidebar-save-btn');
  if (saveBtn) {
    updateSaveButtonState();
  }
}

function showTicketSidebar(ticketId) {
  const ticket = ticketsCache.find(t => t.id === ticketId);
  if (!ticket) return;

  currentSidebarTicketId = ticketId;

  // init draft
  sidebarDraft = {
    ticketId,
    original: {
      name: ticket.name || "",
      description: ticket.description || "",
      status: ticket.status,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to || null
    },
    values: {
      name: ticket.name || "",
      description: ticket.description || "",
      status: ticket.status,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to || null,
      message: ""
    }
  };

  // reset staged files
  sidebarStagedFiles.forEach(x => URL.revokeObjectURL(x.url));
  sidebarStagedFiles = [];
  clearPictures(); // clears thumbnails (except upload label)
  loadPictures(ticketId); // reload existing pictures from server (your old endpoint)

  // Name & Description
  document.getElementById('sidebar-name').value = sidebarDraft.values.name;
  document.getElementById('sidebar-description').value = sidebarDraft.values.description;

  // Assignee label
  document.getElementById('sidebar-assignee-name').textContent = getTechnicianName(sidebarDraft.values.assigned_to);

  // Populate assignee dropdown (changes draft only)
  const assigneeMenu = document.getElementById('sidebar-assignee-menu');
  assigneeMenu.innerHTML = '';
  addAssigneeButtonsToMenu(assigneeMenu, async (assigneeId) => {
    sidebarDraft.values.assigned_to = assigneeId;
    document.getElementById('sidebar-assignee-name').textContent = getTechnicianName(assigneeId);
    updateSaveButtonState();

    await autoSaveSidebar({ assigned_to: assigneeId }, [], "");
    }, false);


  // Status UI
  const statusEl = document.getElementById('sidebar-status');
  statusEl.textContent = getStatusText(sidebarDraft.values.status);
  statusEl.className = 'text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-70 ' + getStatusColor(sidebarDraft.values.status);

  // Populate status dropdown (draft only)
  const statusMenu = document.getElementById('sidebar-status-menu');
  statusMenu.innerHTML = '';
  addStatusButtonsToMenu(statusMenu, async (status) => {
    sidebarDraft.values.status = status;
    statusEl.textContent = getStatusText(status);
    statusEl.className = 'text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-70 ' + getStatusColor(status);
    updateSaveButtonState();

    await autoSaveSidebar({ status }, [], "");
    }, false);


  // Priority UI
  const sidebarPriority = document.getElementById('sidebar-priority');
  sidebarPriority.innerHTML = "";
  sidebarPriority.appendChild(getPriorityIcon(sidebarDraft.values.priority));
  const span = document.createElement('span');
  span.textContent = getPriorityText(sidebarDraft.values.priority);
  sidebarPriority.appendChild(span);

  // Priority dropdown (draft only)
  const priorityMenu = document.getElementById('sidebar-priority-menu');
  priorityMenu.innerHTML = '';
  addPriorityButtonsToMenu(priorityMenu, async (priority) => {
    sidebarDraft.values.priority = parseInt(priority);
    sidebarPriority.innerHTML = "";
    sidebarPriority.appendChild(getPriorityIcon(sidebarDraft.values.priority));
    const sp = document.createElement('span');
    sp.textContent = getPriorityText(sidebarDraft.values.priority);
    sidebarPriority.appendChild(sp);
    updateSaveButtonState();

    await autoSaveSidebar({ priority: sidebarDraft.values.priority }, [], "");
    }, false);


  // Created date
  document.getElementById('sidebar-created').textContent = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString()
    : 'Unknown';

  // Update textbox (exists after you added it)
  const msgEl = document.getElementById('sidebar-update-message');
  if (msgEl) msgEl.value = "";

  updateSaveButtonState();
  showSidebar();
}


function isMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function showSidebar() {
  const sidebar = document.getElementById('ticket-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (isMobile()) {
    // Mobile: Bottom-sheet
    sidebar.classList.add('mobile-open', 'p-4');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } else {
    // Desktop: exakt wie vorher (seitlich)
    sidebar.classList.remove('w-0');
    sidebar.classList.add('w-80', 'p-4');

    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

function closeSidebar() {
  currentSidebarTicketId = null;

  const sidebar = document.getElementById('ticket-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (isMobile()) {
    // Mobile close
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');

    // optional: padding weg, wenn geschlossen
    sidebar.classList.remove('p-4');
  } else {
    // Desktop close: exakt wie vorher
    sidebar.classList.remove('w-80', 'p-4');
    sidebar.classList.add('w-0');
  }
}

// optional: if user rotates phone / resizes window while open
window.addEventListener('resize', () => {
  if (currentSidebarTicketId) showSidebar();
});


function addPriorityButtonsToMenu(menu, onclickAction, isFilter) {
    let startIdx = isFilter ? 0 : 1;

    for(let idx = startIdx; idx < PRIORITIES.length; idx++) {
        const priority = PRIORITIES[idx];
        const priorityBtn = document.createElement('button');
        priorityBtn.className = "w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm";
        priorityBtn.onclick = function(event) {
            event.stopPropagation();
            onclickAction(priority.id);
        };

        const img = getPriorityIcon(idx);

        priorityBtn.appendChild(img);
        const textNode = document.createTextNode(isFilter ? priority.name : priority.shortLabel);
        priorityBtn.appendChild(textNode);

        menu.appendChild(priorityBtn);
    }
}

function addAssigneeButtonsToMenu(menu, onclickAction, isFilter) {
    const baseClasses = "w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm";

    if (isFilter) {
        const unassignedBtn = document.createElement('button');
        unassignedBtn.className = baseClasses;
        unassignedBtn.onclick = function(event) {
            event.stopPropagation();
            onclickAction("");
        };
        unassignedBtn.textContent = "All Technicians"
        menu.appendChild(unassignedBtn);
    }

    // add unassigned option
    const unassignedBtn = document.createElement('button');
    unassignedBtn.className = baseClasses + " text-gray-500";
    unassignedBtn.onclick = function(event) {
        event.stopPropagation();
        onclickAction(null);
    };
    unassignedBtn.textContent = "Unassigned"
    menu.appendChild(unassignedBtn);

    // add all fetched technicians
    for(let idx = 0; idx < techniciansCache.length; idx++) {
        const tech = techniciansCache[idx];
        const techBtn = document.createElement('button');
        techBtn.className = baseClasses;
        techBtn.onclick = function(event) {
            event.stopPropagation();
            onclickAction(tech.id);
        };
        techBtn.textContent = tech.name;

        menu.appendChild(techBtn);
    }
}

function addStatusButtonsToMenu(menu, onclickAction, isFilter) {
    let startIdx = isFilter ? 0 : 1;

    for(let idx = startIdx; idx < STATUSES.length; idx++) {
        const status = STATUSES[idx];
        const statusBtn = document.createElement('button');
        statusBtn.className = "w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm flex items-center";
        statusBtn.onclick = function(event) {
            event.stopPropagation();
            onclickAction(idx);
        };

        // Dot
        const dot = document.createElement('span');
        dot.className = `inline-block w-2 h-2 rounded-full mr-2 ${status.dotColor}`;
        statusBtn.appendChild(dot);

        // Label
        const textNode = document.createTextNode(status.text);
        statusBtn.appendChild(textNode);

        menu.appendChild(statusBtn);
    }
}

function addThumbnailToSidebar(imageUrl) {
    const container = document.getElementById('sidebar-attachments');
    const div = document.createElement('div');
    div.className = "relative group aspect-square bg-gray-100 rounded overflow-hidden border border-gray-200";

    div.innerHTML = `
        <img src="${imageUrl}"
             class="object-cover w-full h-full cursor-pointer hover:scale-110 transition-transform duration-200"
             onclick="window.open('${imageUrl}', '_blank')"
             alt="Ticket Anhang">

        <button onclick="deleteAttachment(this, '${imageUrl}')"
                class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;
    const uploadButton = container.querySelector('label[for="file-upload"]');
    if (uploadButton) {
        container.insertBefore(div, uploadButton);
    } else {
        container.appendChild(div);
    }
}

function clearPictures() {
  const container = document.getElementById('sidebar-attachments');
  if (!container) return;

  const uploadLabel = container.querySelector('label[for="file-upload"]');
  container.innerHTML = "";
  if (uploadLabel) container.appendChild(uploadLabel);
}


function addStagedThumbnailToSidebar(stagedId, imageUrl) {
  const container = document.getElementById('sidebar-attachments');
  const div = document.createElement('div');
  div.className = "relative group aspect-square bg-gray-100 rounded overflow-hidden border border-gray-200";
  div.dataset.stagedId = stagedId;

  div.innerHTML = `
    <img src="${imageUrl}"
         class="object-cover w-full h-full cursor-pointer hover:scale-110 transition-transform duration-200"
         alt="Staged Attachment">

    <button onclick="removeStagedAttachment('${stagedId}')"
            class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  const uploadButton = container.querySelector('label[for="file-upload"]');
  if (uploadButton) container.insertBefore(div, uploadButton);
  else container.appendChild(div);
}

function removeStagedAttachment(stagedId) {
  const idx = sidebarStagedFiles.findIndex(x => x.id === stagedId);
  if (idx >= 0) {
    URL.revokeObjectURL(sidebarStagedFiles[idx].url);
    sidebarStagedFiles.splice(idx, 1);
  }

  const container = document.getElementById('sidebar-attachments');
  const el = container.querySelector(`[data-staged-id="${stagedId}"]`);
  if (el) el.remove();

  updateSaveButtonState();
}

function hasDraftChanges() {
  if (!sidebarDraft) return false;
  const o = sidebarDraft.original;
  const v = sidebarDraft.values;

  const changed =
    (o.name !== v.name) ||
    (o.description !== v.description) ||
    (o.status !== v.status) ||
    (o.priority !== v.priority) ||
    ((o.assigned_to || null) !== (v.assigned_to || null));

  const hasMsg = (v.message || "").trim().length > 0;
  const hasFiles = sidebarStagedFiles.length > 0;

  return changed || hasMsg || hasFiles;
}

function updateSaveButtonState() {
  const btn = document.getElementById('sidebar-save-btn');
  if (!btn) return;
  btn.disabled = !hasDraftChanges();
}

// --- Auto-save (creates history log immediately) ---
let sidebarAutoSaveInFlight = false;
let sidebarAutoSaveQueued = null;

async function autoSaveSidebar({ status, priority, assigned_to } = {}, files = [], note = "") {
  if (!sidebarDraft) return;

  const ticketId = sidebarDraft.ticketId;
  const formData = new FormData();
  formData.append("ticket_id", ticketId);

  // only send fields that we want to save/log now
  if (status !== undefined) formData.append("status", String(status));
  if (priority !== undefined) formData.append("priority", String(priority));

  // IMPORTANT: to unassign we must send "" (backend turns "" into None)
  if (assigned_to !== undefined) formData.append("assigned_to", assigned_to ?? "");

  // note text shown in history (optional)
  formData.append("message", note ?? "");

  for (const f of files) {
    formData.append("files", f, f.name);
  }

  // simple queue so fast clicks don't lose changes
  if (sidebarAutoSaveInFlight) {
    sidebarAutoSaveQueued = { patch: { status, priority, assigned_to }, files, note };
    return;
  }

  sidebarAutoSaveInFlight = true;
  try {
    const r = await fetch("/api/tickets/save_update", { method: "POST", body: formData });
    const d = await r.json();

    if (!r.ok || !d.success) {
      console.error("AutoSave failed:", d);
      return;
    }

    // refresh list + sidebar so draft/original stays in sync + photos reload
    await loadTickets();
    showTicketSidebar(ticketId);
  } catch (e) {
    console.error(e);
  } finally {
    sidebarAutoSaveInFlight = false;

    if (sidebarAutoSaveQueued) {
      const q = sidebarAutoSaveQueued;
      sidebarAutoSaveQueued = null;
      await autoSaveSidebar(q.patch, q.files, q.note);
    }
  }
}


async function saveSidebarChanges() {
  if (!sidebarDraft) return;

  const ticketId = sidebarDraft.ticketId;
  const v = sidebarDraft.values;

  const formData = new FormData();
  formData.append("ticket_id", ticketId);
  formData.append("name", v.name ?? "");
  formData.append("description", v.description ?? "");
  formData.append("status", String(v.status ?? ""));
  formData.append("priority", String(v.priority ?? ""));
  formData.append("assigned_to", v.assigned_to ?? "");
  formData.append("message", v.message ?? "");

  for (const sf of sidebarStagedFiles) {
    formData.append("files", sf.file, sf.file.name);
  }

  try {
    const r = await fetch("/api/tickets/save_update", {
      method: "POST",
      body: formData
    });

    const d = await r.json();
    if (!r.ok || !d.success) {
      console.error("Save failed:", d);
      return;
    }

    // reset draft message + staged
    const msgEl = document.getElementById("sidebar-update-message");
    if (msgEl) msgEl.value = "";

    sidebarStagedFiles.forEach(x => URL.revokeObjectURL(x.url));
    sidebarStagedFiles = [];

    await loadTickets();          
    showTicketSidebar(ticketId); 
  } catch (e) {
    console.error(e);
  }
}

function addPictureThumbnail(imageUrl) {
  const container = document.getElementById('sidebar-attachments');
  if (!container) return;

  const div = document.createElement('div');
  div.className = "relative group aspect-square bg-gray-100 rounded overflow-hidden border border-gray-200";

  div.innerHTML = `
    <img src="${imageUrl}"
         class="object-cover w-full h-full cursor-pointer hover:scale-110 transition-transform duration-200"
         alt="Attachment">
  `;

  const uploadLabel = container.querySelector('label[for="file-upload"]');
  if (uploadLabel) container.insertBefore(div, uploadLabel);
  else container.appendChild(div);
}