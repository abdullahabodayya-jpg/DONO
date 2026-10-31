
const API = "/DONO-repo/backend/public/api/admin/orders";

let orders = [];
let page = 1;
let selectedId = null;
let sortBy = "created_at";
let direction = -1;

const perPage = 5;

const price = n => Number(n).toFixed(2) + " JOD";

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return characters[character];
    });
}

function itemCount(order) {
    return (order.items || []).reduce(function (sum, item) {
        return sum + Number(item.quantity);
    }, 0);
}

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

        document.getElementById("orders-count").textContent = error.message;
    }
}

function displayOrders() {
    const search = document.getElementById("order-search").value.toLowerCase().trim();
    const status = document.getElementById("status-filter").value;

    let list = orders.filter(function (order) {
        const matchesSearch =
            String(order.order_number).toLowerCase().includes(search) ||
            String(order.customer_name).toLowerCase().includes(search);

        const matchesStatus =
            status === "all" || order.status === status;

        return order.status !== "cart" && matchesSearch && matchesStatus;
    });

    list.sort(function (a, b) {
        let x;
        let y;

        if (sortBy === "items") {
            x = itemCount(a);
            y = itemCount(b);
        } else {
            x = a[sortBy];
            y = b[sortBy];
        }

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

    document.getElementById("orders-table-body").innerHTML = visible.map(function (order) {
        return `
            <tr>
                <td class="order-number">${safe(order.order_number)}</td>

                <td class="customer-name">${safe(order.customer_name)}</td>

                <td>${safe(order.created_at)}</td>

                <td>${itemCount(order)} items</td>

                <td class="order-total">${price(order.total_amount)}</td>

                <td>
                    <span class="order-status status-${safe(order.status)}">
                        ${safe(order.status)}
                    </span>
                </td>

                <td>
                    <button type="button" class="view-btn" data-id="${Number(order.id)}">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    document.getElementById("no-orders").hidden = list.length > 0;

    document.getElementById("orders-count").textContent =
        `Showing ${visible.length} of ${list.length} orders`;

    document.getElementById("page-info").textContent =
        `Page ${page} of ${pages}`;

    document.getElementById("prev-page").disabled = page === 1;

    document.getElementById("next-page").disabled = page === pages;
}

document.getElementById("order-search").oninput = function () {
    page = 1;
    displayOrders();
};

document.getElementById("status-filter").onchange = function () {
    page = 1;
    displayOrders();
};

document.querySelectorAll(".sort-btn").forEach(function (button) {
    button.onclick = function () {
        const column = button.dataset.sort;

        if (sortBy === column) {
            direction = -direction;
        } else {
            direction = 1;
        }

        sortBy = column;
        page = 1;

        document.querySelectorAll(".sort-btn").forEach(function (otherButton) {
            otherButton.classList.remove("active");

            const title = otherButton.textContent
                .replace(/[↑↓↕]/g, "")
                .trim();

            otherButton.textContent = title + " ↕";
        });

        button.classList.add("active");

        const title = button.textContent
            .replace(/[↑↓↕]/g, "")
            .trim();

        button.textContent = title + (direction === 1 ? " ↑" : " ↓");

        displayOrders();
    };
});

document.getElementById("prev-page").onclick = function () {
    if (page > 1) {
        page--;
        displayOrders();
    }
};

document.getElementById("next-page").onclick = function () {
    const search = document.getElementById("order-search").value.toLowerCase().trim();
    const status = document.getElementById("status-filter").value;

    const filteredOrders = orders.filter(function (order) {
        const matchesSearch =
            String(order.order_number).toLowerCase().includes(search) ||
            String(order.customer_name).toLowerCase().includes(search);

        const matchesStatus =
            status === "all" || order.status === status;

        return order.status !== "cart" && matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / perPage));

    if (page < totalPages) {
        page++;
        displayOrders();
    }
};

document.getElementById("orders-table-body").onclick = function (event) {
    const button = event.target.closest(".view-btn");

    if (!button) {
        return;
    }

    const order = orders.find(function (item) {
        return Number(item.id) === Number(button.dataset.id);
    });

    if (!order) {
        return;
    }

    selectedId = order.id;

    document.getElementById("modal-title").textContent =
        "Order Details - " + order.order_number;

    document.getElementById("modal-customer").textContent =
        order.customer_name;

    document.getElementById("modal-number").textContent =
        "Order Number: " + order.order_number;

    document.getElementById("modal-date").textContent =
        "Order Date: " + order.created_at;

    document.getElementById("modal-subtotal").textContent =
        price(order.subtotal);

    document.getElementById("modal-discount").textContent =
        price(order.discount_amount);

    document.getElementById("modal-shipping").textContent =
        price(order.shipping_fee);

    document.getElementById("modal-total").textContent =
        price(order.total_amount);

    document.getElementById("modal-status").value = order.status;

    document.getElementById("status-message").textContent = "";

    document.getElementById("modal-items").innerHTML =
        (order.items || []).map(function (item) {
            return `
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
            `;
        }).join("") || "<p>No items in this order.</p>";

    document.getElementById("order-modal").hidden = false;
};

document.getElementById("save-status").onclick = async function () {
    if (selectedId === null) {
        return;
    }

    document.getElementById("save-status").disabled = true;

    document.getElementById("status-message").textContent = "Saving...";

    try {
        const response = await fetch(`${API}/${selectedId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: document.getElementById("modal-status").value
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Update failed");
        }

        await loadOrders();

        document.getElementById("status-message").textContent =
            "Status updated successfully!";

    } catch (error) {
        document.getElementById("status-message").textContent =
            error.message;
    }

    document.getElementById("save-status").disabled = false;
};

function closeModal() {
    document.getElementById("order-modal").hidden = true;
    selectedId = null;
}

document.getElementById("close-modal").onclick = closeModal;

document.getElementById("order-modal").onclick = function (event) {
    if (event.target === document.getElementById("order-modal")) {
        closeModal();
    }
};

document.onkeydown = function (event) {
    if (event.key === "Escape") {
        closeModal();
    }
};

loadOrders();
