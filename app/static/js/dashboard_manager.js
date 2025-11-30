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

const PRIORITY_CONFIG = {
    1: { text: 'Low', icon: '/static/images/low-priority.svg' },
    2: { text: 'Medium', icon: '/static/images/medium-priority.svg' },
    3: { text: 'High', icon: '/static/images/high-priority.svg' }
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('ticketCreated', loadTickets);

async function init() {
    techniciansCache = await fetchTechnicians();
    await loadTickets();
    setupTicketCardEventDelegation();
    setupSidebarEvents();
    setupFilterEvents();
    populateFilterTechnicians();
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
    return PRIORITY_CONFIG[priority]?.text || 'Unknown';
}

function getPriorityIcon(priority) {
    const config = PRIORITY_CONFIG[priority];
    if (!config) return '';
    return `<img src="${config.icon}" class="w-4 h-4" alt="${config.text} Priority" />`;
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
    closeAllMenus();
    menu.classList.toggle('hidden');
}

function closeAllMenus() {
    document.querySelectorAll('.status-menu, .priority-menu, .assignee-menu, #sidebar-status-menu, #sidebar-priority-menu, #sidebar-assignee-menu, #filter-technician-menu, #filter-status-menu, #filter-priority-menu').forEach(menu => {
        menu.classList.add('hidden');
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

function clearFilters() {
    filters = { technician: '', status: '', priority: '' };
    updateFilterUI();
    applyFilters();
}

function setupFilterEvents() {
    // Toggle filter dropdowns
    document.getElementById('filter-technician-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('filter-technician-menu'));
    });
    
    document.getElementById('filter-status-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('filter-status-menu'));
    });
    
    document.getElementById('filter-priority-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('filter-priority-menu'));
    });
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
    if (filters.priority === '') {
        priorityIcon.innerHTML = '<img src="/static/images/all-priorities.svg" class="w-4 h-4" alt="All Priorities" />';
        priorityLabel.textContent = 'All Priorities';
    } else {
        const priorityNum = parseInt(filters.priority);
        priorityIcon.innerHTML = getPriorityIcon(priorityNum);
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
        clone.querySelector('.ticket-priority').innerHTML = getPriorityIcon(ticket.priority);
        
        container.appendChild(clone);
    });
}

// ===================
// Sidebar Functions
// ===================

function setupSidebarEvents() {
    // Toggle dropdowns
    document.getElementById('sidebar-status').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('sidebar-status-menu'));
    });
    
    document.getElementById('sidebar-priority').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('sidebar-priority-menu'));
    });
    
    document.getElementById('sidebar-assignee').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(document.getElementById('sidebar-assignee-menu'));
    });
    
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

    // Handle name/description changes on blur
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
    assigneeMenu.querySelectorAll('button:not([data-assignee=""])').forEach(btn => btn.remove());
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
    document.getElementById('sidebar-priority').innerHTML = getPriorityIcon(ticket.priority) + `<span>${getPriorityText(ticket.priority)}</span>`;
    
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

// Make closeSidebar available globally for onclick
window.closeSidebar = closeSidebar;
