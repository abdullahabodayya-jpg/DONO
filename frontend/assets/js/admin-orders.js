
const API = new URL("../../backend/public/api/admin/orders", document.baseURI).pathname;
const $ = id => document.getElementById(id);

let orders = [];
let page = 1;
let selectedId = null;
let sortBy = "created_at";
let direction = -1;

const perPage = 5;
const price = n => Number(n).toFixed(2) + " JOD";

const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
})[c]);

function itemCount(order) {
    return (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity), 0
    );
}

// Get orders from API
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

// Display orders
function displayOrders() {
    const search = $("order-search").value.toLowerCase().trim();
    const status = $("status-filter").value;

    let list = orders.filter(o =>
        o.status !== "cart" &&
        (
            String(o.order_number).toLowerCase().includes(search) ||
            String(o.customer_name).toLowerCase().includes(search)
        ) &&
        (status === "all" || o.status === status)
    );

    list.sort((a, b) => {
        const value = o => sortBy === "items"
            ? itemCount(o)
            : o[sortBy];

        const x = value(a);
        const y = value(b);

        if (sortBy === "items" || sortBy === "total_amount") {
            return (Number(x) - Number(y)) * direction;
        }

        return String(x ?? "").localeCompare(
            String(y ?? ""),
            undefined,
            { numeric: true }
        ) * direction;
    });

    const pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages);

    const visible = list.slice(
        (page - 1) * perPage,
        page * perPage
    );

    $("orders-table-body").innerHTML = visible.map(o => `
        <tr>
            <td class="order-number">${safe(o.order_number)}</td>
            <td class="customer-name">${safe(o.customer_name)}</td>
            <td>${safe(o.created_at)}</td>
            <td>${itemCount(o)} items</td>
            <td class="order-total">${price(o.total_amount)}</td>
            <td>
                <span class="order-status status-${safe(o.status)}">
                    ${safe(o.status)}
                </span>
            </td>
            <td>
                <button type="button" class="view-btn" data-id="${Number(o.id)}">
                    View
                </button>
            </td>
        </tr>
    `).join("");

    $("no-orders").hidden = list.length > 0;
    $("orders-count").textContent =
        `Showing ${visible.length} of ${list.length} orders`;

    $("page-info").textContent = `Page ${page} of ${pages}`;
    $("prev-page").disabled = page === 1;
    $("next-page").disabled = page === pages;
}

// Search
$("order-search").oninput = () => {
    page = 1;
    displayOrders();
};

// Filter
$("status-filter").onchange = () => {
    page = 1;
    displayOrders();
};

// Sorting
document.querySelectorAll(".sort-btn").forEach(button => {
    button.onclick = () => {
        const column = button.dataset.sort;

        direction = sortBy === column ? -direction : 1;
        sortBy = column;
        page = 1;

        document.querySelectorAll(".sort-btn").forEach(btn => {
            btn.classList.remove("active");
            btn.querySelector(".sort-icon").textContent = "⇅";
            btn.removeAttribute("aria-sort");
        });

        button.classList.add("active");
        button.querySelector(".sort-icon").textContent =
            direction === 1 ? "↑" : "↓";

        displayOrders();
    };
});

// Pagination
$("prev-page").onclick = () => {
    if (page > 1) {
        page--;
        displayOrders();
    }
};

$("next-page").onclick = () => {
    page++;
    displayOrders();
};

// View order
$("orders-table-body").onclick = event => {
    const button = event.target.closest(".view-btn");
    if (!button) return;

    const o = orders.find(order =>
        Number(order.id) === Number(button.dataset.id)
    );

    if (!o) return;

    selectedId = o.id;

    $("modal-title").textContent = "Order Details - " + o.order_number;
    $("modal-customer").textContent = o.customer_name;
    $("modal-number").textContent = "Order Number: " + o.order_number;
    $("modal-date").textContent = "Order Date: " + o.created_at;

    $("modal-subtotal").textContent = price(o.subtotal);
    $("modal-discount").textContent = price(o.discount_amount);
    $("modal-shipping").textContent = price(o.shipping_fee);
    $("modal-total").textContent = price(o.total_amount);

    $("modal-status").value = o.status;
    $("status-message").textContent = "";

    $("modal-items").innerHTML = (o.items || []).map(item => `
        <div class="modal-item">
            <div>
                <div class="modal-item-name">
                    ${safe(item.product_name)}
                </div>

                <div class="modal-item-quantity">
                    ${Number(item.quantity)} × ${price(item.unit_price)}
                </div>
            </div>

            <span class="modal-item-price">
                ${price(item.line_total)}
            </span>
        </div>
    `).join("") || "<p>No items in this order.</p>";

    $("order-modal").hidden = false;
};

// Update order status
$("save-status").onclick = async () => {
    if (selectedId === null) return;

    $("save-status").disabled = true;
    $("status-message").textContent = "Saving...";

    try {
        const response = await fetch(`${API}/${selectedId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: $("modal-status").value
            })
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

$("order-modal").onclick = event => {
    if (event.target === $("order-modal")) {
        closeModal();
    }
};

document.onkeydown = event => {
    if (event.key === "Escape") {
        closeModal();
    }
};

// Load orders
loadOrders();
