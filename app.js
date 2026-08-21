/**
 * Core Application Controller for Call & Query Support System
 * Manages Authentication Gate, UI interactions, form handling, tables, search filters, modals, and Excel export.
 */

// Application State
const AppState = {
    currentTab: 'employee-form', // 'employee-form' | 'all-queries' | 'pending-queries' | 'done-queries' | 'forwarded-queries' | 'employees' | 'settings'
    callDirection: 'Incoming', // 'Incoming' | 'Outgoing'
    callType: 'Query', // 'Query' | 'Update'
    searchFilters: {
        global: '',
        ticketNo: '',
        barcode: '',
        callerName: '',
        callerNo: '',
        clientCode: '',
        department: '',
        queryType: '',
        status: '',
        date: ''
    },
    forwardSubFilter: 'all', // 'all' | 'pending' | 'resolved'
    selectedTicketForModal: null,
    selectedEmployeeForModal: null
};

// Main App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Enforce Authentication Gate: Check if user is logged in
    checkAuthState();

    // 2. Setup Form & Dropdown Listeners
    setupEventListeners();
}

// Check Authentication State & Toggle Views
function checkAuthState() {
    const loginView = document.getElementById('login-screen-view');
    const appView = document.getElementById('app-dashboard-view');
    const currentUser = DB.getCurrentUser();

    if (!currentUser) {
        // Locked / Logged Out: Show Login Screen, Hide Dashboard
        if (loginView) loginView.classList.remove('hidden');
        if (appView) appView.classList.add('hidden');
        SLATimer.stop();
        return;
    }

    // Authenticated / Allowed Access: Hide Login Screen, Show Dashboard
    if (loginView) loginView.classList.add('hidden');
    if (appView) appView.classList.remove('hidden');

    // Populate user profile and header
    renderUserHeader();

    // Populate dropdowns
    populateDepartmentDropdowns();
    populateQueryTypeDropdowns();

    // Reset Form Defaults
    resetCallForm();

    // Start SLA real-time timer
    SLATimer.start(() => {
        renderPendingQueriesSidebar();
        // Also refresh table if pending queries tab is active
        if (AppState.currentTab === 'pending-queries' || AppState.currentTab === 'all-queries' || AppState.currentTab === 'forwarded-queries') {
            renderCurrentTable();
        }
    });

    // Check 1-Month Auto-Export & Purge status
    checkMonthlyArchiveNotice();

    // Initial Renders
    renderPendingQueriesSidebar();
    renderStatsCounters();
    switchTab(AppState.currentTab);
}

// Handle Login Form Submit
function handleUserLogin(e) {
    if (e) e.preventDefault();

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorAlert = document.getElementById('login-error-alert');
    const errorMsg = document.getElementById('login-error-msg');

    const username = usernameInput ? usernameInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

    try {
        const user = DB.login(username, password);
        if (errorAlert) errorAlert.classList.add('hidden');

        // Clear input fields
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        // Proceed into dashboard
        checkAuthState();
        showToast(`Welcome back, ${user.name} (${user.role})!`, 'success');
    } catch (err) {
        if (errorAlert && errorMsg) {
            errorMsg.textContent = err.message || 'Invalid Username or Password!';
            errorAlert.classList.remove('hidden');
        } else {
            showToast(err.message, 'error');
        }
    }
}

// Quick 1-Click Fill & Login helper
function quickFillAndLogin(username, password) {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (usernameInput) usernameInput.value = username;
    if (passwordInput) passwordInput.value = password;
    handleUserLogin();
}

// Handle Logout
function handleUserLogout() {
    DB.logout();
    showToast('You have been logged out safely.', 'info');
    checkAuthState();
}

// Toggle Show/Hide Password
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Render User Header & Role details
function renderUserHeader() {
    const user = DB.getCurrentUser() || { username: 'admin', name: 'System Administrator', role: 'Admin', department: 'Technical Support' };
    const userDisplay = document.getElementById('current-user-display');
    const roleBadge = document.getElementById('current-role-badge');
    const adminNavItems = document.querySelectorAll('.admin-only-nav');

    if (userDisplay) userDisplay.textContent = user.name;
    if (roleBadge) {
        roleBadge.textContent = user.role;
        if (user.role === 'Admin') {
            roleBadge.className = 'badge bg-purple-100 text-purple-800 border-purple-300';
        } else {
            roleBadge.className = 'badge bg-blue-100 text-blue-800 border-blue-300';
        }
    }

    // Toggle admin-only navigation links
    adminNavItems.forEach(el => {
        if (user.role === 'Admin') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // If non-admin is trying to access admin tab, redirect to employee form
    if (user.role !== 'Admin' && (AppState.currentTab === 'employees' || AppState.currentTab === 'settings')) {
        switchTab('employee-form');
    }
}

// Switch User Role (Admin / Employee Quick Switcher)
function switchUserRole(role, specificEmployeeId = null) {
    const employees = DB.getEmployees();
    let targetUser;

    if (role === 'Admin') {
        targetUser = employees.find(e => e.role === 'Admin') || employees[0];
    } else {
        if (specificEmployeeId) {
            targetUser = employees.find(e => e.id === specificEmployeeId);
        } else {
            targetUser = employees.find(e => e.role === 'Employee') || employees[0];
        }
    }

    if (targetUser) {
        DB.setCurrentUser(targetUser);
        renderUserHeader();
        populateDepartmentDropdowns();
        populateQueryTypeDropdowns();
        renderPendingQueriesSidebar();
        renderStatsCounters();
        renderCurrentTable();
        showToast(`Switched account to: ${targetUser.name} (${targetUser.role})`, 'info');
    }
}

// Populate Dropdown Menus
function populateDepartmentDropdowns() {
    const departments = DB.getDepartments().filter(d => d.status === 'Active');
    const selects = ['form-department', 'filter-department', 'forward-dept-select', 'emp-department-select'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentVal = select.value;
        const defaultOption = selectId.startsWith('filter') 
            ? '<option value="">All Departments</option>' 
            : '<option value="" disabled selected>Select Department</option>';

        select.innerHTML = defaultOption + departments.map(d => 
            `<option value="${d.name}">${d.name} (${d.code})</option>`
        ).join('');

        if (currentVal) select.value = currentVal;
    });
}

function populateQueryTypeDropdowns(selectedDept = null) {
    let queryTypes = DB.getQueryTypes();
    if (selectedDept) {
        queryTypes = queryTypes.filter(qt => qt.department === selectedDept || qt.department === 'General');
    }

    const selects = ['form-query-type', 'filter-query-type'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentVal = select.value;
        const defaultOption = selectId.startsWith('filter')
            ? '<option value="">All Query Types</option>'
            : '<option value="" disabled selected>Select Type of Query</option>';

        select.innerHTML = defaultOption + queryTypes.map(qt => 
            `<option value="${qt.name}">${qt.name} [${qt.priority}]</option>`
        ).join('');

        if (currentVal) select.value = currentVal;
    });
}

// Populate Employee list in forward modal
function populateEmployeeForwardSelect(deptName) {
    const select = document.getElementById('forward-emp-select');
    if (!select) return;

    let employees = DB.getEmployees().filter(e => e.status === 'Active');
    if (deptName) {
        employees = employees.filter(e => e.department === deptName);
    }

    select.innerHTML = '<option value="">Assign to Any Available Agent</option>' + employees.map(e => 
        `<option value="${e.username}">${e.name} (${e.role})</option>`
    ).join('');
}

// Form Reset & Auto Time Pick
function resetCallForm() {
    const form = document.getElementById('ticket-call-form');
    if (form) form.reset();

    // Auto-generate next ticket number
    const ticketNoInput = document.getElementById('form-ticket-no');
    if (ticketNoInput) {
        ticketNoInput.value = DB.generateNextTicketNumber();
    }

    // Auto pick current Date & Time
    const now = new Date();
    const dateTimeInput = document.getElementById('form-date-time');
    if (dateTimeInput) {
        const formattedDate = now.toLocaleString([], {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        dateTimeInput.value = formattedDate;
        dateTimeInput.dataset.rawIso = now.toISOString();
    }

    // Pre-fill Call End Time placeholder or current time
    const callEndTimeInput = document.getElementById('form-call-end-time');
    if (callEndTimeInput) {
        callEndTimeInput.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Reset Call Direction & Type buttons
    setCallDirection('Incoming');
    setCallType('Query');
}

// Call Direction Switcher (Incoming vs Outgoing)
function setCallDirection(direction) {
    AppState.callDirection = direction;
    const btnIn = document.getElementById('btn-direction-incoming');
    const btnOut = document.getElementById('btn-direction-outgoing');
    const headerTitle = document.getElementById('form-direction-title');
    const headerBadge = document.getElementById('form-direction-badge');

    if (btnIn && btnOut) {
        if (direction === 'Incoming') {
            btnIn.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-blue-600 text-white shadow-md shadow-blue-200';
            btnOut.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200';
            if (headerTitle) headerTitle.textContent = 'Incoming Call Query Log';
            if (headerBadge) {
                headerBadge.textContent = 'INCOMING';
                headerBadge.className = 'badge bg-blue-100 text-blue-800 border-blue-300';
            }
        } else {
            btnOut.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-200';
            btnIn.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200';
            if (headerTitle) headerTitle.textContent = 'Outgoing Call Query Log';
            if (headerBadge) {
                headerBadge.textContent = 'OUTGOING';
                headerBadge.className = 'badge bg-indigo-100 text-indigo-800 border-indigo-300';
            }
        }
    }
}

// Call Type Switcher (Query vs Update)
function setCallType(type) {
    AppState.callType = type;
    const btnQuery = document.getElementById('btn-type-query');
    const btnUpdate = document.getElementById('btn-type-update');

    if (btnQuery && btnUpdate) {
        if (type === 'Query') {
            btnQuery.className = 'flex-1 py-2 px-3 rounded-md font-medium text-xs transition-all bg-emerald-600 text-white shadow-sm';
            btnUpdate.className = 'flex-1 py-2 px-3 rounded-md font-medium text-xs transition-all bg-slate-100 text-slate-700 hover:bg-slate-200';
        } else {
            btnUpdate.className = 'flex-1 py-2 px-3 rounded-md font-medium text-xs transition-all bg-amber-600 text-white shadow-sm';
            btnQuery.className = 'flex-1 py-2 px-3 rounded-md font-medium text-xs transition-all bg-slate-100 text-slate-700 hover:bg-slate-200';
        }
    }
}

// Handle Form Submission
function handleTicketFormSubmit(e) {
    e.preventDefault();

    const department = document.getElementById('form-department').value;
    const barcode = document.getElementById('form-barcode').value;
    const callerName = document.getElementById('form-caller-name').value;
    const callerNo = document.getElementById('form-caller-no').value;
    const clientCode = document.getElementById('form-client-code').value;
    const queryType = document.getElementById('form-query-type').value;
    const callEndTime = document.getElementById('form-call-end-time').value;
    const notes = document.getElementById('form-notes').value;
    const rawIso = document.getElementById('form-date-time').dataset.rawIso || new Date().toISOString();

    if (!department || !barcode || !callerName || !callerNo || !clientCode || !queryType) {
        showToast('Please fill in all mandatory fields with red asterisks (*)', 'error');
        return;
    }

    try {
        const newTicket = DB.addTicket({
            callDirection: AppState.callDirection,
            callType: AppState.callType,
            department,
            barcode,
            callerName,
            callerNo,
            clientCode,
            queryType,
            createdAt: rawIso,
            callEndTime: callEndTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes,
            status: 'Pending'
        });

        showToast(`Ticket #${newTicket.ticketNo} created successfully! (1-Hour SLA Started)`, 'success');
        resetCallForm();
        renderPendingQueriesSidebar();
        renderStatsCounters();
        renderCurrentTable();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Right-Side Pending Queries Sidebar Render
function renderPendingQueriesSidebar() {
    const container = document.getElementById('pending-queries-list');
    const badgeCount = document.getElementById('pending-badge-count');
    if (!container) return;

    // Get all pending and forwarded-pending queries
    const allTickets = DB.getTickets();
    const pendingTickets = allTickets.filter(t => t.status === 'Pending' || (t.status === 'Forwarded' && t.forwardStatus === 'Pending'));

    if (badgeCount) {
        badgeCount.textContent = pendingTickets.length;
    }

    if (pendingTickets.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 px-4 text-slate-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="font-medium text-sm">No Pending Queries!</p>
                <p class="text-xs text-slate-400 mt-1">All tickets are resolved within the 1-hour SLA target.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingTickets.map(ticket => {
        const metrics = SLATimer.getMetrics(ticket.createdAt);
        const isForwarded = ticket.status === 'Forwarded';

        return `
            <div class="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all ${metrics.glowClass} mb-3 shadow-sm">
                <!-- Header with Ticket & SLA Timer -->
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <span class="font-mono-code font-bold text-xs text-slate-900">${ticket.ticketNo}</span>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="badge text-[10px] py-0 px-1.5 ${ticket.callDirection === 'Incoming' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}">
                                ${ticket.callDirection}
                            </span>
                            <span class="badge text-[10px] py-0 px-1.5 ${ticket.callType === 'Query' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">
                                ${ticket.callType}
                            </span>
                            ${isForwarded ? `<span class="badge text-[10px] py-0 px-1.5 bg-purple-50 text-purple-700 border-purple-200">Forwarded</span>` : ''}
                        </div>
                    </div>
                    <!-- SLA Badge -->
                    <div class="text-right">
                        <span class="badge text-[11px] px-2 py-0.5 ${metrics.badgeClass}">
                            ${metrics.statusLabel}
                        </span>
                    </div>
                </div>

                <!-- SLA Progress Bar -->
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5">
                    <div class="${metrics.barColor} h-full transition-all duration-1000" style="width: ${metrics.percentRemaining}%"></div>
                </div>

                <!-- Details Highlight Grid -->
                <div class="grid grid-cols-2 gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mb-2.5">
                    <div>
                        <span class="text-[10px] text-slate-400 uppercase font-semibold block">Barcode</span>
                        <span class="font-mono-code font-medium text-slate-800 truncate block" title="${ticket.barcode}">
                            🏷️ ${ticket.barcode}
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 uppercase font-semibold block">Department</span>
                        <span class="font-medium text-slate-800 truncate block" title="${ticket.department}">
                            🏢 ${ticket.department}
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 uppercase font-semibold block">Caller</span>
                        <span class="font-medium text-slate-800 truncate block" title="${ticket.callerName} (${ticket.callerNo})">
                            👤 ${ticket.callerName}
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 uppercase font-semibold block">Logged By</span>
                        <span class="font-medium text-slate-800 truncate block" title="${ticket.loggedByName}">
                            🧑‍💻 ${ticket.loggedByName}
                        </span>
                    </div>
                </div>

                <!-- Query Type Snippet -->
                <div class="text-xs text-slate-700 mb-2.5 line-clamp-1">
                    <span class="font-semibold text-slate-900">Query:</span> ${ticket.queryType}
                </div>

                <!-- Quick Action Buttons -->
                <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <button onclick="openResolveModal('${ticket.ticketNo}')" class="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        Resolve
                    </button>
                    <button onclick="openForwardModal('${ticket.ticketNo}')" class="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        Forward
                    </button>
                    <button onclick="openTicketDetailModal('${ticket.ticketNo}')" class="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all" title="View Details">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Navigation Tab Switcher
function switchTab(tabId) {
    AppState.currentTab = tabId;

    // Tab buttons styling
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('bg-blue-50', 'text-blue-700', 'font-semibold');
            tab.classList.remove('text-slate-600', 'hover:bg-slate-50');
        } else {
            tab.classList.remove('bg-blue-50', 'text-blue-700', 'font-semibold');
            tab.classList.add('text-slate-600', 'hover:bg-slate-50');
        }
    });

    // Content panels display
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(panel => {
        if (panel.id === `view-${tabId}`) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    // Render corresponding view data
    renderStatsCounters();
    renderCurrentTable();
}

// Render Master Tables based on active tab and applied filters
function renderCurrentTable() {
    switch (AppState.currentTab) {
        case 'all-queries':
            renderQueriesTable('all');
            break;
        case 'pending-queries':
            renderQueriesTable('pending');
            break;
        case 'done-queries':
            renderQueriesTable('done');
            break;
        case 'forwarded-queries':
            renderQueriesTable('forwarded');
            break;
        case 'employees':
            renderEmployeesTable();
            break;
        case 'settings':
            renderSettingsTables();
            break;
    }
}

// Filter tickets by global & column searches
function getFilteredTickets(category = 'all') {
    let tickets = DB.getTickets();

    // Category Filter
    if (category === 'pending') {
        tickets = tickets.filter(t => t.status === 'Pending' || (t.status === 'Forwarded' && t.forwardStatus === 'Pending'));
    } else if (category === 'done') {
        tickets = tickets.filter(t => t.status === 'Done' || (t.status === 'Forwarded' && t.forwardStatus === 'Resolved'));
    } else if (category === 'forwarded') {
        tickets = tickets.filter(t => t.status === 'Forwarded' || t.forwardedToDepartment);
        if (AppState.forwardSubFilter === 'pending') {
            tickets = tickets.filter(t => t.forwardStatus === 'Pending');
        } else if (AppState.forwardSubFilter === 'resolved') {
            tickets = tickets.filter(t => t.forwardStatus === 'Resolved');
        }
    }

    // Column Filters & Global Search
    const f = AppState.searchFilters;
    const globalQ = f.global.toLowerCase().trim();

    return tickets.filter(t => {
        // Global search across multiple fields
        if (globalQ) {
            const matchesGlobal = 
                (t.ticketNo && t.ticketNo.toLowerCase().includes(globalQ)) ||
                (t.barcode && t.barcode.toLowerCase().includes(globalQ)) ||
                (t.callerName && t.callerName.toLowerCase().includes(globalQ)) ||
                (t.callerNo && t.callerNo.toLowerCase().includes(globalQ)) ||
                (t.clientCode && t.clientCode.toLowerCase().includes(globalQ)) ||
                (t.department && t.department.toLowerCase().includes(globalQ)) ||
                (t.queryType && t.queryType.toLowerCase().includes(globalQ)) ||
                (t.notes && t.notes.toLowerCase().includes(globalQ)) ||
                (t.loggedByName && t.loggedByName.toLowerCase().includes(globalQ));
            if (!matchesGlobal) return false;
        }

        // Column specific searches
        if (f.ticketNo && !t.ticketNo.toLowerCase().includes(f.ticketNo.toLowerCase())) return false;
        if (f.barcode && !t.barcode.toLowerCase().includes(f.barcode.toLowerCase())) return false;
        if (f.callerName && !t.callerName.toLowerCase().includes(f.callerName.toLowerCase())) return false;
        if (f.callerNo && !t.callerNo.toLowerCase().includes(f.callerNo.toLowerCase())) return false;
        if (f.clientCode && !t.clientCode.toLowerCase().includes(f.clientCode.toLowerCase())) return false;
        if (f.department && t.department !== f.department) return false;
        if (f.queryType && t.queryType !== f.queryType) return false;
        if (f.status && t.status !== f.status) return false;
        if (f.date && !t.createdAt.startsWith(f.date)) return false;

        return true;
    });
}

// Render Queries Master Sheet
function renderQueriesTable(category = 'all') {
    const tableBody = document.getElementById(`${category}-table-body`);
    const tableCount = document.getElementById(`${category}-table-count`);
    if (!tableBody) return;

    const tickets = getFilteredTickets(category);
    if (tableCount) tableCount.textContent = `${tickets.length} Records Found`;

    if (tickets.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-8 text-slate-400 font-medium">
                    No matching queries found in this sheet.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tickets.map((t, idx) => {
        const metrics = SLATimer.getMetrics(t.createdAt);
        const isDone = t.status === 'Done' || (t.status === 'Forwarded' && t.forwardStatus === 'Resolved');
        const formattedDate = new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200 text-xs">
                <td class="px-3 py-3 font-semibold text-slate-500">${idx + 1}</td>
                <td class="px-3 py-3 font-mono-code font-bold text-slate-900">${t.ticketNo}</td>
                <td class="px-3 py-3">
                    <span class="badge text-[11px] ${t.callDirection === 'Incoming' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}">
                        ${t.callDirection}
                    </span>
                    <span class="badge text-[11px] ml-1 ${t.callType === 'Query' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}">
                        ${t.callType}
                    </span>
                </td>
                <td class="px-3 py-3 font-mono-code font-semibold text-slate-700">${t.barcode}</td>
                <td class="px-3 py-3">
                    <div class="font-semibold text-slate-800">${t.callerName}</div>
                    <div class="text-[11px] text-slate-500 font-mono-code">${t.callerNo}</div>
                </td>
                <td class="px-3 py-3 font-mono-code font-bold text-slate-800">${t.clientCode}</td>
                <td class="px-3 py-3">
                    <div class="font-medium text-slate-800">${t.department}</div>
                    <div class="text-[11px] text-slate-500 truncate max-w-[180px]" title="${t.queryType}">${t.queryType}</div>
                </td>
                <td class="px-3 py-3 text-slate-600">
                    <div>${formattedDate}</div>
                    <div class="text-[11px] text-slate-400">${formattedTime} (End: ${t.callEndTime || 'N/A'})</div>
                </td>
                <td class="px-3 py-3">
                    ${isDone ? `
                        <span class="badge bg-emerald-100 text-emerald-800 border-emerald-300">
                            ✓ Resolved
                        </span>
                        <div class="text-[10px] text-slate-400 mt-0.5">Done: ${t.resolvedAt ? new Date(t.resolvedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Yes'}</div>
                    ` : `
                        <span class="badge ${metrics.badgeClass}">
                            ${metrics.statusLabel}
                        </span>
                    `}
                </td>
                <td class="px-3 py-3">
                    ${t.status === 'Forwarded' ? `
                        <div class="badge bg-purple-100 text-purple-800 border-purple-300">
                            → ${t.forwardedToDepartment}
                        </div>
                        <div class="text-[10px] font-semibold mt-0.5 ${t.forwardStatus === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}">
                            Status: ${t.forwardStatus || 'Pending'}
                        </div>
                    ` : `
                        <span class="text-slate-400 italic">Direct</span>
                    `}
                </td>
                <td class="px-3 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                        ${!isDone ? `
                            <button onclick="openResolveModal('${t.ticketNo}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Resolve Ticket">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            </button>
                            <button onclick="openForwardModal('${t.ticketNo}')" class="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md" title="Forward Query">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                            </button>
                        ` : ''}
                        <button onclick="openTicketDetailModal('${t.ticketNo}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="View Full Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render All Employees Master Sheet (Admin)
function renderEmployeesTable() {
    const tableBody = document.getElementById('employees-table-body');
    const tableCount = document.getElementById('employees-table-count');
    if (!tableBody) return;

    const employees = DB.getEmployees();
    if (tableCount) tableCount.textContent = `${employees.length} Active Staff`;

    tableBody.innerHTML = employees.map((emp, idx) => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200 text-xs">
            <td class="px-4 py-3 font-semibold text-slate-500">${idx + 1}</td>
            <td class="px-4 py-3 font-mono-code font-bold text-slate-900">${emp.id}</td>
            <td class="px-4 py-3 font-mono-code text-blue-700 font-semibold">${emp.username}</td>
            <td class="px-4 py-3 font-medium text-slate-800">${emp.name}</td>
            <td class="px-4 py-3 font-mono-code text-slate-500">•••••••• <span class="text-[10px] text-slate-400">(${emp.password})</span></td>
            <td class="px-4 py-3">
                <span class="badge ${emp.role === 'Admin' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-blue-100 text-blue-800 border-blue-300'}">
                    ${emp.role}
                </span>
            </td>
            <td class="px-4 py-3 text-slate-700">${emp.department}</td>
            <td class="px-4 py-3 text-slate-600 font-mono-code">${emp.phone || 'N/A'}</td>
            <td class="px-4 py-3">
                <span class="badge ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}">
                    ${emp.status}
                </span>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openResetPasswordModal('${emp.id}')" class="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold transition-all" title="Reset Username or Password">
                        🔑 Reset
                    </button>
                    <button onclick="switchUserRole('${emp.role}', '${emp.id}')" class="py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs font-medium transition-all" title="Simulate Login as this user">
                        👤 Login As
                    </button>
                    ${emp.role !== 'Admin' ? `
                        <button onclick="deleteEmployeePrompt('${emp.id}')" class="p-1 text-rose-500 hover:text-rose-700" title="Delete User">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Render Master Settings (Departments & Query Types)
function renderSettingsTables() {
    // Departments Table
    const deptBody = document.getElementById('settings-dept-table-body');
    if (deptBody) {
        const depts = DB.getDepartments();
        deptBody.innerHTML = depts.map(d => `
            <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
                <td class="px-3 py-2 font-mono-code font-bold text-slate-800">${d.id}</td>
                <td class="px-3 py-2 font-semibold text-slate-900">${d.name}</td>
                <td class="px-3 py-2 font-mono-code text-blue-600 font-bold">${d.code}</td>
                <td class="px-3 py-2 text-slate-600">${d.head}</td>
                <td class="px-3 py-2 text-right">
                    <button onclick="deleteDepartmentPrompt('${d.id}')" class="text-rose-500 hover:text-rose-700 p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Query Types Table
    const qtBody = document.getElementById('settings-qt-table-body');
    if (qtBody) {
        const queryTypes = DB.getQueryTypes();
        qtBody.innerHTML = queryTypes.map(qt => `
            <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
                <td class="px-3 py-2 font-mono-code font-bold text-slate-800">${qt.id}</td>
                <td class="px-3 py-2 font-semibold text-slate-900">${qt.name}</td>
                <td class="px-3 py-2 text-slate-700">${qt.department}</td>
                <td class="px-3 py-2">
                    <span class="badge text-[10px] ${qt.priority === 'Urgent' ? 'bg-rose-100 text-rose-800 border-rose-300' : (qt.priority === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300')}">
                        ${qt.priority}
                    </span>
                </td>
                <td class="px-3 py-2 text-right">
                    <button onclick="deleteQueryTypePrompt('${qt.id}')" class="text-rose-500 hover:text-rose-700 p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Render Dashboard Counters & Stats
function renderStatsCounters() {
    const tickets = DB.getTickets();
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'Pending' || (t.status === 'Forwarded' && t.forwardStatus === 'Pending')).length;
    const done = tickets.filter(t => t.status === 'Done' || (t.status === 'Forwarded' && t.forwardStatus === 'Resolved')).length;
    const forwarded = tickets.filter(t => t.status === 'Forwarded' || t.forwardedToDepartment).length;

    // Overdue SLA calculation
    const overdue = tickets.filter(t => {
        if (t.status === 'Done' || (t.status === 'Forwarded' && t.forwardStatus === 'Resolved')) return false;
        return SLATimer.getMetrics(t.createdAt).isOverdue;
    }).length;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('stat-total-queries', total);
    setVal('stat-pending-queries', pending);
    setVal('stat-done-queries', done);
    setVal('stat-forwarded-queries', forwarded);
    setVal('stat-overdue-sla', overdue);

    // Tab notification badges
    setVal('badge-tab-all', total);
    setVal('badge-tab-pending', pending);
    setVal('badge-tab-done', done);
    setVal('badge-tab-forwarded', forwarded);
}

// Modals Handling
function openResolveModal(ticketNo) {
    const ticket = DB.getTickets().find(t => t.ticketNo === ticketNo);
    if (!ticket) return;

    AppState.selectedTicketForModal = ticket;
    document.getElementById('resolve-ticket-no-display').textContent = ticket.ticketNo;
    document.getElementById('resolve-caller-display').textContent = `${ticket.callerName} (${ticket.clientCode})`;
    document.getElementById('resolve-notes-input').value = '';

    const modal = document.getElementById('modal-resolve-ticket');
    if (modal) modal.classList.remove('hidden');
}

function handleConfirmResolve() {
    if (!AppState.selectedTicketForModal) return;

    const notes = document.getElementById('resolve-notes-input').value;
    DB.resolveTicket(AppState.selectedTicketForModal.ticketNo, notes);
    closeAllModals();
    showToast(`Ticket #${AppState.selectedTicketForModal.ticketNo} marked as Done/Resolved!`, 'success');

    renderPendingQueriesSidebar();
    renderStatsCounters();
    renderCurrentTable();
}

function openForwardModal(ticketNo) {
    const ticket = DB.getTickets().find(t => t.ticketNo === ticketNo);
    if (!ticket) return;

    AppState.selectedTicketForModal = ticket;
    document.getElementById('forward-ticket-no-display').textContent = ticket.ticketNo;
    document.getElementById('forward-current-dept-display').textContent = ticket.department;

    populateDepartmentDropdowns();
    populateEmployeeForwardSelect('');

    const modal = document.getElementById('modal-forward-ticket');
    if (modal) modal.classList.remove('hidden');
}

function handleConfirmForward() {
    if (!AppState.selectedTicketForModal) return;

    const targetDept = document.getElementById('forward-dept-select').value;
    const targetEmp = document.getElementById('forward-emp-select').value;
    const forwardNotes = document.getElementById('forward-notes-input').value;

    if (!targetDept) {
        showToast('Please select a target department to forward this query', 'error');
        return;
    }

    DB.forwardTicket(AppState.selectedTicketForModal.ticketNo, targetDept, targetEmp, forwardNotes);
    closeAllModals();
    showToast(`Query forwarded to ${targetDept} successfully!`, 'success');

    renderPendingQueriesSidebar();
    renderStatsCounters();
    renderCurrentTable();
}

function openTicketDetailModal(ticketNo) {
    const ticket = DB.getTickets().find(t => t.ticketNo === ticketNo);
    if (!ticket) return;

    const metrics = SLATimer.getMetrics(ticket.createdAt);
    const content = document.getElementById('ticket-detail-content');
    if (!content) return;

    content.innerHTML = `
        <div class="space-y-4 text-xs text-slate-700">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                    <h3 class="font-mono-code font-bold text-base text-slate-900">${ticket.ticketNo}</h3>
                    <span class="text-[11px] text-slate-500">Created: ${new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div class="text-right">
                    <span class="badge ${ticket.status === 'Done' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : metrics.badgeClass}">
                        ${ticket.status === 'Done' ? '✓ Resolved' : metrics.statusLabel}
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Call Direction</span>
                    <span class="font-semibold text-slate-900">${ticket.callDirection}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Call Type</span>
                    <span class="font-semibold text-slate-900">${ticket.callType}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Barcode</span>
                    <span class="font-mono-code font-bold text-blue-700">${ticket.barcode}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Client Code</span>
                    <span class="font-mono-code font-bold text-slate-900">${ticket.clientCode}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Caller Name</span>
                    <span class="font-medium text-slate-800">${ticket.callerName}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Caller Number</span>
                    <span class="font-mono-code font-medium text-slate-800">${ticket.callerNo}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Department</span>
                    <span class="font-medium text-slate-800">${ticket.department}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Call End Time</span>
                    <span class="font-medium text-slate-800">${ticket.callEndTime || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Logged By</span>
                    <span class="font-medium text-slate-800">${ticket.loggedByName}</span>
                </div>
            </div>

            <div>
                <span class="text-[11px] font-bold text-slate-900 uppercase block mb-1">Query Type</span>
                <p class="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium">${ticket.queryType}</p>
            </div>

            <div>
                <span class="text-[11px] font-bold text-slate-900 uppercase block mb-1">Call Notes / Problem Description</span>
                <p class="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 whitespace-pre-wrap">${ticket.notes || 'No extra notes provided.'}</p>
            </div>

            ${ticket.forwardedToDepartment ? `
                <div class="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                    <span class="font-bold text-purple-900 block mb-1">Forwarding Information</span>
                    <p class="text-purple-800">Forwarded to <strong>${ticket.forwardedToDepartment}</strong> ${ticket.forwardedToEmployee ? `(Agent: ${ticket.forwardedToEmployee})` : ''} — Current Status: <strong>${ticket.forwardStatus || 'Pending'}</strong></p>
                </div>
            ` : ''}

            ${ticket.resolvedAt ? `
                <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    <span class="font-bold text-emerald-900 block mb-1">Resolution Details</span>
                    <p class="text-emerald-800 mb-1">Resolved on: <strong>${new Date(ticket.resolvedAt).toLocaleString()}</strong></p>
                    <p class="text-emerald-700">${ticket.resolutionNotes || 'Standard resolution'}</p>
                </div>
            ` : ''}
        </div>
    `;

    const modal = document.getElementById('modal-ticket-details');
    if (modal) modal.classList.remove('hidden');
}

// Reset Password Modal (Admin)
function openResetPasswordModal(empId) {
    const emp = DB.getEmployees().find(e => e.id === empId);
    if (!emp) return;

    AppState.selectedEmployeeForModal = emp;
    document.getElementById('reset-emp-name-display').textContent = `${emp.name} (${emp.id})`;
    document.getElementById('reset-username-input').value = emp.username;
    document.getElementById('reset-password-input').value = '';

    const modal = document.getElementById('modal-reset-password');
    if (modal) modal.classList.remove('hidden');
}

function handleConfirmResetPassword() {
    if (!AppState.selectedEmployeeForModal) return;

    const newUsername = document.getElementById('reset-username-input').value;
    const newPassword = document.getElementById('reset-password-input').value;

    if (!newUsername || !newPassword) {
        showToast('Username and new password cannot be blank', 'error');
        return;
    }

    try {
        DB.updateEmployee(AppState.selectedEmployeeForModal.id, {
            username: newUsername,
            password: newPassword
        });
        closeAllModals();
        showToast(`Credentials updated for ${AppState.selectedEmployeeForModal.name}!`, 'success');
        renderEmployeesTable();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Add New Employee Modal Handler
function handleAddEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('new-emp-name').value;
    const username = document.getElementById('new-emp-username').value;
    const password = document.getElementById('new-emp-password').value;
    const role = document.getElementById('new-emp-role').value;
    const department = document.getElementById('emp-department-select').value;
    const phone = document.getElementById('new-emp-phone').value;

    try {
        DB.addEmployee({ name, username, password, role, department, phone });
        closeAllModals();
        document.getElementById('form-add-employee').reset();
        showToast(`Employee "${name}" created successfully!`, 'success');
        renderEmployeesTable();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Add New Department Handler
function handleAddDepartment(e) {
    e.preventDefault();
    const name = document.getElementById('new-dept-name').value;
    const code = document.getElementById('new-dept-code').value;
    const head = document.getElementById('new-dept-head').value;

    try {
        DB.addDepartment({ name, code, head });
        closeAllModals();
        document.getElementById('form-add-department').reset();
        populateDepartmentDropdowns();
        renderSettingsTables();
        showToast(`Department "${name}" added!`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Add New Query Type Handler
function handleAddQueryType(e) {
    e.preventDefault();
    const name = document.getElementById('new-qt-name').value;
    const department = document.getElementById('new-qt-dept-select').value;
    const priority = document.getElementById('new-qt-priority').value;
    const description = document.getElementById('new-qt-desc').value;

    try {
        DB.addQueryType({ name, department, priority, description });
        closeAllModals();
        document.getElementById('form-add-query-type').reset();
        populateQueryTypeDropdowns();
        renderSettingsTables();
        showToast(`Query type "${name}" registered!`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteEmployeePrompt(id) {
    if (confirm(`Are you sure you want to delete employee ${id}?`)) {
        DB.deleteEmployee(id);
        renderEmployeesTable();
        showToast('Employee removed', 'info');
    }
}

function deleteDepartmentPrompt(id) {
    if (confirm(`Delete department ${id}?`)) {
        DB.deleteDepartment(id);
        populateDepartmentDropdowns();
        renderSettingsTables();
        showToast('Department removed', 'info');
    }
}

function deleteQueryTypePrompt(id) {
    if (confirm(`Delete query type ${id}?`)) {
        DB.deleteQueryType(id);
        populateQueryTypeDropdowns();
        renderSettingsTables();
        showToast('Query type removed', 'info');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-dialog-overlay').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Excel Export Engine powered by SheetJS (XLSX)
function exportTableToExcel(category = 'all') {
    const tickets = getFilteredTickets(category);
    if (tickets.length === 0) {
        showToast('No query data available to export.', 'warning');
        return;
    }

    const excelData = tickets.map((t, idx) => ({
        "Sr No": idx + 1,
        "Ticket Number": t.ticketNo,
        "Direction": t.callDirection,
        "Call Type": t.callType,
        "Barcode": t.barcode,
        "Client Code": t.clientCode,
        "Caller Name": t.callerName,
        "Caller Number": t.callerNo,
        "Department": t.department,
        "Query Type": t.queryType,
        "Date & Time Logged": new Date(t.createdAt).toLocaleString(),
        "Call End Time": t.callEndTime || '',
        "Status": t.status,
        "Forwarded To Department": t.forwardedToDepartment || 'N/A',
        "Forwarded To Employee": t.forwardedToEmployee || 'N/A',
        "Forward Status": t.forwardStatus || 'N/A',
        "Logged By Agent": `${t.loggedByName} (${t.loggedBy})`,
        "Notes": t.notes || '',
        "Resolved At": t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : 'N/A',
        "Resolution Notes": t.resolutionNotes || ''
    }));

    // Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Queries_${category.toUpperCase()}`);

    // Auto-fit column widths
    const columnWidths = [
        { wch: 6 },  // Sr No
        { wch: 22 }, // Ticket No
        { wch: 10 }, // Direction
        { wch: 10 }, // Call Type
        { wch: 16 }, // Barcode
        { wch: 12 }, // Client Code
        { wch: 18 }, // Caller Name
        { wch: 16 }, // Caller No
        { wch: 24 }, // Department
        { wch: 26 }, // Query Type
        { wch: 22 }, // Date & Time
        { wch: 12 }, // Call End
        { wch: 10 }, // Status
        { wch: 22 }, // Forward Dept
        { wch: 18 }, // Forward Emp
        { wch: 14 }, // Forward Status
        { wch: 20 }, // Logged By
        { wch: 30 }, // Notes
        { wch: 22 }, // Resolved At
        { wch: 30 }  // Resolution Notes
    ];
    worksheet['!cols'] = columnWidths;

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `Call_Query_Master_Export_${category.toUpperCase()}_${dateStamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
    showToast(`Spreadsheet exported: ${filename}`, 'success');
}

// 1-Month Auto-Export & Purge Notice Check
function checkMonthlyArchiveNotice() {
    const archiveStatus = DB.checkAndPerformMonthlyAutoArchive();
    const banner = document.getElementById('monthly-archive-banner');

    if (archiveStatus.required && banner) {
        banner.classList.remove('hidden');
        const countDisplay = document.getElementById('archive-old-records-count');
        if (countDisplay) countDisplay.textContent = archiveStatus.count;
    }
}

function handleAutoExportAndPurge() {
    // 1. Export all records older than 30 days
    exportTableToExcel('all');

    // 2. Purge records from active table
    const result = DB.purgeTicketsOlderThan(30);

    const banner = document.getElementById('monthly-archive-banner');
    if (banner) banner.classList.add('hidden');

    showToast(`Auto-Export completed! ${result.purgedCount} archived records safely purged.`, 'success');
    renderPendingQueriesSidebar();
    renderStatsCounters();
    renderCurrentTable();
}

// Search Filter Handlers
function handleGlobalSearchInput(val) {
    AppState.searchFilters.global = val;
    renderCurrentTable();
}

function handleColumnSearchInput(columnKey, val) {
    AppState.searchFilters[columnKey] = val;
    renderCurrentTable();
}

function clearAllFilters() {
    AppState.searchFilters = {
        global: '', ticketNo: '', barcode: '', callerName: '',
        callerNo: '', clientCode: '', department: '', queryType: '', status: '', date: ''
    };

    // Clear UI inputs
    document.querySelectorAll('.column-filter-input').forEach(input => input.value = '');
    const globalInput = document.getElementById('global-search-input');
    if (globalInput) globalInput.value = '';

    renderCurrentTable();
    showToast('Search filters cleared', 'info');
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
        warning: 'bg-amber-600 text-white',
        info: 'bg-slate-800 text-white'
    };

    toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-2 opacity-75 hover:opacity-100">&times;</button>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Event Listeners Setup
function setupEventListeners() {
    // Ticket logging form submit
    const ticketForm = document.getElementById('ticket-call-form');
    if (ticketForm) ticketForm.addEventListener('submit', handleTicketFormSubmit);

    // Department change dynamically updates query types in form
    const formDept = document.getElementById('form-department');
    if (formDept) {
        formDept.addEventListener('change', (e) => {
            populateQueryTypeDropdowns(e.target.value);
        });
    }

    // Modal Forms
    const addEmpForm = document.getElementById('form-add-employee');
    if (addEmpForm) addEmpForm.addEventListener('submit', handleAddEmployee);

    const addDeptForm = document.getElementById('form-add-department');
    if (addDeptForm) addDeptForm.addEventListener('submit', handleAddDepartment);

    const addQtForm = document.getElementById('form-add-query-type');
    if (addQtForm) addQtForm.addEventListener('submit', handleAddQueryType);

    // Target Dept change in Forward modal
    const forwardDept = document.getElementById('forward-dept-select');
    if (forwardDept) {
        forwardDept.addEventListener('change', (e) => {
            populateEmployeeForwardSelect(e.target.value);
        });
    }

    // Global Search Debounce
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => handleGlobalSearchInput(e.target.value));
    }
}
