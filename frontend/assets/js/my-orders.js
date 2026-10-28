
/* =========================
   My Orders | DONO
========================= */

const ordersList = document.getElementById("orders-list");
const ordersCount = document.getElementById("orders-count");
const emptyOrders = document.getElementById("empty-orders");

// Demo logged-in customer
const currentUserId = 1;

// Shared demo orders
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

// Create demo data only once
if (localStorage.getItem("donoAdminOrders") === null) {
    localStorage.setItem(
        "donoAdminOrders",
        JSON.stringify(initialOrders)
    );
}

// Get shared orders
function getOrders() {
    return JSON.parse(localStorage.getItem("donoAdminOrders")) || [];
}

// Format price
function formatPrice(amount) {
    return Number(amount).toFixed(2) + " JOD";
}

// Add a summary row
function addSummaryRow(container, label, amount, isTotal = false) {

    const row = document.createElement("div");

    row.className = isTotal
        ? "summary-row summary-total"
        : "summary-row";

    const title = document.createElement("span");
    title.textContent = label;

    const value = document.createElement("span");
    value.textContent = formatPrice(amount);

    row.appendChild(title);
    row.appendChild(value);

    container.appendChild(row);
}

// Display customer's orders
function displayOrders() {

    ordersList.innerHTML = "";

    const orders = getOrders();

    const customerOrders = orders.filter(function(order) {
        return order.user_id === currentUserId &&
               order.status !== "cart";
    });

    ordersCount.textContent =
        "Your Orders (" + customerOrders.length + ")";

    emptyOrders.hidden = customerOrders.length !== 0;

    customerOrders.forEach(function(order) {

        const card = document.createElement("article");
        card.className = "order-card";

        const main = document.createElement("div");
        main.className = "order-main";

        const info = document.createElement("div");
        info.className = "order-info";

        const number = document.createElement("h3");
        number.textContent = "Order #" + order.order_number;

        const date = document.createElement("p");
        date.className = "order-date";
        date.textContent = "Placed on " + order.created_at;

        const status = document.createElement("span");
        status.className = "order-status status-" + order.status;
        status.textContent = order.status;

        const actions = document.createElement("div");
        actions.className = "order-actions";

        const total = document.createElement("span");
        total.className = "order-total";
        total.textContent = formatPrice(order.total_amount);

        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "details-btn";
        detailsButton.textContent = "View Details";

        // Details section
        const details = document.createElement("div");
        details.className = "order-details";
        details.hidden = true;

        const itemsTitle = document.createElement("h4");
        itemsTitle.textContent = "Order Items";

        details.appendChild(itemsTitle);

        order.items.forEach(function(product) {

            const item = document.createElement("div");
            item.className = "order-item";

            const itemInfo = document.createElement("div");

            const name = document.createElement("span");
            name.className = "item-name";
            name.textContent = product.product_name;

            const quantity = document.createElement("span");
            quantity.className = "item-quantity";
            quantity.textContent =
                "Quantity: " + product.quantity +
                " × " + formatPrice(product.unit_price);

            const price = document.createElement("span");
            price.className = "item-price";
            price.textContent = formatPrice(product.line_total);

            itemInfo.appendChild(name);
            itemInfo.appendChild(quantity);

            item.appendChild(itemInfo);
            item.appendChild(price);

            details.appendChild(item);
        });

        const summary = document.createElement("div");
        summary.className = "order-summary";

        addSummaryRow(summary, "Subtotal", order.subtotal);
        addSummaryRow(summary, "Discount", order.discount_amount);
        addSummaryRow(summary, "Shipping", order.shipping_fee);
        addSummaryRow(summary, "Total", order.total_amount, true);

        details.appendChild(summary);

        detailsButton.addEventListener("click", function() {

            details.hidden = !details.hidden;

            detailsButton.textContent = details.hidden
                ? "View Details"
                : "Hide Details";
        });

        info.appendChild(number);
        info.appendChild(date);
        info.appendChild(status);

        actions.appendChild(total);
        actions.appendChild(detailsButton);

        main.appendChild(info);
        main.appendChild(actions);

        card.appendChild(main);
        card.appendChild(details);

        ordersList.appendChild(card);
    });
}

displayOrders();
