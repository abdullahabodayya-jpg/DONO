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
const productsApiUrl = new URL("../../../../backend/public/api/admin/products", import.meta.url);

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
            Number(product.price).toFixed(2) + " JOD",
            product.stock_quantity,
            Number(product.is_active) === 1 ? "Active" : "Inactive",
            "—",
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

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
            showMessage("Please log in to access product management.");
            return;
        }

        if (response.status === 403) {
            showMessage("Admin access is required.");
            return;
        }

        if (!response.ok || result.success !== true) {
            throw new Error(result.message || "Failed to load products.");
        }

        products = Array.isArray(result.data) ? result.data : [];

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
// ADD PRODUCT MODAL
// ===================================

// Get modal elements
const addProductBtn = document.getElementById("addProductBtn");
const addProductDialog = document.getElementById("addProductDialog");
const closeAddProductDialog = document.getElementById("closeAddProductDialog");
const cancelAddProduct = document.getElementById("cancelAddProduct");
const productCategory = document.getElementById("productCategory");

// Categories API URL
const categoriesApiUrl = new URL("../../../../backend/public/api/categories", import.meta.url);

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
            return;
        }

        productCategory.disabled = false;
    } catch (error) {
        console.error("Categories loading error:", error);

        productCategory.innerHTML = '<option value="">Unable to load categories</option>';
    }
}

// Open modal and load categories
addProductBtn.addEventListener("click", function () {
    addProductDialog.showModal();
    loadCategories();
});

// Close modal
closeAddProductDialog.addEventListener("click", function () {
    addProductDialog.close();
});

// Cancel adding product
cancelAddProduct.addEventListener("click", function () {
    addProductDialog.close();
});

// ===================================
// CREATE PRODUCT
// ===================================

const addProductForm = document.getElementById("addProductForm");
const saveProductBtn = document.getElementById("saveProductBtn");
const addProductMessage = document.getElementById("addProductMessage");

// Create a new product
addProductForm.addEventListener("submit", async function (event) {
    event.preventDefault();

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

    // Disable button during request
    saveProductBtn.disabled = true;
    saveProductBtn.textContent = "Saving...";
    addProductMessage.hidden = true;

    try {
        const response = await fetch(productsApiUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(productData),
        });

        const result = await response.json();

        if (!response.ok || result.success !== true) {
            throw new Error(result.message || "Failed to create product.");
        }

        // Product created successfully
        addProductMessage.textContent = "Product added successfully.";
        addProductMessage.hidden = false;

        addProductForm.reset();

        // Refresh products table
        await loadProducts();
    } catch (error) {
        console.error("Create product error:", error);

        addProductMessage.textContent = error.message;
        addProductMessage.hidden = false;
    } finally {
        saveProductBtn.disabled = false;
        saveProductBtn.textContent = "Save Product";
    }
});
