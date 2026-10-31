document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('usersTableBody');
    const searchInput = document.getElementById('searchInput');
    const genderFilter = document.getElementById('genderFilter');
    const sortFilter = document.getElementById('sortFilter');

    let allUsers = [];

    async function loadUsers() {
        const query = new URLSearchParams({limit:'100'});

        try {
            const response = await fetch(`${new URL("../../../../backend/public/api/admin/users", import.meta.url).pathname}?${query.toString()}`);
            const result = await response.json();

            if (result.success && result.data.users) {
                allUsers = result.data.users;
                renderUsers(allUsers);
                document.getElementById('usersMessage').textContent = result.data.pagination?.totalUsers > allUsers.length ? `Showing latest ${allUsers.length} of ${result.data.pagination.totalUsers} users.` : `${allUsers.length} users loaded.`;
            } else {
                tableBody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #777;">No users found.</td></tr>`;
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #901B1B;">Failed to load users data.</td></tr>`;
        }
    }

    function renderUsers(users) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filtered = users.filter(u => (
            (u.name && u.name.toLowerCase().includes(searchTerm)) ||
            (u.email && u.email.toLowerCase().includes(searchTerm)) ||
            (u.phone && u.phone.includes(searchTerm))
        ) && (!genderFilter.value || u.gender === genderFilter.value))
        .sort((a,b) => sortFilter.value === 'oldest' ? Number(a.id)-Number(b.id) : Number(b.id)-Number(a.id));

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #777;">No matching users.</td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(u => {
            const genderBadge = u.gender === 'female' 
                ? `<span style="background: #F3E8F0; color: #702559; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">Female</span>`
                : u.gender === 'male'
                ? `<span style="background: #EAF3E8; color: #416B4C; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">Male</span>`
                : `<span style="color: #777;">N/A</span>`;

            const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';

            return `
                <tr style="border-bottom: 1px solid #EDF0EB; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#F9FBF9'" onmouseout="this.style.backgroundColor='#FFFFFF'">
                    <td style="padding: 14px 18px;">
                        <strong style="color: #1D3024; display: block;">${escapeHtml(u.name)}</strong>
                        <span style="color: #687469; font-size: 13px;">${escapeHtml(u.email)}</span>
                    </td>
                    <td style="padding: 14px 18px; color: #203529;">${u.phone ? escapeHtml(u.phone) : '<span style="color:#777;">N/A</span>'}</td>
                    <td style="padding: 14px 18px;">${genderBadge}</td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1D3024;">${u.total_orders} orders</td>
                    <td style="padding: 14px 18px; font-weight: 700; color: #416B4C;">${parseFloat(u.total_spent).toFixed(2)} USD</td>
                    <td style="padding: 14px 18px; color: #687469;">${joinedDate}</td>
                </tr>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    genderFilter.addEventListener('change', () => renderUsers(allUsers));
    sortFilter.addEventListener('change', () => renderUsers(allUsers));
    searchInput.addEventListener('input', () => renderUsers(allUsers));

    loadUsers();
});