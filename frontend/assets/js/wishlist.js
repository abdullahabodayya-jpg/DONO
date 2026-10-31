
 // =========================
// Wishlist | DONO
// =========================

const wishlistGrid = document.getElementById("wishlist-grid");
const wishlistCount = document.getElementById("wishlist-count");
const emptyWishlist = document.getElementById("empty-wishlist");
const wishlistMessage = document.getElementById("wishlist-message");

function resolveProductImage(url) {
    if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/uploads/')) return new URL('../backend/public'+url, document.baseURI).href;
    if (url.startsWith('uploads/')) return new URL('../backend/public/'+url, document.baseURI).href;
    return url;
}

// API endpoints
const wishlistApi = new URL("../backend/public/api/wishlist", document.baseURI).pathname;
const cartApi = new URL("../backend/public/api/cart", document.baseURI).pathname;

// Load wishlist from backend
async function loadWishlist() {
    wishlistMessage.textContent = "";
    emptyWishlist.hidden = true;

    try {
        const response = await fetch(wishlistApi);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load wishlist.");
        }

        displayWishlist(result.data.items || []);

    } catch (error) {
        wishlistGrid.replaceChildren();
        wishlistCount.textContent = "Your Favorites (0)";
        emptyWishlist.hidden = true;
        wishlistMessage.textContent = error.message;
    }
}

// Display products
function displayWishlist(products) {
    wishlistGrid.replaceChildren();

    wishlistCount.textContent = `Your Favorites (${products.length})`;
    emptyWishlist.hidden = products.length !== 0;

    products.forEach(function (product) {
        const card = document.createElement("article");
        card.className = "wishlist-card";

        const imageBox = document.createElement("div");
        imageBox.className = "wishlist-image";

        const image = document.createElement("img");
        image.alt = product.name;

        if (product.image_url) {
            image.src = resolveProductImage(product.image_url);
        } else {
            image.alt = "No image available";
        }

        const heartButton = document.createElement("button");
        heartButton.type = "button";
        heartButton.className = "wishlist-heart active";
        heartButton.textContent = "♥";
        heartButton.setAttribute("aria-label", "Remove from wishlist");

        heartButton.addEventListener("click", function () {
            removeWishlistItem(product.id);
        });

        imageBox.append(image, heartButton);

        const details = document.createElement("div");
        details.className = "wishlist-details";

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description || "";

        const price = document.createElement("span");
        price.className = "wishlist-price";
        price.textContent = Number(product.price).toFixed(2) + " JOD";

        const moveButton = document.createElement("button");
        moveButton.type = "button";
        moveButton.className = "move-cart-btn";
        moveButton.textContent = "Move to Cart";

        moveButton.addEventListener("click", function () {
            moveToCart(product.id);
        });

        details.append(name, description, price, moveButton);
        card.append(imageBox, details);
        wishlistGrid.appendChild(card);
    });
}

// Remove product from wishlist
async function removeWishlistItem(productId) {
    wishlistMessage.textContent = "";

    try {
        const response = await fetch(
            wishlistApi + "/items/" + productId,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to remove product.");
        }

        await loadWishlist();
        window.DonoUI?.toast('Removed from wishlist.', 'success');

    } catch (error) {
        wishlistMessage.textContent = error.message;
    }
}

// Move product to cart
async function moveToCart(productId) {
    wishlistMessage.textContent = "";

    try {
        const response = await fetch(cartApi, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to add product to cart.");
        }

        // Remove only after successfully adding to cart
        const removeResponse = await fetch(
            wishlistApi + "/items/" + productId,
            {
                method: "DELETE"
            }
        );

        const removeResult = await removeResponse.json();

        if (!removeResponse.ok || !removeResult.success) {
            throw new Error(
                "Added to cart, but could not remove from wishlist."
            );
        }

        window.location.href = "cart.html";

    } catch (error) {
        wishlistMessage.textContent = error.message;
    }
}

// Initial load
loadWishlist();
