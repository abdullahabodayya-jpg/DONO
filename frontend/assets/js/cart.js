
/* DONO | Shopping Cart */

// API URLs
const cartApi = new URL("../backend/public/api/cart", document.baseURI).pathname;
const couponApi = new URL("../backend/public/api/coupons/validate", document.baseURI).pathname;

function resolveProductImage(url) {
    if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/uploads/')) return new URL('../backend/public'+url, document.baseURI).href;
    if (url.startsWith('uploads/')) return new URL('../backend/public/'+url, document.baseURI).href;
    return url;
}

// Page Elements
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

// Hide old demo controls
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

// Send request to backend
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

// Show coupon message
function showCouponMessage(message, type = "") {
    couponMessage.textContent = message;
    couponMessage.className = type;
    if(message && type==='error') window.DonoUI?.toast(message, 'error');
}

// Validate coupon using backend
async function validateCoupon(code) {
    const version = ++requestVersion;

    discountRow.hidden = true;
    couponBtn.disabled = true;

    try {
        const result = await apiRequest(couponApi, "POST", {
            code: code
        });

        if (version !== requestVersion) {
            return;
        }

        couponCode = code;

        discountBox.textContent =
            "-" + Number(result.data.discount_amount).toFixed(2) + " USD";

        totalBox.textContent =
            Number(result.data.final_total).toFixed(2) + " USD";

        discountRow.hidden = false;

        showCouponMessage("Coupon applied successfully.", "success");
        window.DonoUI?.toast("Coupon applied and included in your total.", "success");

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

// Load cart from backend
async function loadCart() {
    try {
        const result = await apiRequest(cartApi);

        const cart = result.data.cart;
        const items = result.data.items || [];

        cartSubtotal = Number(cart?.subtotal || 0);

        subtotalBox.textContent =
            cartSubtotal.toFixed(2) + " USD";

        totalBox.textContent =
            Number(cart?.total_amount || 0).toFixed(2) + " USD";

        countBox.textContent =
            "Your Items (" + items.length + ")";

        // The authoritative coupon and discount are persisted in the cart order.
        if (cart?.coupon_code && Number(cart.discount_amount) > 0) {
            couponCode = String(cart.coupon_code);
            couponInput.value = couponCode;
            discountBox.textContent = "-" + Number(cart.discount_amount).toFixed(2) + " USD";
            discountRow.hidden = false;
        } else {
            couponCode = '';
            discountRow.hidden = true;
        }
        const shippingBox = document.getElementById('cart-shipping');
        if (shippingBox) shippingBox.textContent = Number(cart?.shipping_fee || 0).toFixed(2) + ' USD';

        const gift = result.data.gift;
        const giftFee = Number(gift?.wrapping_fee || 0);
        const giftWrapRow = document.getElementById('wrapping-row');
        const giftWrapAmount = document.getElementById('cart-wrapping');
        const giftBox = document.getElementById('cart-gift-summary');
        giftWrapRow.hidden = giftFee <= 0;
        giftWrapAmount.textContent = giftFee.toFixed(2) + ' USD';
        giftBox.replaceChildren();
        if (gift) {
            giftBox.hidden = false;
            const title = document.createElement('strong'); title.textContent = 'Gift preferences';
            const copy = document.createElement('p');
            const recipient = gift.recipient_name ? 'For ' + gift.recipient_name + ' · ' : 'For myself · ';
            copy.textContent = recipient + (gift.wrapping_type || 'Basic Wrapping') + (giftFee ? ` (+${giftFee.toFixed(2)} USD)` : '');
            const reset = document.createElement('button');reset.type='button';reset.textContent='Remove gift preferences';
            reset.addEventListener('click', async () => {
                reset.disabled = true;
                try {
                    await apiRequest(cartApi + '/gift', 'PUT', {send_as_gift:false, wrapping_type:'Basic Wrapping'});
                    await loadCart();
                    window.DonoUI?.toast('Gift settings cleared.', 'success');
                } catch(e) {reset.disabled=false;window.DonoUI?.toast(e.message, 'error');}
            });
            giftBox.append(title,copy,reset);
        } else {giftBox.hidden = true;}

        emptyBox.hidden = items.length > 0;

        checkoutBtn.disabled = items.length === 0;
        couponBtn.disabled = items.length === 0;

        productsBox.innerHTML = "";

        items.forEach(function(product) {
            const item = document.createElement("article");
            item.className = "cart-item";

            // Product image
            const image = document.createElement("img");

            image.src = resolveProductImage(product.image) || "assets/img/gift-box.jpg";

            image.alt = product.product_name;

            // Product details
            const details = document.createElement("div");
            details.className = "cart-item-details";

            const name = document.createElement("h3");
            name.textContent = product.product_name;

            const description = document.createElement("p");
            description.textContent = product.description || "";

            const price = document.createElement("span");
            price.className = "cart-item-price";

            price.textContent =
                Number(product.unit_price).toFixed(2) + " USD";

            // Product actions
            const actions = document.createElement("div");
            actions.className = "cart-item-actions";

            const quantity = document.createElement("div");
            quantity.className = "quantity-control";

            // Decrease quantity
            const minus = document.createElement("button");
            minus.type = "button";
            minus.className = "quantity-btn";
            minus.textContent = "−";

            // Current quantity
            const number = document.createElement("span");
            number.className = "quantity-number";
            number.textContent = product.quantity;

            // Increase quantity
            const plus = document.createElement("button");
            plus.type = "button";
            plus.className = "quantity-btn";
            plus.textContent = "+";

            // Remove product
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

            remove.onclick = async function() {
                remove.disabled = true;
                await removeProduct(product.product_id);
                remove.disabled = false;
            };

            if (product.custom_box) {
                const components = product.custom_box.components || [];
                const configuration = product.custom_box.configuration || {};
                const breakdown = document.createElement('div');
                breakdown.className = 'cart-box-breakdown';
                const heading = document.createElement('strong'); heading.textContent = 'Inside your custom box';
                const list = document.createElement('ul');
                for (const part of components) {
                    const li = document.createElement('li');
                    li.textContent = `${part.quantity} × ${part.name} (${Number(part.unit_price).toFixed(2)} USD each)`;
                    list.append(li);
                }
                const details = configuration.personalization || {};
                const note = document.createElement('p');
                note.textContent = [details.initials && `Personalization: ${details.initials}`, details.ribbon_color && `Ribbon: ${details.ribbon_color}`, configuration.card?.message && `Card: ${configuration.card.message}`].filter(Boolean).join(' · ');
                breakdown.append(heading, list, note);
                description.replaceWith(breakdown);
                number.textContent = '1 custom box';
                actions.append(remove);
            } else {
                quantity.append(minus, number, plus);
                actions.append(quantity, remove);
            }

            details.append(
                name,
                description,
                price,
                actions
            );

            item.append(image, details);
            productsBox.appendChild(item);
        });

        // Revalidate coupon after cart changes
        if (couponCode && cartSubtotal > 0 && !(cart?.coupon_code && Number(cart.discount_amount) > 0)) {
            await validateCoupon(couponCode);

        } else {
            requestVersion++;
            discountRow.hidden = !(cart?.coupon_code && Number(cart.discount_amount) > 0);

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

// Update product quantity
async function changeQuantity(productId, quantity) {
    try {
        await apiRequest(cartApi + "/items", "PUT", {
            product_id: Number(productId),
            quantity: quantity
        });

        await loadCart();

    } catch (error) {
        window.DonoUI?.toast(error.message, 'error');
    }
}

// Remove product from cart
async function removeProduct(productId) {
    try {
        await apiRequest(cartApi + "/items", "DELETE", {
            product_id: Number(productId)
        });

        await loadCart();
        window.DonoUI?.toast('Gift removed from your cart.', 'success');

    } catch (error) {
        window.DonoUI?.toast(error.message, 'error');
    }
}

// Apply coupon
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

// Load cart when page opens
loadCart();

// DONO Stripe integration: server chooses authenticated user's cart/order and recalculates amount.
checkoutBtn.addEventListener('click', async () => {
    checkoutBtn.disabled = true;
    try {
        const endpoint = new URL('../backend/public/api/payments/checkout', document.baseURI).pathname;
        const result = await apiRequest(endpoint, 'POST', {coupon_code: couponCode.trim()});
        const destination = result?.data?.checkout_url;
        if (!destination || !/^https:\/\/checkout\.stripe\.com\//i.test(destination)) {
            throw new Error('Stripe Checkout URL was not returned.');
        }
        window.location.assign(destination);
    } catch (error) {
        showCouponMessage(error.message || 'Unable to start secure checkout.', 'error');
        checkoutBtn.disabled = cartSubtotal <= 0;
    }
});
