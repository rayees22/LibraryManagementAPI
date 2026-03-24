// Base API URL
const API_BASE = 'https://librarymanagementapi-i03b.onrender.com/api';

// State
let currentAuthTab = 'User';
let currentAuthMode = 'login'; // 'login' or 'register'

// Elements - Auth
const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authSwitchText = document.getElementById('auth-switch-text');
const forgotPwdText = document.getElementById('forgot-pwd-text');

// Elements - Library
const librarySection = document.getElementById('library-section');
const welcomeMessage = document.getElementById('welcome-message');
const adminActions = document.getElementById('admin-actions');
const thActions = document.getElementById('th-actions');
const booksTbody = document.getElementById('books-tbody');
const searchInput = document.getElementById('search-input');

// Elements - Modal & Notification
const bookModal = document.getElementById('book-modal');
const bookForm = document.getElementById('book-form');
const modalTitle = document.getElementById('modal-title');
const notificationOverlay = document.getElementById('notification-overlay');
const notificationMessage = document.getElementById('notification-message');
const notificationIcon = document.getElementById('notification-icon');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    checkAuthContext();
    setupEnterKeyNavigation();
});

// Force log out on page refresh or close
window.addEventListener('beforeunload', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('permissionStatus');
});

// --- Loading System ---
const globalLoadingOverlay = document.getElementById('global-loading-overlay');
const globalLoadingMessage = document.getElementById('loading-message');

function showLoading(message = 'Processing...') {
    if (globalLoadingMessage) globalLoadingMessage.innerText = message;
    if (globalLoadingOverlay) globalLoadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    if (globalLoadingOverlay) globalLoadingOverlay.classList.add('hidden');
}

// --- Auth UI Logic ---
function switchTab(tab) {
    currentAuthTab = tab;
    document.getElementById('tab-admin').classList.toggle('active', tab === 'Admin');
    document.getElementById('tab-user').classList.toggle('active', tab === 'User');
    updateAuthUI();
}

function toggleAuthMode() {
    currentAuthMode = (currentAuthMode === 'login') ? 'register' : 'login';
    updateAuthUI();
}

function updateAuthUI() {
    const actionText = currentAuthMode === 'login' ? 'Login' : 'Register';
    authTitle.innerText = `${currentAuthTab} ${actionText}`;

    if (currentAuthMode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authSwitchText.innerHTML = `Don't have an account? <span class="link" onclick="toggleAuthMode()">Create Account</span>`;
        if (forgotPwdText) forgotPwdText.classList.remove('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        authSwitchText.innerHTML = `Already have an account? <span class="link" onclick="toggleAuthMode()">Login</span>`;
        if (forgotPwdText) forgotPwdText.classList.add('hidden');
    }

    if (currentAuthTab === 'Admin') {
        document.getElementById('login-username').placeholder = 'Username';
        document.getElementById('login-username').type = 'text';
        document.getElementById('auth-switch-container').classList.add('hidden');
        if (currentAuthMode === 'register') toggleAuthMode(); // force login mode
    } else {
        document.getElementById('login-username').placeholder = 'Email';
        document.getElementById('login-username').type = 'email';
        document.getElementById('auth-switch-container').classList.remove('hidden');
    }
}

// --- Notification System ---
function showNotification(message, isError = false) {
    notificationMessage.innerText = message;

    if (isError) {
        notificationIcon.className = 'fa-solid fa-circle-xmark error';
    } else {
        notificationIcon.className = 'fa-solid fa-circle-check';
    }

    notificationOverlay.classList.remove('hidden');

    setTimeout(() => {
        notificationOverlay.classList.add('hidden');
    }, 3000);
}

// --- API Calls & Auth Actions ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    showLoading('Logging in...');
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.ok) {
            const actualRole = data.message.includes("Admin") ? "Admin" : "User";

            // Revert login if wrong panel
            if (currentAuthTab !== actualRole) {
                hideLoading();
                showNotification(`Please use the ${actualRole} panel to login!`, true);
                return;
            }

            // Save Token and Identity
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', actualRole);
            if (data.permissionStatus) {
                localStorage.setItem('permissionStatus', data.permissionStatus);
            }

            hideLoading();
            showNotification(data.message || 'Login successful!');
            loginForm.reset();
            setTimeout(() => checkAuthContext(), 500); // Transition to app
        } else {
            hideLoading();
            showNotification(data || 'Login failed', true);
        }
    } catch (error) {
        hideLoading();
        showNotification('Connection error. Please try again.', true);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstname = document.getElementById('reg-firstname').value;
    const lastname = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    showLoading('Registering...');
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: firstname, lastName: lastname, email: email, password: password })
        });

        hideLoading();
        if (response.ok) {
            const successMsg = currentAuthTab === 'Admin' ? 'Admin account created successfully.' : 'User account created successfully.';
            showNotification(successMsg);
            toggleAuthMode(); // Switch back to login
            registerForm.reset();
        } else {
            const err = await response.text();
            showNotification(err || 'Registration failed', true);
        }
    } catch (error) {
        hideLoading();
        showNotification('Error connecting to API', true);
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('permissionStatus');
    loginForm.reset();
    registerForm.reset();
    checkAuthContext();
    showNotification('Logged out successfully');
}

// --- Context Switch ---
function checkAuthContext() {
    const token = localStorage.getItem('token');
    if (token) {
        authSection.classList.add('hidden');
        librarySection.classList.remove('hidden');
        initLibrary();
    } else {
        authSection.classList.remove('hidden');
        librarySection.classList.add('hidden');
    }
}

// --- Library System Logic ---
async function initLibrary() {
    const role = localStorage.getItem('role') || 'User';
    const permissionStatus = localStorage.getItem('permissionStatus') || 'None';
    welcomeMessage.innerText = `Logged in as ${role}`;

    // Apply strict Role-Based Constraints Interface Rendering
    const userActions = document.getElementById('user-actions');
    const reqPermBtn = document.getElementById('request-permission-btn');

    if (role === 'Admin') {
        adminActions.classList.remove('hidden');
        thActions.classList.remove('hidden');
        document.getElementById('users-container').classList.remove('hidden'); // Show users table
        if (userActions) userActions.classList.add('hidden');
        fetchUsers(); // Load users
        fetchPermissionRequests();
    } else {
        document.getElementById('users-container').classList.add('hidden');

        if (permissionStatus === 'Granted') {
            adminActions.classList.remove('hidden');
            thActions.classList.remove('hidden');
            if (userActions) userActions.classList.add('hidden');
        } else {
            adminActions.classList.add('hidden');
            thActions.classList.add('hidden');
            if (userActions) {
                userActions.classList.remove('hidden');
                if (permissionStatus === 'Pending') {
                    reqPermBtn.innerHTML = `<i class="fa-solid fa-clock"></i> Permission Requested`;
                    reqPermBtn.disabled = true;
                } else if (permissionStatus === 'Rejected') {
                    reqPermBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Request Rejected`;
                    reqPermBtn.disabled = true;
                    reqPermBtn.style.backgroundColor = 'var(--secondary-color)';
                } else {
                    reqPermBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Request Edit Permission`;
                    reqPermBtn.disabled = false;
                    reqPermBtn.style.backgroundColor = '';
                }
            }
        }
    }

    await fetchBooks();
}

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Merge headers if provided
    options.headers = { ...headers, ...options.headers };

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    // If unauthorized, hard logout
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    return res;
}

let booksCache = [];

async function fetchBooks() {
    booksTbody.innerHTML = `<tr><td colspan="6" class="empty-state">Loading books...</td></tr>`;
    showLoading('Loading library...');
    try {
        const response = await apiFetch('/books');
        hideLoading();
        if (response.ok) {
            booksCache = await response.json();
            renderTable(booksCache);
        } else {
            booksTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:var(--secondary-color)">Failed to load books.</td></tr>`;
        }
    } catch (err) {
        hideLoading();
        booksTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:var(--secondary-color)">Error connecting to server.</td></tr>`;
    }
}

function renderTable(books) {
    const role = localStorage.getItem('role') || 'User';
    booksTbody.innerHTML = '';

    if (books.length === 0) {
        booksTbody.innerHTML = `<tr><td colspan="6" class="empty-state">No books available.</td></tr>`;
        return;
    }

    books.forEach(book => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${book.id}</td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td><span style="background:rgba(99,102,241,0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem">${book.isbn}</span></td>
            <td>${book.isAvailable ? '<span style="color:var(--success-color)"><i class="fa-solid fa-check"></i> Yes</span>' : '<span style="color:var(--secondary-color)"><i class="fa-solid fa-xmark"></i> No</span>'}</td>
        `;

        // Inject actions cell purely if Admin OR User with Granted Permission
        const permissionStatus = localStorage.getItem('permissionStatus');
        if (role === 'Admin' || permissionStatus === 'Granted') {
            const actionTd = document.createElement('td');
            actionTd.innerHTML = `
                <button class="action-btn edit-btn" onclick="openEditModal(${book.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="action-btn delete-btn" onclick="deleteBook(${book.id})"><i class="fa-solid fa-trash"></i> Delete</button>
            `;
            tr.appendChild(actionTd);
        }

        booksTbody.appendChild(tr);
    });
}

// Search Logic (Client-side)
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = booksCache.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        b.isbn.toLowerCase().includes(term)
    );
    renderTable(filtered);
});

// --- Modal & Book CRUD ---
function openInsertModal() {
    bookForm.reset();
    document.getElementById('book-id').value = '';
    modalTitle.innerText = 'Add New Book';
    document.getElementById('save-book-btn').innerText = 'Save Book';
    bookModal.classList.remove('hidden');
}

function openEditModal(id) {
    const book = booksCache.find(b => b.id === id);
    if (!book) return;

    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-isbn').value = book.isbn;
    document.getElementById('book-status').value = book.isAvailable.toString();

    modalTitle.innerText = 'Edit Book';
    document.getElementById('save-book-btn').innerText = 'Update Book';
    bookModal.classList.remove('hidden');
}

function closeBookModal() {
    bookModal.classList.add('hidden');
}

bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('book-id').value;
    const bodyPayload = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        isbn: document.getElementById('book-isbn').value,
        isAvailable: document.getElementById('book-status').value === 'true'
    };

    if (id) { bodyPayload.id = parseInt(id); } // Needed for strict payload matching usually

    showLoading('Saving book...');
    try {
        let response;
        if (id) {
            // Edit
            response = await apiFetch(`/books/${id}`, {
                method: 'PUT',
                body: JSON.stringify(bodyPayload)
            });
        } else {
            // Insert
            response = await apiFetch(`/books`, {
                method: 'POST',
                body: JSON.stringify(bodyPayload)
            });
        }

        hideLoading();
        if (response.ok) {
            showNotification(id ? 'Book updated successfully' : 'Book added successfully');
            closeBookModal();
            fetchBooks();
        } else {
            const err = await response.text();
            showNotification(err || 'Failed to process request', true);
        }
    } catch (error) {
        hideLoading();
        showNotification('Network/Auth error processing request', true);
    }
});

async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    showLoading('Deleting book...');
    try {
        const response = await apiFetch(`/books/${id}`, {
            method: 'DELETE'
        });

        hideLoading();
        if (response.ok || response.status === 204) {
            showNotification('Book deleted successfully');
            fetchBooks();
        } else {
            showNotification('Failed to delete book', true);
        }
    } catch (err) {
        hideLoading();
        showNotification('Network error', true);
    }
}

// --- Users Management Logic ---
async function fetchUsers() {
    const usersTbody = document.getElementById('users-tbody');
    usersTbody.innerHTML = `<tr><td colspan="4" class="empty-state">Loading users...</td></tr>`;
    showLoading('Loading users...');
    try {
        const response = await apiFetch('/auth/users');
        hideLoading();
        if (response.ok) {
            const users = await response.json();
            renderUsersTable(users);
        } else {
            usersTbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:var(--secondary-color)">Failed to load users.</td></tr>`;
        }
    } catch (err) {
        hideLoading();
        usersTbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:var(--secondary-color)">Error fetching users.</td></tr>`;
    }
}

function renderUsersTable(users) {
    const usersTbody = document.getElementById('users-tbody');
    usersTbody.innerHTML = '';

    if (users.length === 0) {
        usersTbody.innerHTML = `<tr><td colspan="5" class="empty-state">No users found.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        const statusHtml = user.isApproved
            ? '<span style="color:var(--success-color)"><i class="fa-solid fa-check"></i> Approved</span>'
            : '<span style="color:var(--secondary-color)"><i class="fa-solid fa-clock"></i> Pending</span>';

        let actionHtml = '';
        if (!user.isApproved) {
            actionHtml += `<button class="action-btn primary-btn" onclick="approveUser(${user.id})" style="padding: 4px 10px; font-size: 0.8rem; margin-right: 5px;">Approve</button>`;
        }
        actionHtml += `<button class="action-btn delete-btn" onclick="deleteUser(${user.id})" style="padding: 4px 10px; font-size: 0.8rem"><i class="fa-solid fa-trash"></i> Delete</button>`;

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

        tr.innerHTML = `
            <td>#${user.id}</td>
            <td><strong>${fullName}</strong></td>
            <td>${user.email || user.username}</td>
            <td>${statusHtml}</td>
            <td>${actionHtml}</td>
        `;
        usersTbody.appendChild(tr);
    });
}

async function approveUser(id) {
    showLoading('Approving user...');
    try {
        const response = await apiFetch(`/auth/approve/${id}`, { method: 'PUT' });
        hideLoading();
        if (response.ok) {
            showNotification('User approved successfully');
            fetchUsers(); // refresh table
        } else {
            showNotification('Failed to approve user', true);
        }
    } catch (err) {
        hideLoading();
        showNotification('Network error approving user', true);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    showLoading('Deleting user...');
    try {
        const response = await apiFetch(`/auth/users/${id}`, { method: 'DELETE' });
        hideLoading();
        if (response.ok) {
            showNotification('User deleted successfully');
            fetchUsers(); // refresh table
        } else {
            const err = await response.text();
            showNotification(err || 'Failed to delete user', true);
        }
    } catch (err) {
        hideLoading();
        showNotification('Network error deleting user', true);
    }
}

// --- Permissions Logic ---
function switchAdminSubTab(tab) {
    document.getElementById('tab-pending-users').classList.toggle('active', tab === 'users');
    document.getElementById('tab-pending-perms').classList.toggle('active', tab === 'perms');
    if (tab === 'users') {
        document.getElementById('users-table').classList.remove('hidden');
        document.getElementById('perms-table').classList.add('hidden');
        fetchUsers();
    } else {
        document.getElementById('users-table').classList.add('hidden');
        document.getElementById('perms-table').classList.remove('hidden');
        fetchPermissionRequests();
    }
}

async function requestPermission() {
    showLoading('Requesting permission...');
    try {
        const response = await apiFetch(`/permissions/request`, { method: 'POST' });
        const data = await response.json();
        hideLoading();
        if (response.ok) {
            showNotification('Permission request sent to Admin.');
            localStorage.setItem('permissionStatus', data.permissionStatus || 'Pending');
            initLibrary(); // Re-render UI
        } else {
            showNotification(data || 'Failed to request permission', true);
        }
    } catch (err) {
        hideLoading();
        showNotification('Network error requesting permission', true);
    }
}

async function fetchPermissionRequests() {
    const permsTbody = document.getElementById('perms-tbody');
    if (!permsTbody) return;
    permsTbody.innerHTML = `<tr><td colspan="4" class="empty-state">Loading permission requests...</td></tr>`;
    showLoading('Loading requests...');
    try {
        const response = await apiFetch('/permissions/pending');
        hideLoading();
        if (response.ok) {
            const users = await response.json();
            renderPermsTable(users);
        } else {
            permsTbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--secondary-color)">Failed to load requests.</td></tr>`;
        }
    } catch (err) {
        hideLoading();
        permsTbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:var(--secondary-color)">Error fetching requests.</td></tr>`;
    }
}

function renderPermsTable(users) {
    const permsTbody = document.getElementById('perms-tbody');
    permsTbody.innerHTML = '';

    if (users.length === 0) {
        permsTbody.innerHTML = `<tr><td colspan="4" class="empty-state">No pending permission requests.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${user.id}</td>
            <td><strong>${user.email || user.username}</strong></td>
            <td><span style="color:var(--secondary-color)"><i class="fa-solid fa-clock"></i> Pending</span></td>
            <td>
                <button class="action-btn primary-btn" onclick="reviewPermission(${user.id}, 'approve')" style="padding: 4px 10px; font-size: 0.8rem; margin-right: 5px;">Accept</button>
                <button class="action-btn delete-btn" onclick="reviewPermission(${user.id}, 'reject')" style="padding: 4px 10px; font-size: 0.8rem">Reject</button>
            </td>
        `;
        permsTbody.appendChild(tr);
    });
}

async function reviewPermission(userId, action) {
    showLoading('Processing permission...');
    try {
        const response = await apiFetch(`/permissions/${action}/${userId}`, { method: 'PUT' });
        hideLoading();
        if (response.ok) {
            showNotification(`Permission ${action}d successfully.`);
            fetchPermissionRequests();
        } else {
            showNotification(`Failed to ${action} permission`, true);
        }
    } catch (err) {
        hideLoading();
        showNotification(`Network error trying to ${action} permission`, true);
    }
}

// --- Forgot Password Logic ---
const fpModal = document.getElementById('forgot-password-modal');
const fpAdminForm = document.getElementById('fp-admin-form');
const fpUserReqForm = document.getElementById('fp-user-request-form');

function openForgotPasswordModal() {
    fpModal.classList.remove('hidden');
    fpAdminForm.classList.add('hidden');
    fpUserReqForm.classList.add('hidden');

    if (currentAuthTab === 'Admin') {
        fpAdminForm.classList.remove('hidden');
    } else {
        fpUserReqForm.classList.remove('hidden');
        document.getElementById('fp-step-email').classList.remove('hidden');
        if (document.getElementById('fp-step-password')) {
            document.getElementById('fp-step-password').classList.add('hidden');
        }
    }
}

function closeForgotPasswordModal() {
    fpModal.classList.add('hidden');
    fpAdminForm.reset();
    fpUserReqForm.reset();
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function requestUserPasswordReset() {
    const email = document.getElementById('fp-user-email').value;
    if (!email) {
        showNotification('Please enter your email address.', true);
        return;
    }

    showLoading('Checking email...');
    try {
        const res = await fetch(`${API_BASE}/auth/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const resultText = await res.text();
        hideLoading();
        if (res.ok) {
            // Email exists, proceed to Step 2
            document.getElementById('fp-step-email').classList.add('hidden');
            document.getElementById('fp-step-password').classList.remove('hidden');
        } else {
            showNotification(resultText || 'Email not found in database.', true);
        }
    } catch (e) {
        hideLoading();
        showNotification('Network error.', true);
    }
}

async function submitUserPasswordReset() {
    const email = document.getElementById('fp-user-email').value;
    const newPwd = document.getElementById('fp-user-new-pwd').value;
    if (!newPwd) {
        showNotification('Please enter a new password.', true);
        return;
    }

    showLoading('Resetting password...');
    try {
        const res = await fetch(`${API_BASE}/auth/reset-password-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, newPassword: newPwd })
        });

        let resultText = await res.text();
        // Strip surrounding quotes if present
        resultText = resultText.replace(/^"|"$/g, '');
        hideLoading();
        if (res.ok) {
            showNotification(resultText || 'Password reset successfully! You can now login.');
            closeForgotPasswordModal();
        } else {
            showNotification(resultText || 'Failed to reset password.', true);
        }
    } catch (e) {
        hideLoading();
        showNotification('Network error. Please try again.', true);
    }
}

if (fpAdminForm) {
    fpAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const favNumber = document.getElementById('fp-fav-number').value;
        const newPwd = document.getElementById('fp-admin-new-pwd').value;

        showLoading('Resetting password...');
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favouriteNumber: parseInt(favNumber), newPassword: newPwd })
            });

            hideLoading();
            if (res.ok) {
                showNotification('Admin password reset successfully!');
                closeForgotPasswordModal();
            } else {
                const err = await res.text();
                showNotification(err || 'Failed to reset password.', true);
            }
        } catch (e) {
            hideLoading();
            showNotification('Network error.', true);
        }
    });
}

// --- Form Enter Key Navigation ---
function setupEnterKeyNavigation() {
    document.querySelectorAll('form').forEach(form => {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), select'));
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    } else {
                        const submitBtn = form.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                        }
                    }
                }
            });
        });
    });
}
