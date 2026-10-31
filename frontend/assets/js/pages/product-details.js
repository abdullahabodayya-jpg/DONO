
import { getProductById } from "../data/mock-products.js";

const API_BASE_URL =
    new URL("../../../../backend/public/api", import.meta.url).pathname;

const params = new URLSearchParams(window.location.search);
const productId = params.get("id") || "1";

let product = null;

const productContent = document.getElementById("product-content");

let quantity = 1;
let approvedDesign = null;
let pendingDesign = null;

let pendingDesignUrl = null;
let approvedDesignUrl = null;

let DESIGN_FEE = 5;
// ProductImageController stores "/uploads/products/..."; map it under backend/public.
function resolveProductImage(url) {
    if (!url) return new URL('../../img/gift-box.jpg', import.meta.url).href;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/uploads/')) return new URL('../../../../backend/public'+url, import.meta.url).href;
    if (url.startsWith('uploads/')) return new URL('../../../../backend/public/'+url, import.meta.url).href;
    return url;
}



function formatPrice(value) {
    return `JOD ${Number(value).toFixed(2)}`;
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(showToast.timeout);

    showToast.timeout = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


async function loadProduct() {
    try {
        productContent.innerHTML = `
            <div class="loading-message">
                <h2>Loading product...</h2>
                <p>Please wait while we load the product details.</p>
            </div>
        `;

        // Fetch product and images in parallel
        const [productResponse, imagesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`),
            fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}/images`)
        ]);

        if (!productResponse.ok) {
            throw new Error(`Product request failed: ${productResponse.status}`);
        }

        if (!imagesResponse.ok) {
            throw new Error(`Images request failed: ${imagesResponse.status}`);
        }

        const productResult = await productResponse.json();
        const imagesResult = await imagesResponse.json();

        if (!productResult.success || !productResult.data?.product) {
            throw new Error(
                productResult.message || "Product not found."
            );
        }

        if (!imagesResult.success || !Array.isArray(imagesResult.data)) {
            throw new Error(
                imagesResult.message || "Could not load product images."
            );
        }

        const apiProduct = productResult.data.product;

        // Keep temporary frontend-only options from mock data
        const mockProduct = getProductById(productId);

        // Map API images to the format expected by the existing UI
        const images = imagesResult.data.map(image => ({
            ...image,
            image_url: resolveProductImage(image.image_url),
            is_primary: Number(image.is_primary) === 1
        }));

        // Combine API data with temporary mock-only settings
        product = {
            id: apiProduct.id,
            name: apiProduct.name,
            description: apiProduct.description,
            price: Number(apiProduct.price),
            stock_quantity: Number(apiProduct.stock_quantity),
            product_type: apiProduct.product_type,
            is_active: apiProduct.is_active,
            category: apiProduct.category?.name ?? "Uncategorized",

            images: images.length > 0
                ? images
                : [{
                    image_url: resolveProductImage(apiProduct.image_url),
                    is_primary: true
                }],

            customization_fee: mockProduct?.customization_fee ?? 5,

            wrapping_options: mockProduct?.wrapping_options ?? [
                { name: "Basic Wrapping", price: 0 },
                { name: "Premium Wrapping", price: 3 }
            ]
        };

        DESIGN_FEE = Number(product.customization_fee);

        // Render only after product data is ready
        renderProduct();

    } catch (error) {
        console.error("Error loading product:", error);

        productContent.innerHTML = `
            <div class="loading-message">
                <h2>Unable to load product</h2>
                <p>${escapeHTML(error.message)}</p>
                <button type="button" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }
}


function getSelectedWrapping() {
    return document.querySelector('input[name="wrapping"]:checked');
}

function getWrappingFee() {
    const selected = getSelectedWrapping();
    return Number(selected?.dataset.price ?? 0);
}

function getCustomizationFee() {
    return approvedDesign ? DESIGN_FEE : 0;
}

function calculateTotal() {
    return (
        Number(product.price) +
        getCustomizationFee() +
        getWrappingFee()
    ) * quantity;
}

function renderProduct() {
    if (!product) {
        productContent.innerHTML = `
            <div class="loading-message">
                <h2>Product not found</h2>
                <p>The product you're looking for is unavailable.</p>
            </div>
        `;
        return;
    }

    const images = product.images ?? [];

    const primaryImage =
        images.find(image => image.is_primary)?.image_url ??
        images[0]?.image_url ??
        "https://placehold.co/800x800?text=No+Image";

    const wrappingOptions = product.wrapping_options ?? [];

    productContent.innerHTML = `
        <div class="product-layout">

            <div class="product-gallery">
                <div class="main-image-wrapper">
                    <img
                        id="main-product-image"
                        class="main-product-image"
                        src="${escapeHTML(primaryImage)}"
                        alt="${escapeHTML(product.name)}"
                    >
                </div>

                <div class="thumbnail-list">
                    ${images.map((image, index) => `
                        <button
                            type="button"
                            class="thumbnail ${index === 0 ? "active" : ""}"
                            data-image="${escapeHTML(image.image_url)}"
                            aria-label="View product image ${index + 1}"
                        >
                            <img
                                src="${escapeHTML(image.image_url)}"
                                alt=""
                            >
                        </button>
                    `).join("")}
                </div>
            </div>

            <div class="product-info">

                <p class="product-category">
                    ${escapeHTML(product.category)}
                </p>

                <h1 class="product-title">
                    ${escapeHTML(product.name)}
                </h1>

                <p class="product-description">
                    ${escapeHTML(product.description)}
                </p>

                <div class="product-price">
                    ${formatPrice(product.price)}
                </div>

                <p class="stock-status ${product.stock_quantity <= 0 ? "out-of-stock" : ""}">
                    ${
                        product.stock_quantity > 0
                            ? `${product.stock_quantity} items available`
                            : "Out of stock"
                    }
                </p>

                <!-- QUANTITY -->

                <div class="option-group">
                    <h3 class="option-title">Quantity</h3>

                    <div class="quantity-control">
                        <button type="button" id="decrease-quantity">−</button>

                        <span id="quantity-value" class="quantity-value">
                            1
                        </span>

                        <button type="button" id="increase-quantity">+</button>
                    </div>
                </div>

                <!-- GIFT OPTIONS -->

                <div class="option-group">
                    <h3 class="option-title">
                        Who is this gift for?
                    </h3>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="gift-type"
                            value="myself"
                            checked
                        >
                        <span>For Myself</span>
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="gift-type"
                            value="gift"
                        >
                        <span>Send as Gift</span>
                    </label>

                    <div id="recipient-fields" class="recipient-fields" hidden>
                        <input
                            class="form-control"
                            type="text"
                            id="recipient-name"
                            placeholder="Recipient Name"
                        >

                        <input
                            class="form-control"
                            type="tel"
                            id="recipient-phone"
                            placeholder="Recipient Phone"
                        >

                        <textarea
                            class="form-control"
                            id="recipient-address"
                            placeholder="Recipient Address"
                        ></textarea>

                        <textarea
                            class="form-control"
                            id="gift-message"
                            placeholder="Add a personal message (optional)"
                        ></textarea>
                    </div>
                </div>

                <!-- CUSTOM DESIGN -->

                <div class="custom-design-section">
                    <div>
                        <span class="custom-eyebrow">MAKE IT PERSONAL</span>

                        <h3>Something only you could create.</h3>

                        <p>
                            Turn your gift into a one-of-a-kind piece.
                        </p>
                    </div>

                    <button
                        type="button"
                        id="open-design-modal"
                        class="custom-design-button"
                    >
                        <span class="custom-design-icon">✳</span>

                        <span>
                            <strong>Custom Design</strong>
                            <small>AI magic or your own image</small>
                        </span>

                        <span class="custom-design-arrow">↗</span>
                    </button>

                    <p id="design-status" class="design-status">
                        No custom design selected
                    </p>
                </div>

                <!-- DESIGN MODAL -->

                <dialog id="design-modal" class="design-modal">
                    <div class="design-modal-inner">

                        <div class="modal-header">
                            <div>
                                <span class="custom-eyebrow">
                                    YOUR CREATIVE SPACE
                                </span>

                                <h2>Let's make it yours ✳</h2>

                                <p>
                                    How would you like to create your design?
                                </p>
                            </div>

                            <button
                                type="button"
                                id="close-design-modal"
                                class="modal-close"
                            >×</button>
                        </div>

                        <!-- METHOD SELECTION -->

                        <div id="design-methods" class="design-methods">

                            <button
                                type="button"
                                class="design-method-card"
                                data-method="ai"
                            >
                                <span class="method-icon">✧</span>
                                <strong>Chat with AI</strong>
                                <small>
                                    Describe your vibe and create a design together.
                                </small>
                                <span class="method-action">
                                    Start creating ↗
                                </span>
                            </button>

                            <button
                                type="button"
                                class="design-method-card"
                                data-method="upload"
                            >
                                <span class="method-icon">▧</span>
                                <strong>Upload your image</strong>
                                <small>
                                    Bring your own artwork, photo or illustration.
                                </small>
                                <span class="method-action">
                                    Upload image ↗
                                </span>
                            </button>

                        </div>

                        <!-- AI PANEL -->

                        <div id="ai-design-panel" class="design-panel" hidden>

                            <button
                                type="button"
                                class="back-to-methods"
                            >← Back</button>

                            <h3>Tell us what's in your head.</h3>

                            <p>
                                Describe the design you imagine.
                            </p>

                            <div class="ai-chat-box">
                                <div class="ai-message">
                                    Hey! ✨ Tell me what kind of design you're dreaming of.
                                </div>

                                <div id="chat-messages"></div>
                            </div>

                            <div class="chat-input-row">
                                <input
                                    type="text"
                                    id="ai-design-prompt"
                                    placeholder="A pink floral design with..."
                                >

                                <button type="button" id="send-ai-prompt">
                                    Send ↗
                                </button>
                            </div>

                            <p class="demo-note">
                                AI chat is a frontend demo until the AI service is connected.
                            </p>
                        </div>

                        <!-- UPLOAD PANEL -->

                        <div id="upload-design-panel" class="design-panel" hidden>

                            <button
                                type="button"
                                class="back-to-methods"
                            >← Back</button>

                            <h3>Bring your own creativity.</h3>

                            <p>
                                Upload an image to preview it on your product.
                            </p>

                            <label
                                class="upload-zone"
                                for="custom-design-file"
                            >
                                <span>＋</span>
                                <strong>Choose your image</strong>
                                <small>JPG, PNG or WEBP · Maximum 5MB</small>
                            </label>

                            <input
                                type="file"
                                id="custom-design-file"
                                accept="image/jpeg,image/png,image/webp"
                                hidden
                            >

                            <p id="upload-file-name" class="demo-note">
                                No image selected yet.
                            </p>
                        </div>

                        <!-- PREVIEW PANEL -->

                        <div id="design-preview-panel" class="design-panel" hidden>

                            <button
                                type="button"
                                class="back-to-methods"
                            >← Start over</button>

                            <h3>Your design preview ✨</h3>

                            <p>
                                Here's how your customized product could look.
                            </p>

                            <div class="design-product-preview">
                                <img
                                    id="preview-product-image"
                                    alt="Product preview"
                                >

                                <div class="design-overlay">
                                    <img
                                        id="preview-design-image"
                                        alt="Your custom design"
                                    >
                                </div>
                            </div>

                            <div class="design-price-card">
                                <div>
                                    <span>Custom design fee</span>
                                    <strong id="design-extra-price">
                                        JOD 0.00
                                    </strong>
                                </div>

                                <div>
                                    <span>New estimated total</span>
                                    <strong id="design-new-total">
                                        JOD 25.00
                                    </strong>
                                </div>
                            </div>

                            <p class="demo-note">
                                This is a visual demo. Final production placement
                                and pricing must be confirmed by the store.
                            </p>

                            <div class="design-confirm-actions">
                                <button
                                    type="button"
                                    id="cancel-design"
                                    class="cancel-design"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    id="approve-design"
                                    class="approve-design"
                                >
                                    Approve Design ✓
                                </button>
                            </div>
                        </div>

                    </div>
                </dialog>

                <!-- WRAPPING -->

                <div class="option-group">
                    <h3 class="option-title">Gift Wrapping</h3>

                    <div class="wrapping-options">
                        ${wrappingOptions.map((option, index) => `
                            <div class="wrapping-option">
                                <label>
                                    <input
                                        type="radio"
                                        name="wrapping"
                                        value="${escapeHTML(option.name)}"
                                        data-price="${Number(option.price)}"
                                        ${index === 0 ? "checked" : ""}
                                    >

                                    <span>${escapeHTML(option.name)}</span>
                                </label>

                                <span class="wrapping-price">
                                    ${
                                        Number(option.price) === 0
                                            ? "Free"
                                            : `+ ${formatPrice(option.price)}`
                                    }
                                </span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <!-- PRICE SUMMARY -->

                <div class="price-summary">
                    <h3>Price Details</h3>

                    <div class="summary-row">
                        <span>Product Price</span>
                        <strong id="summary-product">
                            ${formatPrice(product.price)}
                        </strong>
                    </div>

                    <div class="summary-row">
                        <span>Custom Design</span>
                        <strong id="summary-customization">
                            ${formatPrice(0)}
                        </strong>
                    </div>

                    <div class="summary-row">
                        <span>Gift Wrapping</span>
                        <strong id="summary-wrapping">
                            ${formatPrice(0)}
                        </strong>
                    </div>

                    <div class="summary-row">
                        <span>Quantity</span>
                        <strong id="summary-quantity">1</strong>
                    </div>

                    <div class="summary-row summary-total">
                        <span>Total</span>
                        <strong id="summary-total">
                            ${formatPrice(product.price)}
                        </strong>
                    </div>
                </div>

                <!-- PURCHASE ACTIONS -->

                <div class="action-buttons">
                    <button
                        type="button"
                        class="primary-button"
                        id="add-to-cart"
                        ${product.stock_quantity <= 0 ? "disabled" : ""}
                    >
                        Add to Cart
                    </button>

                    <button
                        type="button"
                        class="buy-now-button"
                        id="buy-now"
                        ${product.stock_quantity <= 0 ? "disabled" : ""}
                    >
                        Buy Now
                    </button>
                </div>

                <button
                    type="button"
                    class="wishlist-button"
                    id="wishlist-button"
                >
                    ♡ Add to Wishlist
                </button>

            </div>
        </div>
    `;

    bindEvents();
}



function updatePrice() {
    const customizationFee = getCustomizationFee();
    const wrappingFee = getWrappingFee();

    document.getElementById("summary-product").textContent =
        formatPrice(product.price);

    document.getElementById("summary-customization").textContent =
        formatPrice(customizationFee);

    document.getElementById("summary-wrapping").textContent =
        formatPrice(wrappingFee);

    document.getElementById("summary-quantity").textContent =
        quantity;

    document.getElementById("summary-total").textContent =
        formatPrice(calculateTotal());
}



function validateSelection() {
    const giftType = document.querySelector(
        'input[name="gift-type"]:checked'
    )?.value;

    if (giftType === "gift") {
        const name = document.getElementById("recipient-name").value.trim();
        const phone = document.getElementById("recipient-phone").value.trim();
        const address = document.getElementById("recipient-address").value.trim();

        if (!name || !phone || !address) {
            showToast("Please complete the recipient details.");
            return false;
        }
    }

    return true;
}



function getDemoOrderData() {
    const giftType = document.querySelector(
        'input[name="gift-type"]:checked'
    )?.value;

    const wrapping = getSelectedWrapping();

    return {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: Number(product.price),
        customization_fee: getCustomizationFee(),
        wrapping: wrapping?.value ?? null,
        wrapping_fee: getWrappingFee(),
        total: calculateTotal(),

        gift: giftType === "gift" ? {
            recipient_name: document.getElementById("recipient-name").value.trim(),
            recipient_phone: document.getElementById("recipient-phone").value.trim(),
            recipient_address: document.getElementById("recipient-address").value.trim(),
            gift_message: document.getElementById("gift-message").value.trim()
        } : null,

        custom_design: approvedDesign ? {
            method: approvedDesign.method,
            fee: approvedDesign.fee
        } : null
    };
}



// The existing demo customization widgets remain visible, but only standard items
// can be sent to the real cart until server-side gift/wrapping pricing is integrated.
function hasUnconnectedCustomization() {
    const giftType = document.querySelector('input[name="gift-type"]:checked')?.value;
    return giftType === 'gift' || getWrappingFee() > 0 || Boolean(approvedDesign);
}

async function addToCart() {
    if (!validateSelection()) return false;
    if (hasUnconnectedCustomization()) {
        showToast('Personalized gifts and paid wrapping are not connected to checkout yet. Choose standard options to continue.');
        return false;
    }
    const btn = document.getElementById('add-to-cart');
    btn.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({product_id: Number(product.id), quantity})
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(response.status === 401 ? 'Please log in before adding products to your cart.' : data.message || 'Unable to add product.');
        showToast('Added to your cart!');
        return true;
    } catch (error) {
        showToast(error.message);
        return false;
    } finally {
        btn.disabled = false;
    }
}

async function buyNow() {
    if (await addToCart()) window.location.href = 'cart.html';
}

async function addToWishlist() {
    const btn = document.getElementById('wishlist-button');
    btn.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/items`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({product_id: Number(product.id)})
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(response.status === 401 ? 'Please log in to save favorites.' : data.message || 'Unable to update wishlist.');
        showToast('Added to your wishlist!');
    } catch (error) {
        showToast(error.message);
    } finally {
        btn.disabled = false;
    }
}


function showDesignPanel(panelId) {
    const panelIds = [
        "design-methods",
        "ai-design-panel",
        "upload-design-panel",
        "design-preview-panel"
    ];

    panelIds.forEach(id => {
        document.getElementById(id).hidden = true;
    });

    document.getElementById(panelId).hidden = false;
}

function openDesignModal() {
    const modal = document.getElementById("design-modal");

    showDesignPanel("design-methods");
    modal.showModal();
}

function showDesignPreview(imageUrl, method) {
    pendingDesign = {
        imageUrl,
        method
    };

    const primaryImage =
        product.images.find(image => image.is_primary)?.image_url ??
        product.images[0]?.image_url ??
        product.image_url ??
        "https://placehold.co/800x800?text=No+Image";

    document.getElementById("preview-product-image").src =
        primaryImage;

    document.getElementById("preview-design-image").src =
        imageUrl;

    document.getElementById("design-extra-price").textContent =
        formatPrice(DESIGN_FEE);

    const previewTotal =
        (Number(product.price) +
            (approvedDesign ? DESIGN_FEE : DESIGN_FEE) +
            getWrappingFee()) * quantity;

    document.getElementById("design-new-total").textContent =
        formatPrice(previewTotal);

    showDesignPanel("design-preview-panel");
}

function approvePendingDesign() {
    if (!pendingDesign) return;


    if (
        approvedDesignUrl &&
        approvedDesignUrl !== pendingDesignUrl
    ) {
        URL.revokeObjectURL(approvedDesignUrl);
    }

    approvedDesign = {
        ...pendingDesign,
        fee: DESIGN_FEE
    };

    approvedDesignUrl =
        pendingDesign.method === "upload"
            ? pendingDesign.imageUrl
            : null;

    pendingDesign = null;
    pendingDesignUrl = null;

    document.getElementById("design-status").textContent =
        "✦ Custom design approved";

    updatePrice();

    document.getElementById("design-modal").close();

    showToast("Your custom design has been approved!");
}

function cancelPendingDesign() {
    pendingDesign = null;

    if (pendingDesignUrl) {
        URL.revokeObjectURL(pendingDesignUrl);
        pendingDesignUrl = null;
    }

    document.getElementById("design-modal").close();

    showToast("Design selection cancelled.");
}

function bindDesignEvents() {
    const modal = document.getElementById("design-modal");

    document.getElementById("open-design-modal")
        .addEventListener("click", openDesignModal);

    document.getElementById("close-design-modal")
        .addEventListener("click", () => modal.close());

    document.querySelectorAll("[data-method]").forEach(button => {
        button.addEventListener("click", () => {
            const method = button.dataset.method;

            if (method === "ai") {
                showDesignPanel("ai-design-panel");
            }

            if (method === "upload") {
                showDesignPanel("upload-design-panel");
            }
        });
    });

    document.querySelectorAll(".back-to-methods").forEach(button => {
        button.addEventListener("click", () => {
            if (pendingDesignUrl) {
                URL.revokeObjectURL(pendingDesignUrl);
                pendingDesignUrl = null;
            }

            pendingDesign = null;
            showDesignPanel("design-methods");
        });
    });

    // AI DEMO

    document.getElementById("send-ai-prompt")
        .addEventListener("click", () => {
            const input = document.getElementById("ai-design-prompt");
            const prompt = input.value.trim();

            if (!prompt) {
                showToast("Describe your design first.");
                return;
            }

            const messages = document.getElementById("chat-messages");

            const message = document.createElement("div");
            message.className = "user-message";
            message.textContent = prompt;

            messages.appendChild(message);

            input.value = "";

            const previewButton = document.createElement("button");
            previewButton.type = "button";
            previewButton.className = "approve-design";
            previewButton.textContent = "Preview this concept ✨";

            previewButton.addEventListener("click", () => {
                const demoImage =
                    "https://placehold.co/700x700/E6E0F0/6F4E37?text=AI+Design+Preview";

                showDesignPreview(demoImage, "ai");
            });

            messages.appendChild(previewButton);

            showToast("Demo concept ready for preview.");
        });

    // IMAGE UPLOAD

    document.getElementById("custom-design-file")
        .addEventListener("change", event => {
            const file = event.target.files[0];

            if (!file) return;

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!allowedTypes.includes(file.type)) {
                showToast("Please select JPG, PNG or WEBP.");
                event.target.value = "";
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast("Image must be smaller than 5MB.");
                event.target.value = "";
                return;
            }

            if (pendingDesignUrl) {
                URL.revokeObjectURL(pendingDesignUrl);
            }

            pendingDesignUrl = URL.createObjectURL(file);

            document.getElementById("upload-file-name").textContent =
                file.name;

            showDesignPreview(pendingDesignUrl, "upload");
        });

    document.getElementById("approve-design")
        .addEventListener("click", approvePendingDesign);

    document.getElementById("cancel-design")
        .addEventListener("click", cancelPendingDesign);


    modal.addEventListener("close", () => {
        if (pendingDesignUrl) {
            URL.revokeObjectURL(pendingDesignUrl);
            pendingDesignUrl = null;
        }

        pendingDesign = null;
    });
}



function bindEvents() {



    document.querySelectorAll(".thumbnail").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".thumbnail").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            document.getElementById("main-product-image").src =
                button.dataset.image;
        });
    });



    document.getElementById("decrease-quantity")
        .addEventListener("click", () => {
            if (quantity > 1) {
                quantity--;
                updateQuantity();
            }
        });

    document.getElementById("increase-quantity")
        .addEventListener("click", () => {
            if (quantity < Number(product.stock_quantity)) {
                quantity++;
                updateQuantity();
            } else {
                showToast("Maximum available quantity reached.");
            }
        });



    document.querySelectorAll('input[name="gift-type"]')
        .forEach(radio => {
            radio.addEventListener("change", () => {
                const fields =
                    document.getElementById("recipient-fields");

                fields.hidden = radio.value !== "gift" || !radio.checked;
            });
        });


    document.querySelectorAll('input[name="wrapping"]')
        .forEach(radio => {
            radio.addEventListener("change", updatePrice);
        });



    document.getElementById("add-to-cart")
        .addEventListener("click", addToCart);

    document.getElementById("buy-now")
        .addEventListener("click", buyNow);

    document.getElementById("wishlist-button")
        .addEventListener("click", addToWishlist);



    bindDesignEvents();
}

function updateQuantity() {
    document.getElementById("quantity-value").textContent = quantity;
    updatePrice();
}



loadProduct();