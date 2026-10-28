
/* =========================
   Admin Manage Orders | DONO
========================= */

const ordersTableBody = document.getElementById("orders-table-body");
const orderSearch = document.getElementById("order-search");
const statusFilter = document.getElementById("status-filter");
const ordersCount = document.getElementById("orders-count");
const noOrders = document.getElementById("no-orders");

const orderModal = document.getElementById("order-modal");
const closeModalButton = document.getElementById("close-modal");
const modalTitle = document.getElementById("modal-title");
const modalCustomer = document.getElementById("modal-customer");
const modalNumber = document.getElementById("modal-number");
const modalDate = document.getElementById("modal-date");
const modalItems = document.getElementById("modal-items");

const modalSubtotal = document.getElementById("modal-subtotal");
const modalDiscount = document.getElementById("modal-discount");
const modalShipping = document.getElementById("modal-shipping");
const modalTotal = document.getElementById("modal-total");

const modalStatus = document.getElementById("modal-status");
const saveStatusButton = document.getElementById("save-status");
const statusMessage = document.getElementById("status-message");


// =========================
// Demo Orders
// =========================

const initialOrders = [
    {
        id: 1,
        user_id: 1,
        customer_name: "Sara Ahmad",
        order_number: "DONO-1001",
        status: "pending",
        subtotal: 60,
        discount_amount: 5,
        shipping_fee: 3,
        total_amount: 58,
        created_at: "2026-10-25",
        items: [
            {
                id: 1,
                order_id: 1,
                product_id: 1,
                product_name: "Birthday Gift Box",
                unit_price: 25,
                quantity: 1,
                line_total: 25
            },
            {
                id: 2,
                order_id: 1,
                product_id: 2,
                product_name: "Flowers & Chocolate Box",
                unit_price: 35,
                quantity: 1,
                line_total: 35
            }
        ]
    },
    {
        id: 2,
        user_id: 2,
        customer_name: "Omar Khalid",
        order_number: "DONO-1002",
        status: "confirmed",
        subtotal: 28,
        discount_amount: 0,
        shipping_fee: 3,
        total_amount: 31,
        created_at: "2026-10-27",
        items: [
            {
                id: 3,
                order_id: 2,
                product_id: 4,
                product_name: "Coffee Lover Gift Box",
                unit_price: 28,
                quantity: 1,
                line_total: 28
            }
        ]
    },
    {
        id: 3,
        user_id: 3,
        customer_name: "Lina Haddad",
        order_number: "DONO-1003",
        status: "cancelled",
        subtotal: 32,
        discount_amount: 0,
        shipping_fee: 0,
        total_amount: 32,
        created_at: "2026-10-28",
        items: [
            {
                id: 4,
                order_id: 3,
                product_id: 6,
                product_name: "Luxury Chocolate Box",
                unit_price: 32,
                quantity: 1,
                line_total: 32
            }
        ]
    }
];


// =========================
// Load Orders
// =========================

if (localStorage.getItem("donoAdminOrders") === null) {
    localStorage.setItem(
        "donoAdminOrders",
        JSON.stringify(initialOrders)
    );
}

let orders = JSON.parse(localStorage.getItem("donoAdminOrders")) || [];

let selectedOrderId = null;


// =========================
// Save Orders
// =========================

function saveOrders() {
    localStorage.setItem("donoAdminOrders", JSON.stringify(orders));
}


// =========================
// Format Price
// =========================

function formatPrice(amount) {
    return Number(amount).toFixed(2) + " JOD";
}


// =========================
// Display Orders
// =========================

function displayOrders() {

    ordersTableBody.innerHTML = "";

    const searchText = orderSearch.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredOrders = orders.filter(function(order) {

        // Do not display shopping carts
        if (order.status === "cart") {
            return false;
        }

        const matchesSearch =
            order.order_number.toLowerCase().includes(searchText) ||
            order.customer_name.toLowerCase().includes(searchText);

        const matchesStatus =
            selectedStatus === "all" ||
            order.status === selectedStatus;

        return matchesSearch && matchesStatus;

    });

    ordersCount.textContent =
        "Showing " + filteredOrders.length + " orders";

    noOrders.hidden = filteredOrders.length !== 0;

    filteredOrders.forEach(function(order) {

        const row = document.createElement("tr");

        // Order Number
        const numberCell = document.createElement("td");
        numberCell.className = "order-number";
        numberCell.textContent = order.order_number;

        // Customer
        const customerCell = document.createElement("td");

        const customerName = document.createElement("span");
        customerName.className = "customer-name";
        customerName.textContent = order.customer_name;

        customerCell.appendChild(customerName);

        // Date
        const dateCell = document.createElement("td");
        dateCell.textContent = order.created_at;

        // Items Count
        const itemsCell = document.createElement("td");

        let totalQuantity = 0;

        order.items.forEach(function(item) {
            totalQuantity += item.quantity;
        });

        itemsCell.textContent = totalQuantity + " items";

        // Total
        const totalCell = document.createElement("td");
        totalCell.className = "order-total";
        totalCell.textContent = formatPrice(order.total_amount);

        // Status
        const statusCell = document.createElement("td");

        const statusBadge = document.createElement("span");
        statusBadge.className =
            "order-status status-" + order.status;

        statusBadge.textContent = order.status;

        statusCell.appendChild(statusBadge);

        // Actions
        const actionsCell = document.createElement("td");

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "view-btn";
        viewButton.textContent = "View";

        viewButton.addEventListener("click", function() {
            openOrderDetails(order.id);
        });

        actionsCell.appendChild(viewButton);

        // Build Row
        row.appendChild(numberCell);
        row.appendChild(customerCell);
        row.appendChild(dateCell);
        row.appendChild(itemsCell);
        row.appendChild(totalCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);

        ordersTableBody.appendChild(row);

    });

}


// =========================
// Open Order Details
// =========================

function openOrderDetails(orderId) {

    const order = orders.find(function(item) {
        return item.id === orderId;
    });

    if (!order) {
        return;
    }

    selectedOrderId = order.id;

    modalTitle.textContent =
        "Order Details - " + order.order_number;

    modalCustomer.textContent = order.customer_name;

    modalNumber.textContent =
        "Order Number: " + order.order_number;

    modalDate.textContent =
        "Order Date: " + order.created_at;

    modalSubtotal.textContent = formatPrice(order.subtotal);
    modalDiscount.textContent = formatPrice(order.discount_amount);
    modalShipping.textContent = formatPrice(order.shipping_fee);
    modalTotal.textContent = formatPrice(order.total_amount);

    modalStatus.value = order.status;

    statusMessage.textContent = "";

    // Display order_items
    modalItems.innerHTML = "";

    order.items.forEach(function(product) {

        const item = document.createElement("div");
        item.className = "modal-item";

        const info = document.createElement("div");

        const name = document.createElement("div");
        name.className = "modal-item-name";
        name.textContent = product.product_name;

        const quantity = document.createElement("div");
        quantity.className = "modal-item-quantity";

        quantity.textContent =
            product.quantity + " × " +
            formatPrice(product.unit_price);

        const price = document.createElement("span");
        price.className = "modal-item-price";
        price.textContent = formatPrice(product.line_total);

        info.appendChild(name);
        info.appendChild(quantity);

        item.appendChild(info);
        item.appendChild(price);

        modalItems.appendChild(item);

    });

    orderModal.hidden = false;

}


// =========================
// Save Order Status
// =========================

saveStatusButton.addEventListener("click", function() {

    const order = orders.find(function(item) {
        return item.id === selectedOrderId;
    });

    if (!order) {
        return;
    }

    const newStatus = modalStatus.value;

    const allowedStatuses = [
        "pending",
        "confirmed",
        "cancelled"
    ];

    if (!allowedStatuses.includes(newStatus)) {
        return;
    }

    order.status = newStatus;

    saveOrders();
    displayOrders();

    statusMessage.textContent = "Order status updated successfully!";

});


// =========================
// Close Modal
// =========================

function closeOrderModal() {
    orderModal.hidden = true;
    selectedOrderId = null;
}

closeModalButton.addEventListener("click", closeOrderModal);

orderModal.addEventListener("click", function(event) {

    if (event.target === orderModal) {
        closeOrderModal();
    }

});

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape" && !orderModal.hidden) {
        closeOrderModal();
    }

});


// =========================
// Search and Filter
// =========================

orderSearch.addEventListener("input", displayOrders);

statusFilter.addEventListener("change", displayOrders);


// =========================
// Initial Display
// =========================

displayOrders();
