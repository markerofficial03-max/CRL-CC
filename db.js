/**
 * Database & Storage Engine for Call & Query Support System
 * Handles LocalStorage persistence, seed data, authentication, and 1-month auto-export/purge
 */

const DB_KEYS = {
    EMPLOYEES: 'qms_employees',
    DEPARTMENTS: 'qms_departments',
    QUERY_TYPES: 'qms_query_types',
    TICKETS: 'qms_tickets',
    CURRENT_USER: 'qms_current_user',
    APP_SETTINGS: 'qms_settings',
    LAST_ARCHIVE_DATE: 'qms_last_archive_date'
};

const DB = {
    // Initialize Database with rich seed data if not present
    init() {
        if (!localStorage.getItem(DB_KEYS.DEPARTMENTS)) {
            const initialDepartments = [
                { id: 'DEP-001', name: 'Technical Support', code: 'TECH', head: 'John Doe', status: 'Active' },
                { id: 'DEP-002', name: 'Billing & Accounts', code: 'BILL', head: 'Sarah Smith', status: 'Active' },
                { id: 'DEP-003', name: 'Customer Logistics & Delivery', code: 'LOGI', head: 'Rajesh Kumar', status: 'Active' },
                { id: 'DEP-004', name: 'Sales & Onboarding', code: 'SALE', head: 'Emma Watson', status: 'Active' },
                { id: 'DEP-005', name: 'Hardware Repair & RMA', code: 'HDWR', head: 'Michael Chang', status: 'Active' }
            ];
            localStorage.setItem(DB_KEYS.DEPARTMENTS, JSON.stringify(initialDepartments));
        }

        if (!localStorage.getItem(DB_KEYS.QUERY_TYPES)) {
            const initialQueryTypes = [
                { id: 'QT-001', name: 'Barcode Scan Failure', department: 'Technical Support', priority: 'High', description: 'Scanner unable to read barcode label' },
                { id: 'QT-002', name: 'Payment Gateway Error', department: 'Billing & Accounts', priority: 'Urgent', description: 'Client billing transaction failed' },
                { id: 'QT-003', name: 'Order Shipment Delay', department: 'Customer Logistics & Delivery', priority: 'Medium', description: 'Tracking status delayed or stuck' },
                { id: 'QT-004', name: 'New Client Portal Setup', department: 'Sales & Onboarding', priority: 'Medium', description: 'Initial onboarding credentials setup' },
                { id: 'QT-005', name: 'Hardware Return / RMA', department: 'Hardware Repair & RMA', priority: 'High', description: 'Defective unit replacement query' },
                { id: 'QT-006', name: 'General Information & Inquiry', department: 'Customer Logistics & Delivery', priority: 'Low', description: 'Product and service inquiries' }
            ];
            localStorage.setItem(DB_KEYS.QUERY_TYPES, JSON.stringify(initialQueryTypes));
        }

        if (!localStorage.getItem(DB_KEYS.EMPLOYEES)) {
            const initialEmployees = [
                {
                    id: 'EMP-001',
                    username: 'admin',
                    name: 'System Administrator',
                    password: 'admin', // Default password
                    role: 'Admin',
                    department: 'Technical Support',
                    phone: '+1 800 555 0199',
                    status: 'Active',
                    createdDate: new Date(Date.now() - 30 * 86400000).toISOString()
                },
                {
                    id: 'EMP-002',
                    username: 'emp_rahul',
                    name: 'Rahul Sharma',
                    password: '123',
                    role: 'Employee',
                    department: 'Technical Support',
                    phone: '+91 98765 43210',
                    status: 'Active',
                    createdDate: new Date(Date.now() - 20 * 86400000).toISOString()
                },
                {
                    id: 'EMP-003',
                    username: 'emp_priya',
                    name: 'Priya Patel',
                    password: '123',
                    role: 'Employee',
                    department: 'Billing & Accounts',
                    phone: '+91 98765 12345',
                    status: 'Active',
                    createdDate: new Date(Date.now() - 15 * 86400000).toISOString()
                },
                {
                    id: 'EMP-004',
                    username: 'emp_alex',
                    name: 'Alex Johnson',
                    password: '123',
                    role: 'Employee',
                    department: 'Customer Logistics & Delivery',
                    phone: '+1 555 234 5678',
                    status: 'Active',
                    createdDate: new Date(Date.now() - 10 * 86400000).toISOString()
                }
            ];
            localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
        }

        if (!localStorage.getItem(DB_KEYS.TICKETS)) {
            const now = Date.now();
            const initialTickets = [
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1001',
                    callDirection: 'Incoming',
                    callType: 'Query',
                    department: 'Technical Support',
                    barcode: 'BAR-98432190',
                    callerName: 'David Miller',
                    callerNo: '+1 415 889 0012',
                    clientCode: 'CLI-8801',
                    queryType: 'Barcode Scan Failure',
                    createdAt: new Date(now - 12 * 60000).toISOString(), // 12 mins ago (48m left)
                    callEndTime: '14:30',
                    status: 'Pending', // Pending | Done | Forwarded
                    forwardedToDepartment: '',
                    forwardedToEmployee: '',
                    forwardStatus: '', // '' | 'Pending' | 'Resolved'
                    loggedBy: 'emp_rahul',
                    loggedByName: 'Rahul Sharma',
                    notes: 'Barcode scanner emits red blink on retail label series #5.',
                    resolvedAt: null,
                    resolutionNotes: ''
                },
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1002',
                    callDirection: 'Incoming',
                    callType: 'Query',
                    department: 'Billing & Accounts',
                    barcode: 'BAR-44219088',
                    callerName: 'Alicia Keys',
                    callerNo: '+1 212 998 3344',
                    clientCode: 'CLI-9042',
                    queryType: 'Payment Gateway Error',
                    createdAt: new Date(now - 42 * 60000).toISOString(), // 42 mins ago (18m left - Warning)
                    callEndTime: '14:45',
                    status: 'Pending',
                    forwardedToDepartment: '',
                    forwardedToEmployee: '',
                    forwardStatus: '',
                    loggedBy: 'emp_priya',
                    loggedByName: 'Priya Patel',
                    notes: 'Invoice #8892 charged twice on Visa checkout portal.',
                    resolvedAt: null,
                    resolutionNotes: ''
                },
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1003',
                    callDirection: 'Outgoing',
                    callType: 'Update',
                    department: 'Customer Logistics & Delivery',
                    barcode: 'BAR-11984420',
                    callerName: 'Robert Lang',
                    callerNo: '+1 617 400 9911',
                    clientCode: 'CLI-3104',
                    queryType: 'Order Shipment Delay',
                    createdAt: new Date(now - 68 * 60000).toISOString(), // 68 mins ago (OVERDUE SLA)
                    callEndTime: '13:50',
                    status: 'Pending',
                    forwardedToDepartment: '',
                    forwardedToEmployee: '',
                    forwardStatus: '',
                    loggedBy: 'emp_alex',
                    loggedByName: 'Alex Johnson',
                    notes: 'Called customer to inform customs clearance dispatch verification.',
                    resolvedAt: null,
                    resolutionNotes: ''
                },
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1004',
                    callDirection: 'Incoming',
                    callType: 'Query',
                    department: 'Hardware Repair & RMA',
                    barcode: 'BAR-77621004',
                    callerName: 'Marcus Vance',
                    callerNo: '+1 312 600 7712',
                    clientCode: 'CLI-5520',
                    queryType: 'Hardware Return / RMA',
                    createdAt: new Date(now - 25 * 60000).toISOString(),
                    callEndTime: '14:15',
                    status: 'Forwarded',
                    forwardedToDepartment: 'Technical Support',
                    forwardedToEmployee: 'emp_rahul',
                    forwardStatus: 'Pending', // Forwarded and still pending
                    loggedBy: 'emp_alex',
                    loggedByName: 'Alex Johnson',
                    notes: 'Forwarded hardware diagnostic to level 2 technician.',
                    resolvedAt: null,
                    resolutionNotes: ''
                },
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1005',
                    callDirection: 'Outgoing',
                    callType: 'Query',
                    department: 'Sales & Onboarding',
                    barcode: 'BAR-33019876',
                    callerName: 'Samantha Green',
                    callerNo: '+1 408 555 7788',
                    clientCode: 'CLI-1109',
                    queryType: 'New Client Portal Setup',
                    createdAt: new Date(now - 120 * 60000).toISOString(),
                    callEndTime: '12:30',
                    status: 'Done',
                    forwardedToDepartment: '',
                    forwardedToEmployee: '',
                    forwardStatus: '',
                    loggedBy: 'emp_priya',
                    loggedByName: 'Priya Patel',
                    notes: 'Portal credentials emailed and 2FA verified successfully.',
                    resolvedAt: new Date(now - 85 * 60000).toISOString(),
                    resolutionNotes: 'Client logged in and confirmed access.'
                },
                {
                    ticketNo: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-1006',
                    callDirection: 'Incoming',
                    callType: 'Update',
                    department: 'Technical Support',
                    barcode: 'BAR-88220011',
                    callerName: 'Vikram Singh',
                    callerNo: '+91 99001 22334',
                    clientCode: 'CLI-7721',
                    queryType: 'Barcode Scan Failure',
                    createdAt: new Date(now - 90 * 60000).toISOString(),
                    callEndTime: '13:00',
                    status: 'Forwarded',
                    forwardedToDepartment: 'Hardware Repair & RMA',
                    forwardedToEmployee: 'emp_alex',
                    forwardStatus: 'Resolved', // Forwarded and resolved
                    loggedBy: 'emp_rahul',
                    loggedByName: 'Rahul Sharma',
                    notes: 'Optical sensor cleaned and recalibrated on site.',
                    resolvedAt: new Date(now - 30 * 60000).toISOString(),
                    resolutionNotes: 'Hardware team confirmed scanner calibration complete.'
                }
            ];
            localStorage.setItem(DB_KEYS.TICKETS, JSON.stringify(initialTickets));
        }
    },

    // Authentication & Session Management
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem(DB_KEYS.CURRENT_USER);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(DB_KEYS.CURRENT_USER);
        }
    },

    login(username, password) {
        const employees = this.getEmployees();
        const trimmedUsername = (username || '').trim().toLowerCase();
        const trimmedPassword = (password || '').trim();

        const user = employees.find(e => e.username.toLowerCase() === trimmedUsername && e.password === trimmedPassword);

        if (!user) {
            throw new Error('Invalid Username or Password! Please check your credentials.');
        }

        if (user.status !== 'Active') {
            throw new Error('This account has been deactivated. Please contact your Administrator.');
        }

        this.setCurrentUser(user);
        return user;
    },

    logout() {
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
    },

    // Employee Operations
    getEmployees() {
        return JSON.parse(localStorage.getItem(DB_KEYS.EMPLOYEES) || '[]');
    },

    addEmployee(empData) {
        const employees = this.getEmployees();
        const newEmp = {
            id: 'EMP-' + String(employees.length + 1).padStart(3, '0'),
            username: empData.username.trim().toLowerCase(),
            name: empData.name.trim(),
            password: empData.password || '123456',
            role: empData.role || 'Employee',
            department: empData.department,
            phone: empData.phone || '',
            status: empData.status || 'Active',
            createdDate: new Date().toISOString()
        };

        // Check if username already exists
        if (employees.some(e => e.username === newEmp.username)) {
            throw new Error(`Username "${newEmp.username}" already exists!`);
        }

        employees.push(newEmp);
        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));
        return newEmp;
    },

    updateEmployee(id, updatedFields) {
        const employees = this.getEmployees();
        const index = employees.findIndex(e => e.id === id);
        if (index === -1) throw new Error('Employee not found');

        // Check unique username if changed
        if (updatedFields.username) {
            const trimmedUsername = updatedFields.username.trim().toLowerCase();
            if (employees.some(e => e.id !== id && e.username === trimmedUsername)) {
                throw new Error(`Username "${trimmedUsername}" is already taken!`);
            }
            updatedFields.username = trimmedUsername;
        }

        employees[index] = { ...employees[index], ...updatedFields };
        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));

        // Update session if editing current logged-in user
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === id) {
            this.setCurrentUser(employees[index]);
        }

        return employees[index];
    },

    resetEmployeePassword(id, newPassword) {
        return this.updateEmployee(id, { password: newPassword });
    },

    deleteEmployee(id) {
        let employees = this.getEmployees();
        employees = employees.filter(e => e.id !== id);
        localStorage.setItem(DB_KEYS.EMPLOYEES, JSON.stringify(employees));
    },

    // Department Operations
    getDepartments() {
        return JSON.parse(localStorage.getItem(DB_KEYS.DEPARTMENTS) || '[]');
    },

    addDepartment(deptData) {
        const depts = this.getDepartments();
        const newDept = {
            id: 'DEP-' + String(depts.length + 1).padStart(3, '0'),
            name: deptData.name.trim(),
            code: (deptData.code || deptData.name.substring(0, 4)).toUpperCase().trim(),
            head: deptData.head || 'Unassigned',
            status: deptData.status || 'Active'
        };

        if (depts.some(d => d.name.toLowerCase() === newDept.name.toLowerCase())) {
            throw new Error(`Department "${newDept.name}" already exists!`);
        }

        depts.push(newDept);
        localStorage.setItem(DB_KEYS.DEPARTMENTS, JSON.stringify(depts));
        return newDept;
    },

    deleteDepartment(id) {
        let depts = this.getDepartments();
        depts = depts.filter(d => d.id !== id);
        localStorage.setItem(DB_KEYS.DEPARTMENTS, JSON.stringify(depts));
    },

    // Query Types Operations
    getQueryTypes() {
        return JSON.parse(localStorage.getItem(DB_KEYS.QUERY_TYPES) || '[]');
    },

    addQueryType(qtData) {
        const types = this.getQueryTypes();
        const newType = {
            id: 'QT-' + String(types.length + 1).padStart(3, '0'),
            name: qtData.name.trim(),
            department: qtData.department || 'General',
            priority: qtData.priority || 'Medium',
            description: qtData.description || ''
        };

        if (types.some(t => t.name.toLowerCase() === newType.name.toLowerCase() && t.department === newType.department)) {
            throw new Error(`Query type "${newType.name}" already exists in ${newType.department}!`);
        }

        types.push(newType);
        localStorage.setItem(DB_KEYS.QUERY_TYPES, JSON.stringify(types));
        return newType;
    },

    deleteQueryType(id) {
        let types = this.getQueryTypes();
        types = types.filter(t => t.id !== id);
        localStorage.setItem(DB_KEYS.QUERY_TYPES, JSON.stringify(types));
    },

    // Ticket & Call Logging Operations
    getTickets() {
        return JSON.parse(localStorage.getItem(DB_KEYS.TICKETS) || '[]');
    },

    generateNextTicketNumber() {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const tickets = this.getTickets();
        const todayTickets = tickets.filter(t => t.ticketNo && t.ticketNo.includes(`TKT-${dateStr}`));
        const nextSeq = 1001 + todayTickets.length;
        return `TKT-${dateStr}-${nextSeq}`;
    },

    addTicket(ticketData) {
        const tickets = this.getTickets();
        const user = this.getCurrentUser() || { username: 'system', name: 'System Agent' };

        const newTicket = {
            ticketNo: ticketData.ticketNo || this.generateNextTicketNumber(),
            callDirection: ticketData.callDirection || 'Incoming', // 'Incoming' | 'Outgoing'
            callType: ticketData.callType || 'Query', // 'Query' | 'Update'
            department: ticketData.department,
            barcode: ticketData.barcode.trim(),
            callerName: ticketData.callerName.trim(),
            callerNo: ticketData.callerNo.trim(),
            clientCode: ticketData.clientCode.trim().toUpperCase(),
            queryType: ticketData.queryType,
            createdAt: ticketData.createdAt || new Date().toISOString(),
            callEndTime: ticketData.callEndTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: ticketData.status || 'Pending', // 'Pending' | 'Done' | 'Forwarded'
            forwardedToDepartment: ticketData.forwardedToDepartment || '',
            forwardedToEmployee: ticketData.forwardedToEmployee || '',
            forwardStatus: ticketData.forwardStatus || '', // '' | 'Pending' | 'Resolved'
            loggedBy: user.username,
            loggedByName: user.name,
            notes: ticketData.notes || '',
            resolvedAt: ticketData.status === 'Done' ? new Date().toISOString() : null,
            resolutionNotes: ticketData.resolutionNotes || ''
        };

        // Insert at beginning so newest appears first
        tickets.unshift(newTicket);
        localStorage.setItem(DB_KEYS.TICKETS, JSON.stringify(tickets));
        return newTicket;
    },

    updateTicket(ticketNo, updateFields) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.ticketNo === ticketNo);
        if (index === -1) throw new Error('Ticket not found');

        tickets[index] = { ...tickets[index], ...updateFields };
        localStorage.setItem(DB_KEYS.TICKETS, JSON.stringify(tickets));
        return tickets[index];
    },

    resolveTicket(ticketNo, resolutionNotes = '') {
        const now = new Date().toISOString();
        const ticket = this.getTickets().find(t => t.ticketNo === ticketNo);
        if (!ticket) throw new Error('Ticket not found');

        const updateData = {
            status: 'Done',
            resolvedAt: now,
            resolutionNotes: resolutionNotes || 'Query resolved successfully within target SLA.'
        };

        // If it was forwarded, mark forwarded status as resolved
        if (ticket.status === 'Forwarded' || ticket.forwardedToDepartment) {
            updateData.forwardStatus = 'Resolved';
        }

        return this.updateTicket(ticketNo, updateData);
    },

    forwardTicket(ticketNo, targetDepartment, targetEmployee = '', notes = '') {
        return this.updateTicket(ticketNo, {
            status: 'Forwarded',
            forwardedToDepartment: targetDepartment,
            forwardedToEmployee: targetEmployee,
            forwardStatus: 'Pending',
            notes: notes ? `${notes} (Forwarded to ${targetDepartment})` : `Forwarded to ${targetDepartment}`
        });
    },

    deleteTicket(ticketNo) {
        let tickets = this.getTickets();
        tickets = tickets.filter(t => t.ticketNo !== ticketNo);
        localStorage.setItem(DB_KEYS.TICKETS, JSON.stringify(tickets));
    },

    // 1-Month Auto-Export and Purge Engine
    checkAndPerformMonthlyAutoArchive() {
        const tickets = this.getTickets();
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
        const oldTickets = tickets.filter(t => new Date(t.createdAt).getTime() < oneMonthAgo);

        if (oldTickets.length === 0) {
            return { required: false, count: 0 };
        }

        return {
            required: true,
            count: oldTickets.length,
            oldTickets: oldTickets
        };
    },

    purgeTicketsOlderThan(days = 30) {
        const tickets = this.getTickets();
        const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
        const retainedTickets = tickets.filter(t => new Date(t.createdAt).getTime() >= threshold);
        const purgedCount = tickets.length - retainedTickets.length;

        localStorage.setItem(DB_KEYS.TICKETS, JSON.stringify(retainedTickets));
        localStorage.setItem(DB_KEYS.LAST_ARCHIVE_DATE, new Date().toISOString());

        return { purgedCount, remainingCount: retainedTickets.length };
    },

    resetDatabaseToDefault() {
        localStorage.removeItem(DB_KEYS.EMPLOYEES);
        localStorage.removeItem(DB_KEYS.DEPARTMENTS);
        localStorage.removeItem(DB_KEYS.QUERY_TYPES);
        localStorage.removeItem(DB_KEYS.TICKETS);
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
        this.init();
    }
};

// Auto-run DB init on script load
DB.init();
