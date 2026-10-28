
/* =========================
   Wishlist | DONO
========================= */

const wishlistCount = document.getElementById("wishlist-count");
const emptyWishlist = document.getElementById("empty-wishlist");

const wishlistCards = document.querySelectorAll(".wishlist-card");

const undoMessage = document.getElementById("wishlist-undo");
const undoButton = document.getElementById("wishlist-undo-btn");

const restoreButton = document.getElementById("restore-wishlist-btn");


// =========================
// Initial Favorite Products
// =========================

const initialWishlist = ["4", "5", "6"];


// =========================
// Load Wishlist
// =========================

if (localStorage.getItem("donoWishlist") === null) {

    localStorage.setItem(
        "donoWishlist",
        JSON.stringify(initialWishlist)
    );

}

let wishlist = JSON.parse(localStorage.getItem("donoWishlist")) || [];

let lastRemovedId = null;


// =========================
// Save Wishlist
// =========================

function saveWishlist() {

    localStorage.setItem("donoWishlist", JSON.stringify(wishlist));

}


// =========================
// Display Wishlist
// =========================

function displayWishlist() {

    let count = 0;

    wishlistCards.forEach(function(card) {

        const productId = card.dataset.id;

        if (wishlist.includes(productId)) {

            card.hidden = false;
            count++;

        } else {

            card.hidden = true;

        }

    });

    wishlistCount.textContent = "Your Favorites (" + count + ")";

    emptyWishlist.hidden = count !== 0;

}


// =========================
// Remove From Wishlist
// =========================

function removeFromWishlist(productId, allowUndo = true) {

    wishlist = wishlist.filter(function(id) {
        return id !== productId;
    });

    if (allowUndo) {

        lastRemovedId = productId;
        undoMessage.hidden = false;

    } else {

        lastRemovedId = null;
        undoMessage.hidden = true;

    }

    saveWishlist();
    displayWishlist();

}


// =========================
// Setup Wishlist Cards
// =========================

wishlistCards.forEach(function(card) {

    const productId = card.dataset.id;

    const heartButton = card.querySelector(".wishlist-heart");
    const moveButton = card.querySelector(".move-cart-btn");

    // Remove using heart
    heartButton.addEventListener("click", function() {

        removeFromWishlist(productId);

    });

    // Move to Cart
    moveButton.addEventListener("click", function() {

        const product = {
            id: productId,
            name: card.querySelector("h3").textContent.trim(),
            description: card.querySelector(".wishlist-details p").textContent.trim(),
            price: parseFloat(card.querySelector(".wishlist-price").textContent),
            image: card.querySelector("img").getAttribute("src"),
            quantity: 1
        };

        const cart = JSON.parse(localStorage.getItem("donoCart")) || [];

        const existingProduct = cart.find(function(item) {
            return item.id === product.id;
        });

        if (existingProduct) {

            existingProduct.quantity++;

        } else {

            cart.push(product);

        }

        localStorage.setItem("donoCart", JSON.stringify(cart));

        // Remove from Wishlist
        removeFromWishlist(productId, false);

        // Open Cart
        window.location.href = "cart.html";

    });

});


// =========================
// Undo Removal
// =========================

undoButton.addEventListener("click", function() {

    if (lastRemovedId === null) {
        return;
    }

    if (!wishlist.includes(lastRemovedId)) {
        wishlist.push(lastRemovedId);
    }

    lastRemovedId = null;
    undoMessage.hidden = true;

    saveWishlist();
    displayWishlist();

});


// =========================
// Restore Original Favorites
// =========================

restoreButton.addEventListener("click", function() {

    initialWishlist.forEach(function(productId) {

        if (!wishlist.includes(productId)) {

            wishlist.push(productId);

        }

    });

    lastRemovedId = null;
    undoMessage.hidden = true;

    saveWishlist();
    displayWishlist();

});


// =========================
// Initial Display
// =========================

displayWishlist();
