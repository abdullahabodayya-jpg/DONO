
/* =========================
   Shopping Cart | DONO
========================= */

// Get HTML Elements

const cartItems = document.querySelectorAll(".cart-item");

const subtotalElement = document.getElementById("cart-subtotal");
const totalElement = document.getElementById("cart-total");
const countElement = document.getElementById("cart-count");

const emptyMessage = document.getElementById("empty-cart");
const checkoutButton = document.querySelector(".checkout-btn");


// =========================
// Update Cart
// =========================

function updateCart() {

    let subtotal = 0;
    let count = 0;

    const items = document.querySelectorAll(".cart-item");

    items.forEach(function(item) {

        const price = parseFloat(
            item.querySelector(".cart-item-price").textContent
        );

        const quantity = Number(
            item.querySelector(".quantity-number").textContent
        );

        subtotal += price * quantity;

        count += quantity;

    });


    // Update Subtotal

    subtotalElement.textContent = subtotal.toFixed(2) + " JOD";


    // Update Subtotal Before Tax

    totalElement.textContent = subtotal.toFixed(2) + " JOD";


    // Update Items Count

    countElement.textContent = "Your Items (" + count + ")";


    // Empty Cart

    if (items.length === 0) {

        emptyMessage.hidden = false;

        checkoutButton.disabled = true;

    } else {

        emptyMessage.hidden = true;

        checkoutButton.disabled = false;

    }

}


// =========================
// Quantity and Remove
// =========================

cartItems.forEach(function(item) {

    const buttons = item.querySelectorAll(".quantity-btn");

    const quantityNumber = item.querySelector(".quantity-number");

    const removeButton = item.querySelector(".remove-btn");

    let quantity = Number(quantityNumber.textContent);


    // Decrease Quantity

    buttons[0].addEventListener("click", function() {

        if (quantity > 1) {

            quantity--;

            quantityNumber.textContent = quantity;

            updateCart();

        }

    });


    // Increase Quantity

    buttons[1].addEventListener("click", function() {

        quantity++;

        quantityNumber.textContent = quantity;

        updateCart();

    });


    // Remove Product

    removeButton.addEventListener("click", function() {

        item.remove();

        updateCart();

    });

});


// =========================
// Initial Cart Update
// =========================

updateCart();
