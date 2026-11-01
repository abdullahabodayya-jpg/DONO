/* ===================================
   DONO ADMIN - PRODUCTS MANAGEMENT
   Products Listing, Search and Filter
=================================== */

// Get page elements
const productsTableBody = document.getElementById("productsTableBody");
const productSearch = document.getElementById("productSearch");
const productTypeFilter = document.getElementById("productTypeFilter");

// Store products received from API
let products = [];

// Build API URL based on the project folder
function resolveProductImage(url) {
    if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/uploads/')) return new URL('../../../../backend/public'+url, import.meta.url).href;
    if (url.startsWith('uploads/')) return new URL('../../../../backend/public/'+url, import.meta.url).href;
    return url;
}

const productsApiUrl = new URL("../../../../backend/public/api/admin/products", import.meta.url);

// Public products URL for displaying active product images
const publicProductsApiUrl = new URL("../../../../backend/public/api/products/", import.meta.url);

// Store loaded product images
const productImagesCache = new Map();

// Build URL for a specific product
function getProductUrl(productId) {
    return productsApiUrl.href + "/" + productId;
}

// Build URL for product images
function getProductImagesUrl(product) {
    const productId = Number(product.id);

    // Public images can be accessed for active products
    if (Number(product.is_active) === 1) {
        return publicProductsApiUrl.href + productId + "/images";
    }

    // Inactive product images require an admin endpoint
    return getProductUrl(productId) + "/images";
}

// Read API error messages
function getApiErrorMessage(result, fallbackMessage) {
    const errors = result?.data?.errors;

    if (errors && typeof errors === "object") {
        const messages = Object.values(errors);

        if (messages.length > 0) {
            return messages.join(" | ");
        }
    }

    return result?.message || fallbackMessage;
}

// Send requests and handle API responses
async function sendApiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            ...options.headers,
        },
        ...options,
    });

    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error("The server returned an invalid response.");
    }

    if (response.status === 401) {
        throw new Error("Please log in to continue.");
    }

    if (response.status === 403) {
        throw new Error("Admin access is required.");
    }

    if (!response.ok || result.success !== true) {
        throw new Error(getApiErrorMessage(result, "Something went wrong."));
    }

    return result;
}

// Display a message inside the table
function showMessage(message) {
    productsTableBody.innerHTML = "";

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.textContent = message;

    row.appendChild(cell);
    productsTableBody.appendChild(row);
}

// Create an action button
function createActionButton(text, className, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;

    button.addEventListener("click", onClick);

    return button;
}

// Load product images from API
async function getProductImages(product, forceRefresh = false) {
    const productId = Number(product.id);

    if (!forceRefresh && productImagesCache.has(productId)) {
        return productImagesCache.get(productId);
    }

    const request = sendApiRequest(getProductImagesUrl(product))
        .then(function (result) {
            if (!Array.isArray(result.data)) {
                throw new Error("Invalid product images response.");
            }

            return result.data;
        })
        .catch(function (error) {
            productImagesCache.delete(productId);
            throw error;
        });

    productImagesCache.set(productId, request);

    return request;
}

// Display primary product image in table
async function loadProductThumbnail(product, imageCell) {
    try {
        const images = await getProductImages(product);

        const primaryImage =
            images.find(function (image) {
                return Number(image.is_primary) === 1;
            }) || images[0];

        if (!primaryImage || !primaryImage.image_url) {
            return;
        }

        const imageElement = document.createElement("img");

        imageElement.src = resolveProductImage(primaryImage.image_url);
        imageElement.alt = product.name;
        imageElement.className = "admin-product-thumbnail";
        imageElement.loading = "lazy";

        imageCell.replaceChildren(imageElement);
    } catch (error) {
        // Keep the placeholder if images are unavailable
        imageCell.textContent = "—";
    }
}

// Display products in the table
function renderProducts() {
    const searchValue = productSearch.value.trim().toLowerCase();
    const selectedType = productTypeFilter.value;

    const filteredProducts = products.filter(function (product) {
        const matchesSearch = product.name.toLowerCase().includes(searchValue);

        const matchesType = selectedType === "all" || product.product_type === selectedType;

        return matchesSearch && matchesType;
    });

    productsTableBody.innerHTML = "";

    if (filteredProducts.length === 0) {
        showMessage("No products found.");
        return;
    }

    filteredProducts.forEach(function (product) {
        const row = document.createElement("tr");

        const values = [
            "—",
            product.name,
            product.product_type,
            Number(product.price).toFixed(2) + " USD",
            product.stock_quantity,
            Number(product.is_active) === 1 ? "Active" : "Inactive",
            "—",
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        // Display product image
        const imageCell = row.cells[0];
        loadProductThumbnail(product, imageCell);

        // Create product action buttons
        const actionsCell = row.cells[6];
        const actionsWrapper = document.createElement("div");

        actionsWrapper.className = "admin-product-actions";

        // Edit product
        const editButton = createActionButton(
            "Edit",
            "btn btn-outline admin-product-action-btn",
            function () {
                openEditProduct(product);
            },
        );

        // Manage images
        const imagesButton = createActionButton(
            "Images",
            "btn btn-outline admin-product-action-btn",
            function () {
                openProductImages(product);
            },
        );

        // Delete product
        const deleteButton = createActionButton(
            "Delete",
            "btn btn-outline admin-product-action-btn admin-product-delete-btn",
            function () {
                openDeleteProduct(product);
            },
        );

        actionsWrapper.appendChild(editButton);
        actionsWrapper.appendChild(imagesButton);
        actionsWrapper.appendChild(deleteButton);

        actionsCell.replaceChildren(actionsWrapper);

        productsTableBody.appendChild(row);
    });
}

// Load products from backend
async function loadProducts() {
    showMessage("Loading products...");

    try {
        const response = await fetch(productsApiUrl, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
            },
        });

        const result = await response.json();

        if (response.status === 401) {
            products = [];
            showMessage("Please log in to access product management.");
            return;
        }

        if (response.status === 403) {
            products = [];
            showMessage("Admin access is required.");
            return;
        }

        if (!response.ok || result.success !== true) {
            throw new Error(result.message || "Failed to load products.");
        }

        products = Array.isArray(result.data) ? result.data : [];

        // Refresh cached images when products change
        productImagesCache.clear();

        renderProducts();
    } catch (error) {
        console.error("Products loading error:", error);
        showMessage("Unable to load products. Please try again.");
    }
}

// Search and filter events
productSearch.addEventListener("input", renderProducts);
productTypeFilter.addEventListener("change", renderProducts);

// Load products when the page opens
loadProducts();

// ===================================
// ADD / EDIT PRODUCT MODAL
// ===================================

// Get modal elements
const addProductBtn = document.getElementById("addProductBtn");
const addProductDialog = document.getElementById("addProductDialog");
const closeAddProductDialog = document.getElementById("closeAddProductDialog");
const cancelAddProduct = document.getElementById("cancelAddProduct");
const productCategory = document.getElementById("productCategory");

// Get form elements
const addProductForm = document.getElementById("addProductForm");
const saveProductBtn = document.getElementById("saveProductBtn");
const addProductMessage = document.getElementById("addProductMessage");
const editingProductId = document.getElementById("editingProductId");

const addProductDialogTitle = document.getElementById("addProductDialogTitle");
const addProductDialogSubtitle = document.getElementById("addProductDialogSubtitle");
const productImageNote = document.getElementById("productImageNote");

// Categories API URL
const categoriesApiUrl = new URL("../../../../backend/public/api/categories", import.meta.url);

// Show form message
function showProductFormMessage(message) {
    addProductMessage.textContent = message;
    addProductMessage.hidden = false;
}

// Load available categories from API
async function loadCategories() {
    productCategory.innerHTML = '<option value="">Loading categories...</option>';
    productCategory.disabled = true;

    try {
        const response = await fetch(categoriesApiUrl, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
            },
        });

        const result = await response.json();

        if (!response.ok || result.success !== true) {
            throw new Error(result.message || "Failed to load categories.");
        }

        // Clear old options
        productCategory.innerHTML = '<option value="">Select Category</option>';

        const categories = result.data.items;

        // Add categories to dropdown
        categories.forEach(function (category) {
            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            productCategory.appendChild(option);
        });

        if (categories.length === 0) {
            productCategory.innerHTML = '<option value="">No categories available</option>';
            return false;
        }

        productCategory.disabled = false;

        return true;
    } catch (error) {
        console.error("Categories loading error:", error);

        productCategory.innerHTML = '<option value="">Unable to load categories</option>';

        showProductFormMessage("Unable to load categories.");

        return false;
    }
}

// Open Add Product modal
async function openAddProduct() {
    // Reset form
    addProductForm.reset();
    editingProductId.value = "";
    addProductMessage.hidden = true;

    // Set modal content
    addProductDialogTitle.textContent = "Add Product";
    addProductDialogSubtitle.textContent = "Enter the product information below.";
    productImageNote.textContent = "After saving, manage photos in the Images dialog.";

    saveProductBtn.textContent = "Save Product";
    saveProductBtn.disabled = true;

    addProductDialog.showModal();

    // Load categories before enabling the save button
    const categoriesLoaded = await loadCategories();

    saveProductBtn.disabled = !categoriesLoaded;
}

// Open Edit Product modal
async function openEditProduct(product) {
    // Reset previous form messages
    addProductForm.reset();
    addProductMessage.hidden = true;

    // Store product ID
    editingProductId.value = product.id;

    // Change modal content
    addProductDialogTitle.textContent = "Edit Product";
    addProductDialogSubtitle.textContent = "Update the product information below.";
    productImageNote.textContent = "Product images can be managed using the Images button.";

    saveProductBtn.textContent = "Update Product";
    saveProductBtn.disabled = true;

    // Fill product fields
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productDescription").value = product.description || "";
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productStock").value = product.stock_quantity;
    document.getElementById("productType").value = product.product_type;
    document.getElementById("productStatus").value = String(product.is_active);

    addProductDialog.showModal();

    // Load categories before selecting the current one
    const categoriesLoaded = await loadCategories();

    if (categoriesLoaded) {
        productCategory.value = String(product.category_id);
    }

    saveProductBtn.disabled = !categoriesLoaded;
}

// Open Add modal
addProductBtn.addEventListener("click", function () {
    openAddProduct();
});

// Close modal
closeAddProductDialog.addEventListener("click", function () {
    addProductDialog.close();
});

// Cancel adding or editing product
cancelAddProduct.addEventListener("click", function () {
    addProductDialog.close();
});

// ===================================
// CREATE / UPDATE PRODUCT
// ===================================

// Create or update a product
addProductForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Check if we are editing an existing product
    const productId = editingProductId.value;
    const isEditing = productId !== "";

    // Prepare product data
    const productData = {
        category_id: Number(productCategory.value),
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("productDescription").value.trim(),
        price: Number(document.getElementById("productPrice").value),
        stock_quantity: Number(document.getElementById("productStock").value),
        product_type: document.getElementById("productType").value,
        is_active: Number(document.getElementById("productStatus").value),
    };

    // Choose API URL and HTTP method
    const requestUrl = isEditing ? getProductUrl(productId) : productsApiUrl;

    const requestMethod = isEditing ? "PUT" : "POST";

    // Disable button during request
    saveProductBtn.disabled = true;
    saveProductBtn.textContent = "Saving...";
    addProductMessage.hidden = true;

    try {
        const result = await sendApiRequest(requestUrl, {
            method: requestMethod,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(productData),
        });

        // The API succeeded: exit the edit form, refresh, and keep the image flow separate.
        addProductDialog.close();
        await loadProducts();
        const successMessage = isEditing ? "Product updated successfully." : "Product created successfully.";
        const notice = document.getElementById("productTableNotice");
        if (notice) {
            notice.textContent = successMessage;
            notice.hidden = false;
        }
        window.DonoUI?.toast?.(successMessage, "success");
        if (!isEditing) {
            const newId = Number(result?.data?.id);
            if (Number.isSafeInteger(newId) && newId > 0) {
                // A saved product has an ID, so the existing images API can now upload files.
                const created = products.find(item => Number(item.id) === newId);
                if (created) await openProductImages(created);
            }
        }
    } catch (error) {
        console.error("Save product error:", error);

        showProductFormMessage(error.message);
    } finally {
        saveProductBtn.disabled = false;
        saveProductBtn.textContent = isEditing ? "Update Product" : "Save Product";
    }
});

// ===================================
// DELETE PRODUCT
// ===================================

const deleteProductDialog = document.getElementById("deleteProductDialog");
const closeDeleteProductDialog = document.getElementById("closeDeleteProductDialog");
const cancelDeleteProduct = document.getElementById("cancelDeleteProduct");
const deleteProductName = document.getElementById("deleteProductName");
const deleteProductMessage = document.getElementById("deleteProductMessage");
const confirmDeleteProductBtn = document.getElementById("confirmDeleteProductBtn");

// Store product selected for deletion
let productToDelete = null;

// Open Delete Product confirmation
function openDeleteProduct(product) {
    productToDelete = product;

    deleteProductName.textContent = product.name;
    deleteProductMessage.hidden = true;

    confirmDeleteProductBtn.disabled = false;

    deleteProductDialog.showModal();
}

// Close Delete modal
closeDeleteProductDialog.addEventListener("click", function () {
    deleteProductDialog.close();
});

cancelDeleteProduct.addEventListener("click", function () {
    deleteProductDialog.close();
});

// Clear selected product when dialog closes
deleteProductDialog.addEventListener("close", function () {
    productToDelete = null;
});

// Confirm product deletion
confirmDeleteProductBtn.addEventListener("click", async function () {
    if (!productToDelete) {
        return;
    }

    const productId = productToDelete.id;

    confirmDeleteProductBtn.disabled = true;
    confirmDeleteProductBtn.textContent = "Deleting...";
    deleteProductMessage.hidden = true;

    try {
        await sendApiRequest(getProductUrl(productId), {
            method: "DELETE",
        });

        // Close modal and refresh products
        deleteProductDialog.close();

        await loadProducts();
    } catch (error) {
        console.error("Delete product error:", error);

        deleteProductMessage.textContent = error.message;
        deleteProductMessage.hidden = false;
    } finally {
        confirmDeleteProductBtn.disabled = false;
        confirmDeleteProductBtn.textContent = "Delete Product";
    }
});

// ===================================
// PRODUCT IMAGES MANAGEMENT
// ===================================

const productImagesDialog = document.getElementById("productImagesDialog");
const closeProductImagesDialog = document.getElementById("closeProductImagesDialog");
const cancelProductImages = document.getElementById("cancelProductImages");

const imagesProductName = document.getElementById("imagesProductName");
const productImagesList = document.getElementById("productImagesList");
const productImagesMessage = document.getElementById("productImagesMessage");

const productImageUploadForm = document.getElementById("productImageUploadForm");
const productImageFile = document.getElementById("productImageFile");
const uploadProductImageBtn = document.getElementById("uploadProductImageBtn");

// Store selected product for image management
let selectedImagesProduct = null;

// Show image management message
function showImagesMessage(message) {
    productImagesMessage.textContent = message;
    productImagesMessage.hidden = false;
}

// Open Product Images modal
async function openProductImages(product) {
    selectedImagesProduct = product;

    imagesProductName.textContent = "Manage images for " + product.name;

    productImageUploadForm.reset();
    productImagesMessage.hidden = true;

    productImagesDialog.showModal();

    await loadImagesForSelectedProduct();
}

// Close Product Images modal
closeProductImagesDialog.addEventListener("click", function () {
    productImagesDialog.close();
});

cancelProductImages.addEventListener("click", function () {
    productImagesDialog.close();
});

// Clear selected product when dialog closes
productImagesDialog.addEventListener("close", function () {
    selectedImagesProduct = null;
});

// Display a message inside image list
function showImagesListMessage(message) {
    productImagesList.innerHTML = "";

    const paragraph = document.createElement("p");

    paragraph.className = "text-muted";
    paragraph.textContent = message;

    productImagesList.appendChild(paragraph);
}

// Load images for selected product
async function loadImagesForSelectedProduct() {
    if (!selectedImagesProduct) {
        return;
    }

    const product = selectedImagesProduct;

    showImagesListMessage("Loading images...");

    try {
        const images = await getProductImages(product, true);

        // Ignore an outdated request if another product is selected
        if (selectedImagesProduct !== product) {
            return;
        }

        renderProductImages(images);
    } catch (error) {
        console.error("Product images loading error:", error);

        if (selectedImagesProduct !== product) {
            return;
        }

        showImagesListMessage("Unable to load product images.");

        // Inactive products require the admin images GET endpoint
        if (Number(product.is_active) === 0) {
            showImagesMessage("Admin image listing is not available for this product yet.");
        } else {
            showImagesMessage(error.message);
        }
    }
}

// Display images inside modal
function renderProductImages(images) {
    productImagesList.innerHTML = "";

    if (images.length === 0) {
        showImagesListMessage("No product images uploaded yet.");
        return;
    }

    images.forEach(function (image) {
        const imageCard = document.createElement("div");
        imageCard.className = "admin-product-image-card";

        // Image preview
        const imageElement = document.createElement("img");
        imageElement.src = resolveProductImage(image.image_url);
        imageElement.alt = "Product image";
        imageElement.className = "admin-product-image-preview";
        imageElement.loading = "lazy";

        imageCard.appendChild(imageElement);

        // Image actions
        const actionsWrapper = document.createElement("div");
        actionsWrapper.className = "admin-product-image-actions";

        const isPrimary = Number(image.is_primary) === 1;

        if (isPrimary) {
            const primaryLabel = document.createElement("span");

            primaryLabel.className = "admin-product-primary-label";
            primaryLabel.textContent = "Primary Image";

            actionsWrapper.appendChild(primaryLabel);
        } else {
            // Set selected image as primary
            const primaryButton = createActionButton(
                "Set Primary",
                "btn btn-outline admin-product-action-btn",
                function () {
                    setPrimaryProductImage(image.id);
                },
            );

            actionsWrapper.appendChild(primaryButton);
        }

        // Delete image
        const deleteImageButton = createActionButton(
            "Delete",
            "btn btn-outline admin-product-action-btn admin-product-delete-btn",
            function () {
                deleteProductImage(image.id);
            },
        );

        actionsWrapper.appendChild(deleteImageButton);

        imageCard.appendChild(actionsWrapper);

        productImagesList.appendChild(imageCard);
    });
}

// ===================================
// UPLOAD PRODUCT IMAGE
// ===================================

productImageUploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!selectedImagesProduct) {
        return;
    }

    const imageFile = productImageFile.files[0];

    if (!imageFile) {
        showImagesMessage("Please select an image.");
        return;
    }

    // Validate image size (maximum 5 MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        showImagesMessage("Image must be 5 MB or less.");
        return;
    }

    // Validate image type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(imageFile.type)) {
        showImagesMessage("Only JPG, PNG and WEBP images are allowed.");
        return;
    }

    // Prepare multipart form data
    const formData = new FormData();

    formData.append("image", imageFile);

    const product = selectedImagesProduct;

    uploadProductImageBtn.disabled = true;
    uploadProductImageBtn.textContent = "Uploading...";
    productImagesMessage.hidden = true;

    try {
        // Don't manually set Content-Type for FormData
        await sendApiRequest(getProductUrl(product.id) + "/images", {
            method: "POST",
            body: formData,
        });

        // Clear selected file
        productImageUploadForm.reset();

        showImagesMessage("Image uploaded successfully.");

        // Refresh image list
        productImagesCache.delete(Number(product.id));

        await loadImagesForSelectedProduct();

        // Refresh product table thumbnails
        await loadProducts();
    } catch (error) {
        console.error("Upload product image error:", error);

        showImagesMessage(error.message);
    } finally {
        uploadProductImageBtn.disabled = false;
        uploadProductImageBtn.textContent = "Upload Image";
    }
});

// ===================================
// DELETE PRODUCT IMAGE
// ===================================

async function deleteProductImage(imageId) {
    if (!selectedImagesProduct) {
        return;
    }

    // Confirm deletion before sending request
    const confirmed = await window.DonoUI.confirm("Are you sure you want to delete this image?");

    if (!confirmed) {
        return;
    }

    const product = selectedImagesProduct;

    productImagesMessage.hidden = true;

    try {
        const url = getProductUrl(product.id) + "/images/" + imageId;

        await sendApiRequest(url, {
            method: "DELETE",
        });

        showImagesMessage("Image deleted successfully.");

        productImagesCache.delete(Number(product.id));

        await loadImagesForSelectedProduct();

        await loadProducts();
    } catch (error) {
        console.error("Delete product image error:", error);

        showImagesMessage(error.message);
    }
}

// ===================================
// SET PRIMARY PRODUCT IMAGE
// ===================================

async function setPrimaryProductImage(imageId) {
    if (!selectedImagesProduct) {
        return;
    }

    const product = selectedImagesProduct;

    productImagesMessage.hidden = true;

    try {
        const url = getProductUrl(product.id) + "/images/" + imageId + "/primary";

        await sendApiRequest(url, {
            method: "PATCH",
        });

        showImagesMessage("Primary image updated successfully.");

        productImagesCache.delete(Number(product.id));

        await loadImagesForSelectedProduct();

        await loadProducts();
    } catch (error) {
        console.error("Set primary image error:", error);

        showImagesMessage(error.message);
    }
}
