const cartApi = "/DONO-repo/backend/public/api/cart";
const couponApi = "/DONO-repo/backend/public/api/coupons/validate";


const productsBox = document.getElementById("cart-products");
const subtotalBox = document.getElementById("cart-subtotal");
const totalBox = document.getElementById("cart-total");
const countBox = document.getElementById("cart-count");
const emptyBox = document.getElementById("empty-cart");
const checkoutBtn = document.querySelector(".checkout-btn");

const couponInput = document.getElementById("coupon-code");
const couponBtn = document.getElementById("apply-coupon-btn");
const couponMessage = document.getElementById("coupon-message");
const discountRow = document.getElementById("discount-row");
const discountBox = document.getElementById("cart-discount");


const restoreBtn = document.getElementById("restore-products-btn");
const undoBox = document.getElementById("cart-undo");

if (restoreBtn) {
    restoreBtn.hidden = true;
}

if (undoBox) {
    undoBox.hidden = true;
}

let cartSubtotal = 0;
let couponCode = "";
let requestVersion = 0;


async function apiRequest(url, method = "GET", body = null) {
    const options = {
        method,
        credentials: "same-origin"
    };

    if (body !== null) {
        options.headers = {
            "Content-Type": "application/json"
        };

        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Request failed.");
    }

    return result;
}


function showCouponMessage(message, type = "") {
    couponMessage.textContent = message;
    couponMessage.className = type;
}


async function validateCoupon(code) {
    const version = ++requestVersion;

    discountRow.hidden = true;
    totalBox.textContent = cartSubtotal.toFixed(2) + " JOD";
    couponBtn.disabled = true;

    try {
        const result = await apiRequest(couponApi, "POST", {
            code: code,
            subtotal: cartSubtotal
        });

        if (version !== requestVersion) {
            return;
        }

        couponCode = code;

        discountBox.textContent =
            "-" + Number(result.data.discount_amount).toFixed(2) + " JOD";

        totalBox.textContent =
            Number(result.data.total_after_discount).toFixed(2) + " JOD";

        discountRow.hidden = false;

        showCouponMessage(
            "Coupon applied successfully.",
            "success"
        );

    } catch (error) {
        if (version !== requestVersion) {
            return;
        }

        couponCode = "";

        showCouponMessage(error.message, "error");

    } finally {
        if (version === requestVersion) {
            couponBtn.disabled = cartSubtotal <= 0;
        }
    }
}


async function loadCart() {
    try {
        const result = await apiRequest(cartApi);

        const cart = result.data.cart;
        const items = result.data.items || [];

        cartSubtotal = Number(cart?.subtotal || 0);

        subtotalBox.textContent =
            cartSubtotal.toFixed(2) + " JOD";

        totalBox.textContent =
            Number(cart?.total_amount || 0).toFixed(2) + " JOD";

        countBox.textContent =
            "Your Items (" + items.length + ")";

        emptyBox.hidden = items.length > 0;

        checkoutBtn.disabled = items.length === 0;
        couponBtn.disabled = items.length === 0;

        productsBox.innerHTML = "";

        items.forEach(function(product) {
            const item = document.createElement("article");
            item.className = "cart-item";


            const image = document.createElement("img");

            image.src =
                product.image || "assets/images/placeholder.png";

            image.alt = product.product_name;


            const details = document.createElement("div");
            details.className = "cart-item-details";

            const name = document.createElement("h3");
            name.textContent = product.product_name;

            const description = document.createElement("p");
            description.textContent = product.description || "";

            const price = document.createElement("span");
            price.className = "cart-item-price";

            price.textContent =
                Number(product.unit_price).toFixed(2) + " JOD";
  
            const actions = document.createElement("div");
            actions.className = "cart-item-actions";

            const quantity = document.createElement("div");
            quantity.className = "quantity-control";
 
            const minus = document.createElement("button");
            minus.type = "button";
            minus.className = "quantity-btn";
            minus.textContent = "−";
 
            const number = document.createElement("span");
            number.className = "quantity-number";
            number.textContent = product.quantity;
 
            const plus = document.createElement("button");
            plus.type = "button";
            plus.className = "quantity-btn";
            plus.textContent = "+";

         
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "remove-btn";
            remove.textContent = "Remove";

            minus.onclick = function() {
                if (Number(product.quantity) > 1) {
                    changeQuantity(
                        product.product_id,
                        Number(product.quantity) - 1
                    );
                }
            };

            plus.onclick = function() {
                changeQuantity(
                    product.product_id,
                    Number(product.quantity) + 1
                );
            };

            remove.onclick = function() {
                removeProduct(product.product_id);
            };

            quantity.append(minus, number, plus);
            actions.append(quantity, remove);

            details.append(
                name,
                description,
                price,
                actions
            );

            item.append(image, details);
            productsBox.appendChild(item);
        });
 
        if (couponCode && cartSubtotal > 0) {
            await validateCoupon(couponCode);

        } else {
            requestVersion++;
            discountRow.hidden = true;

            if (cartSubtotal <= 0) {
                couponCode = "";
                showCouponMessage("");
            }
        }

    } catch (error) {
        productsBox.textContent = error.message;

        checkoutBtn.disabled = true;
        couponBtn.disabled = true;
    }
}

async function changeQuantity(productId, quantity) {
    try {
        await apiRequest(cartApi + "/items", "PUT", {
            product_id: Number(productId),
            quantity: quantity
        });

        await loadCart();

    } catch (error) {
        alert(error.message);
    }
}

async function removeProduct(productId) {
    try {
        await apiRequest(cartApi + "/items", "DELETE", {
            product_id: Number(productId)
        });

        await loadCart();

    } catch (error) {
        alert(error.message);
    }
}


couponBtn.onclick = function() {
    const code = couponInput.value.trim();

    if (!code) {
        showCouponMessage(
            "Please enter a coupon code.",
            "error"
        );
        return;
    }

    if (cartSubtotal <= 0) {
        return;
    }

    validateCoupon(code);
};


loadCart();
