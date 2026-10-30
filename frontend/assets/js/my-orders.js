
const ordersApi = "/DONO-repo/backend/public/api/orders";

const ordersList = document.getElementById("orders-list");
const ordersCount = document.getElementById("orders-count");
const emptyOrders = document.getElementById("empty-orders");

// Format price
function formatPrice(amount) {
    return Number(amount).toFixed(2) + " JOD";
}

// Display orders
function displayOrders(orders) {

    ordersList.innerHTML = "";

    ordersCount.textContent = "Your Orders (" + orders.length + ")";

    emptyOrders.hidden = orders.length > 0;

    orders.forEach(function(order) {

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
        status.className = "order-status";

        const allowedStatuses = ["pending", "confirmed", "cancelled"];
        const orderStatus = String(order.status).toLowerCase();

        status.classList.add(
            allowedStatuses.includes(orderStatus)
                ? "status-" + orderStatus
                : "status-pending"
        );

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

        // Order Details
        const details = document.createElement("div");
        details.className = "order-details";
        details.hidden = true;

        const itemsTitle = document.createElement("h4");
        itemsTitle.textContent = "Order Items";
        details.appendChild(itemsTitle);

        const items = Array.isArray(order.items) ? order.items : [];

        items.forEach(function(product) {

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

        // Order Summary
        const summary = document.createElement("div");
        summary.className = "order-summary";

        const summaryValues = [
            ["Subtotal", order.subtotal],
            ["Discount", order.discount_amount],
            ["Shipping", order.shipping_fee],
            ["Total", order.total_amount]
        ];

        summaryValues.forEach(function(value, index) {

            const row = document.createElement("div");

            row.className = index === 3
                ? "summary-row summary-total"
                : "summary-row";

            const label = document.createElement("span");
            label.textContent = value[0];

            const amount = document.createElement("span");
            amount.textContent = formatPrice(value[1]);

            row.appendChild(label);
            row.appendChild(amount);

            summary.appendChild(row);
        });

        details.appendChild(summary);

        // Show / Hide Details
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

// Load orders from backend
async function loadOrders() {

    try {
        const response = await fetch(ordersApi);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load orders.");
        }

        const orders = Array.isArray(result.data)
            ? result.data
            : result.data?.orders;

        if (!Array.isArray(orders)) {
            throw new Error("Invalid orders response.");
        }

        displayOrders(orders);

    } catch (error) {
        console.error(error);

        ordersList.textContent = error.message;
        ordersCount.textContent = "Your Orders";
        emptyOrders.hidden = true;
    }
}

loadOrders();
