
/* =========================
   Shopping Cart | DONO
========================= */

const cartProducts = document.getElementById("cart-products");

const subtotalElement = document.getElementById("cart-subtotal");
const totalElement = document.getElementById("cart-total");
const countElement = document.getElementById("cart-count");

const emptyMessage = document.getElementById("empty-cart");
const checkoutButton = document.querySelector(".checkout-btn");

const cartUndoMessage = document.getElementById("cart-undo");
const cartUndoButton = document.getElementById("cart-undo-btn");

const restoreButton = document.getElementById("restore-products-btn");


// =========================
// Original Demo Products
// =========================

const initialProducts = [
    {
        id: "1",
        name: "Birthday Gift Box",
        description: "A special gift for a special day.",
        price: 25,
        image: "assets/images/birthday-gift.jpg.png",
        quantity: 1
    },
    {
        id: "2",
        name: "Flowers & Chocolate Box",
        description: "A sweet surprise for someone you love.",
        price: 35,
        image: "assets/images/flowers-chocolate.jpg.png",
        quantity: 1
    },
    {
        id: "3",
        name: "Self-Care Gift Set",
        description: "A little relaxation in a box.",
        price: 20,
        image: "assets/images/self-care.png",
        quantity: 1
    }
];


// =========================
// Load Cart
// =========================

// Add original products only on first visit
if (localStorage.getItem("donoCart") === null) {

    localStorage.setItem("donoCart", JSON.stringify(initialProducts));

}

let cart = JSON.parse(localStorage.getItem("donoCart")) || [];

// Store last removed product for Undo
let lastRemovedProduct = null;
let lastRemovedIndex = -1;


// =========================
// Save Cart
// =========================

function saveCart() {

    localStorage.setItem("donoCart", JSON.stringify(cart));

}


// =========================
// Update Cart Summary
// =========================

function updateCart() {

    let subtotal = 0;
    let count = 0;

    cart.forEach(function(product) {

        subtotal += product.price * product.quantity;
        count += product.quantity;

    });

    subtotalElement.textContent = subtotal.toFixed(2) + " JOD";
    totalElement.textContent = subtotal.toFixed(2) + " JOD";

    countElement.textContent = "Your Items (" + count + ")";

    emptyMessage.hidden = cart.length !== 0;

    checkoutButton.disabled = cart.length === 0;

}


// =========================
// Display Cart Products
// =========================

function displayCart() {

    cartProducts.innerHTML = "";

    cart.forEach(function(product) {

        const item = document.createElement("article");
        item.className = "cart-item";

        // Image
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;

        // Details
        const details = document.createElement("div");
        details.className = "cart-item-details";

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description;

        const price = document.createElement("span");
        price.className = "cart-item-price";
        price.textContent = Number(product.price).toFixed(2) + " JOD";

        // Actions
        const actions = document.createElement("div");
        actions.className = "cart-item-actions";

        const quantityControl = document.createElement("div");
        quantityControl.className = "quantity-control";

        const minusButton = document.createElement("button");
        minusButton.type = "button";
        minusButton.className = "quantity-btn";
        minusButton.textContent = "−";

        const quantityNumber = document.createElement("span");
        quantityNumber.className = "quantity-number";
        quantityNumber.textContent = product.quantity;

        const plusButton = document.createElement("button");
        plusButton.type = "button";
        plusButton.className = "quantity-btn";
        plusButton.textContent = "+";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";

        // Decrease Quantity
        minusButton.addEventListener("click", function() {

            if (product.quantity > 1) {

                product.quantity--;

                saveCart();
                displayCart();

            }

        });

        // Increase Quantity
        plusButton.addEventListener("click", function() {

            product.quantity++;

            saveCart();
            displayCart();

        });

        // Remove Product
        removeButton.addEventListener("click", function() {

            lastRemovedProduct = { ...product };

            lastRemovedIndex = cart.findIndex(function(item) {
                return item.id === product.id;
            });

            cart.splice(lastRemovedIndex, 1);

            cartUndoMessage.hidden = false;

            saveCart();
            displayCart();

        });

        // Build Quantity Controls
        quantityControl.appendChild(minusButton);
        quantityControl.appendChild(quantityNumber);
        quantityControl.appendChild(plusButton);

        actions.appendChild(quantityControl);
        actions.appendChild(removeButton);

        details.appendChild(name);
        details.appendChild(description);
        details.appendChild(price);
        details.appendChild(actions);

        item.appendChild(image);
        item.appendChild(details);

        cartProducts.appendChild(item);

    });

    updateCart();

}


// =========================
// Undo Remove
// =========================

cartUndoButton.addEventListener("click", function() {

    if (lastRemovedProduct === null) {
        return;
    }

    // Avoid duplicate products if already restored
    const existingProduct = cart.find(function(item) {
        return item.id === lastRemovedProduct.id;
    });

    if (!existingProduct) {

        cart.splice(lastRemovedIndex, 0, lastRemovedProduct);

    }

    lastRemovedProduct = null;
    lastRemovedIndex = -1;

    cartUndoMessage.hidden = true;

    saveCart();
    displayCart();

});


// =========================
// Restore Original Products
// =========================

restoreButton.addEventListener("click", function() {

    initialProducts.forEach(function(product) {

        const exists = cart.some(function(item) {
            return item.id === product.id;
        });

        // Only restore missing products
        if (!exists) {

            cart.push({ ...product });

        }

    });

    // Clear old Undo state
    lastRemovedProduct = null;
    lastRemovedIndex = -1;
    cartUndoMessage.hidden = true;

    saveCart();
    displayCart();

});


// =========================
// Initial Display
// =========================

displayCart();
