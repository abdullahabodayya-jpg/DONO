
const API = "/DONO-repo/backend/public/api/admin/orders";
const $ = id => document.getElementById(id);

let orders = [];
let page = 1;
let selectedId = null;
let sortBy = "created_at";
let direction = -1;

const perPage = 5;
const price = n => Number(n).toFixed(2) + " JOD";

// Protect text displayed inside HTML
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
})[c]);

// Get orders from database
async function loadOrders() {
    try {
        const response = await fetch(API);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load orders");
        }

        orders = result.data;
        displayOrders();
    } catch (error) {
        orders = [];
        displayOrders();
        $("orders-count").textContent = error.message;
    }
}

// Display, filter, sort and paginate
function displayOrders() {
    const search = $("order-search").value.toLowerCase();
    const status = $("status-filter").value;

    let list = orders.filter(o =>
        o.status !== "cart" &&
        (o.order_number.toLowerCase().includes(search) ||
         o.customer_name.toLowerCase().includes(search)) &&
        (status === "all" || o.status === status)
    );

    const value = o => sortBy === "items"
        ? o.items.reduce((sum, i) => sum + Number(i.quantity), 0)
        : o[sortBy];

    list.sort((a, b) => {
        const x = value(a), y = value(b);
        return (sortBy === "items" || sortBy === "total_amount"
            ? Number(x) - Number(y)
            : String(x).localeCompare(String(y), undefined, { numeric: true })
        ) * direction;
    });

    const pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages);
    const visible = list.slice((page - 1) * perPage, page * perPage);

    $("orders-table-body").innerHTML = visible.map(o => `
        <tr>
            <td class="order-number">${safe(o.order_number)}</td>
            <td class="customer-name">${safe(o.customer_name)}</td>
            <td>${safe(o.created_at)}</td>
            <td>${valueItems(o)} items</td>
            <td class="order-total">${price(o.total_amount)}</td>
            <td>
                <span class="order-status status-${safe(o.status)}">
                    ${safe(o.status)}
                </span>
            </td>
            <td>
                <button class="view-btn" data-id="${Number(o.id)}">View</button>
            </td>
        </tr>
    `).join("");

    $("no-orders").hidden = list.length > 0;
    $("orders-count").textContent = `Showing ${visible.length} of ${list.length} orders`;
    $("page-info").textContent = `Page ${page} of ${pages}`;
    $("prev-page").disabled = page === 1;
    $("next-page").disabled = page === pages;
}

function valueItems(order) {
    return (order.items || []).reduce((sum, item) => sum + Number(item.quantity), 0);
}

// Search and status filter
["order-search", "status-filter"].forEach(id => {
    $(id).addEventListener(id === "order-search" ? "input" : "change", () => {
        page = 1;
        displayOrders();
    });
});

// Sorting
document.querySelectorAll(".sort-btn").forEach(button => {
    button.onclick = () => {
        direction = sortBy === button.dataset.sort ? -direction : 1;
        sortBy = button.dataset.sort;
        page = 1;
        displayOrders();
    };
});

// Pagination
$("prev-page").onclick = () => {
    if (page > 1) page--;
    displayOrders();
};

$("next-page").onclick = () => {
    page++;
    displayOrders();
};

// View order
$("orders-table-body").onclick = event => {
    const button = event.target.closest(".view-btn");
    if (!button) return;

    const o = orders.find(order => Number(order.id) === Number(button.dataset.id));
    if (!o) return;

    selectedId = o.id;

    $("modal-title").textContent = "Order Details - " + o.order_number;
    $("modal-customer").textContent = o.customer_name;
    $("modal-number").textContent = "Order Number: " + o.order_number;
    $("modal-date").textContent = "Order Date: " + o.created_at;

    ["subtotal", "total"].forEach(key => {
        $("modal-" + key).textContent = price(
            key === "total" ? o.total_amount : o.subtotal
        );
    });

    $("modal-discount").textContent = price(o.discount_amount);
    $("modal-shipping").textContent = price(o.shipping_fee);
    $("modal-status").value = o.status;
    $("status-message").textContent = "";

    $("modal-items").innerHTML = (o.items || []).map(i => `
        <div class="modal-item">
            <div>
                <div class="modal-item-name">${safe(i.product_name)}</div>
                <div class="modal-item-quantity">
                    ${Number(i.quantity)} × ${price(i.unit_price)}
                </div>
            </div>
            <span class="modal-item-price">${price(i.line_total)}</span>
        </div>
    `).join("");

    $("order-modal").hidden = false;
};

// Update status in database
$("save-status").onclick = async () => {
    if (selectedId === null) return;

    $("save-status").disabled = true;

    try {
        const response = await fetch(`${API}/${selectedId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: $("modal-status").value })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Update failed");
        }

        await loadOrders();
        $("status-message").textContent = "Status updated successfully!";
    } catch (error) {
        $("status-message").textContent = error.message;
    }

    $("save-status").disabled = false;
};

// Close modal
function closeModal() {
    $("order-modal").hidden = true;
    selectedId = null;
}

$("close-modal").onclick = closeModal;
$("order-modal").onclick = e => {
    if (e.target === $("order-modal")) closeModal();
};

document.onkeydown = e => {
    if (e.key === "Escape") closeModal();
};

loadOrders();
