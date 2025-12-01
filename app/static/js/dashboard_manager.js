// State
let techniciansCache = [];
let ticketsCache = [];
let currentSidebarTicketId = null;
let filters = {
    technician: '',
    status: '',
    priority: ''
};

// Constants
const STATUS_CONFIG = {
    1: { text: 'Open', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-400' },
    2: { text: 'In Progress', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
    3: { text: 'Closed', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' }
};

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
    setupTicketCardEventDelegation();
    setupSidebarEvents();
    populateFilterTechnicians();

    addPriorityButtonsToMenu(document.getElementById('filter-priority-menu'), setFilterPriority, true);
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

// ===================
// Helper Functions
// ===================

function getStatusText(status) {
    return STATUS_CONFIG[status]?.text || 'Unknown';
}

function getStatusColor(status) {
    return STATUS_CONFIG[status]?.color || 'bg-gray-100 text-gray-800';
}

function getStatusDotColor(status) {
    return STATUS_CONFIG[status]?.dotColor || 'bg-gray-400';
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

function populateFilterTechnicians() {
    const menu = document.getElementById('filter-technician-menu');
    
    techniciansCache.forEach(tech => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm';
        btn.onclick = () => setFilterTechnician(tech.id);
        btn.textContent = tech.name;
        menu.appendChild(btn);
    });
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
    
    if (filters.technician === 'unassigned') {
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

function setupTicketCardEventDelegation() {
    document.getElementById('tickets-container').addEventListener('click', (e) => {
        const card = e.target.closest('.ticket-card');
        if (!card) return;
        
        const ticketId = card.dataset.ticketId;
        
        // Toggle dropdowns
        if (e.target.closest('.ticket-assignee')) {
            e.stopPropagation();
            toggleMenu(card.querySelector('.assignee-menu'));
            return;
        }
        if (e.target.closest('.ticket-priority')) {
            e.stopPropagation();
            toggleMenu(card.querySelector('.priority-menu'));
            return;
        }
        if (e.target.closest('.ticket-status')) {
            e.stopPropagation();
            toggleMenu(card.querySelector('.status-menu'));
            return;
        }
        
        // Handle menu selections
        const btn = e.target.closest('button');
        if (btn) {
            e.stopPropagation();
            
            if (btn.dataset.assignee !== undefined) {
                updateTicket({ id: ticketId, assigned_to: btn.dataset.assignee || null });
                return;
            } else if (btn.dataset.priority) {
                updateTicket({ id: ticketId, priority: parseInt(btn.dataset.priority) });
                return;
            } else if (btn.dataset.status) {
                updateTicket({ id: ticketId, status: parseInt(btn.dataset.status) });
                return;
            }
        }
        
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
        techniciansCache.forEach(tech => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm';
            btn.dataset.assignee = tech.id;
            btn.textContent = tech.name;
            assigneeMenu.appendChild(btn);
        });
        
        // Status
        const statusEl = clone.querySelector('.ticket-status');
        statusEl.textContent = getStatusText(ticket.status);
        statusEl.className += ' ' + getStatusColor(ticket.status);
        
        // Priority
        clone.querySelector('.ticket-priority').appendChild(getPriorityIcon(ticket.priority));
        //addPriorityButtonsToMenu(clone.querySelector('.priority-menu'), )
        
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
    // Handle dropdown selections
    document.getElementById('sidebar-status-menu').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.status && currentSidebarTicketId) {
            updateTicket({ id: currentSidebarTicketId, status: parseInt(btn.dataset.status) });
        }
    });
    
    document.getElementById('sidebar-priority-menu').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.priority && currentSidebarTicketId) {
            updateTicket({ id: currentSidebarTicketId, priority: parseInt(btn.dataset.priority) });
        }
    });
    
    document.getElementById('sidebar-assignee-menu').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.assignee !== undefined && currentSidebarTicketId) {
            updateTicket({ id: currentSidebarTicketId, assigned_to: btn.dataset.assignee || null });
        }
    });

    // triggered if name or description fields lose focus
    document.getElementById('sidebar-name').addEventListener('blur', (e) => {
        if (currentSidebarTicketId) {
            updateTicket({ id: currentSidebarTicketId, name: e.target.value });
        }
    });

    document.getElementById('sidebar-description').addEventListener('blur', (e) => {
        if (currentSidebarTicketId) {
            updateTicket({ id: currentSidebarTicketId, description: e.target.value });
        }
    });
}

function showTicketSidebar(ticketId) {
    const ticket = ticketsCache.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentSidebarTicketId = ticketId;
    
    // Name & Description
    document.getElementById('sidebar-name').value = ticket.name || '';
    document.getElementById('sidebar-description').value = ticket.description || '';
    
    // Assignee
    document.getElementById('sidebar-assignee-name').textContent = getTechnicianName(ticket.assigned_to);
    
    // Populate assignee dropdown
    const assigneeMenu = document.getElementById('sidebar-assignee-menu');
    techniciansCache.forEach(tech => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm';
        btn.dataset.assignee = tech.id;
        btn.textContent = tech.name;
        assigneeMenu.appendChild(btn);
    });
    
    // Status
    const statusEl = document.getElementById('sidebar-status');
    statusEl.textContent = getStatusText(ticket.status);
    statusEl.className = 'text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-70 ' + getStatusColor(ticket.status);
    
    // Priority
    const sidebarPriority = document.getElementById('sidebar-priority');
    sidebarPriority.innerHTML = ""; // Clear existing content
    sidebarPriority.appendChild(getPriorityIcon(ticket.priority));
    const span = document.createElement('span');
    span.textContent = getPriorityText(ticket.priority);
    sidebarPriority.appendChild(span);
    
    // Created date
    document.getElementById('sidebar-created').textContent = ticket.created_at 
        ? new Date(ticket.created_at).toLocaleString() 
        : 'Unknown';

    showSidebar();
}

function showSidebar() {
    const sidebar = document.getElementById('ticket-sidebar');
    sidebar.classList.remove('w-0');
    sidebar.classList.add('w-80', 'p-4');
}

function closeSidebar() {
    currentSidebarTicketId = null;
    const sidebar = document.getElementById('ticket-sidebar');
    sidebar.classList.remove('w-80', 'p-4');
    sidebar.classList.add('w-0');
}

function addPriorityButtonsToMenu(menu, onclickAction, isFilter) {
    let startIdx = isFilter ? 0 : 1;

    for(let idx = startIdx; idx < PRIORITIES.length; idx++) {
        const priority = PRIORITIES[idx];
        const priorityBtn = document.createElement('button');
        priorityBtn.className = "w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm";
        priorityBtn.onclick = function() { onclickAction(priority.id); };

        const img = getPriorityIcon(idx);

        priorityBtn.appendChild(img);
        const textNode = document.createTextNode(priority.name);
        priorityBtn.appendChild(textNode);

        menu.appendChild(priorityBtn);
    }
}
