"use strict";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL = "http://localhost/Dono_Project/backend/public/api";
const CATEGORIES_URL = `${API_BASE_URL}/categories`;

// =====================================================
// DOM HELPERS
// =====================================================

const $ = (id) => document.getElementById(id);

const tableBody = $("categoriesTableBody");
const resultsCount = $("resultsCount");
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");
const sortFilter = $("sortFilter");
const pageSizeSelect = $("pageSize");
const paginationEl = $("pagination");
const toast = $("toast");

const categoryModal = $("categoryModal");
const categoryForm = $("categoryForm");
const modalTitle = $("modalTitle");
const categoryIdInput = $("categoryId");
const nameInput = $("name");
const descriptionInput = $("description");
const imageInput = $("image");
const activeInput = $("is_active");
const formError = $("formError");
const saveBtn = $("saveBtn");

const deleteModal = $("deleteModal");
const deleteText = $("deleteText");
const confirmDeleteBtn = $("confirmDeleteBtn");

// =====================================================
// STATE
// =====================================================

let categories = [];
let categoryToDelete = null;
let toastTimeout;
let currentPage = 1;

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers
            }
        });
    } catch (error) {
        console.error("Network error:", error);

        throw new Error(
            "Cannot connect to the server. Make sure Apache is running and the API URL is correct."
        );
    }

    const raw = await response.text();

    let result;

    try {
        result = raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Invalid API response");
        console.error("URL:", url);
        console.error("HTTP Status:", response.status);
        console.error(
            "Content-Type:",
            response.headers.get("content-type")
        );
        console.error("Server response:", raw);

        throw new Error(
            `The server returned invalid JSON (HTTP ${response.status}). Open F12 > Console to inspect the response.`
        );
    }

    if (!response.ok || result?.success === false) {
        throw new Error(
            result?.message ||
            `Request failed (HTTP ${response.status}).`
        );
    }

    return result ?? {};
}

// =====================================================
// HELPERS
// =====================================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showToast(message, type = "success") {
    if (!toast) {
        console[type === "error" ? "error" : "log"](message);
        return;
    }

    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = `toast${type === "error" ? " error" : ""}`;
    toast.hidden = false;

    toastTimeout = setTimeout(() => {
        toast.hidden = true;
    }, 4000);
}

function showFormError(message) {
    if (!formError) return;

    formError.textContent = message;
    formError.hidden = false;
}

function clearFormError() {
    if (!formError) return;

    formError.textContent = "";
    formError.hidden = true;
}

function setSaving(isSaving) {
    if (!saveBtn) return;

    saveBtn.disabled = isSaving;

    saveBtn.textContent = isSaving
        ? "Saving..."
        : (categoryIdInput.value
            ? "Save changes"
            : "Create category");
}

function getCategoryId(category) {
    return String(category.id);
}

function getStatusValue(category) {
    return Number(category.is_active) === 1;
}

// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {
    if (!tableBody) {
        console.error(
            'Missing HTML element: id="categoriesTableBody"'
        );
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-row">
                Loading categories...
            </td>
        </tr>
    `;

    try {
        const result = await apiRequest(CATEGORIES_URL);

        if (!Array.isArray(result.data)) {
            console.error("Unexpected API response:", result);

            throw new Error(
                "The API response does not contain a valid categories array."
            );
        }

        categories = result.data;

        renderCategories();

    } catch (error) {
        console.error("Could not load categories:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-row">
                    <div class="error-message">
                        <p>${escapeHTML(error.message)}</p>

                        <button
                            class="btn btn-light"
                            id="retryBtn"
                            type="button"
                        >
                            Try again
                        </button>
                    </div>
                </td>
            </tr>
        `;

        $("retryBtn")?.addEventListener(
            "click",
            loadCategories
        );

        if (resultsCount) {
            resultsCount.textContent = "";
        }

        if (paginationEl) {
            paginationEl.innerHTML = "";
        }

        showToast(error.message, "error");
    }
}

// =====================================================
// SEARCH, FILTER AND SORT
// =====================================================

function getFiltered() {
    const search = (searchInput?.value ?? "")
        .trim()
        .toLowerCase();

    const status = statusFilter?.value ?? "all";

    return categories.filter((category) => {
        const active = getStatusValue(category);

        const matchesSearch = String(category.name ?? "")
            .toLowerCase()
            .includes(search);

        const matchesStatus =
            status === "all" ||
            (status === "active" && active) ||
            (status === "inactive" && !active);

        return matchesSearch && matchesStatus;
    });
}

// Sort values look like "name:asc", "id:desc", "products:desc"
function getSorted(items) {
    const [key, direction] = (sortFilter?.value ?? "id:desc").split(":");
    const factor = direction === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
        let result = 0;

        if (key === "name") {
            result = String(a.name ?? "").localeCompare(
                String(b.name ?? ""),
                undefined,
                { numeric: true, sensitivity: "base" }
            );
        } else if (key === "products") {
            result =
                (Number(a.products_count) || 0) -
                (Number(b.products_count) || 0);
        } else {
            result = (Number(a.id) || 0) - (Number(b.id) || 0);
        }

        return result * factor;
    });
}

// =====================================================
// PAGINATION
// =====================================================

function getPageSize() {
    return Number(pageSizeSelect?.value) || 10;
}

// Builds a compact list like: 1 … 4 5 6 … 12
function getPageList(totalPages, current) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set([1, totalPages, current - 1, current, current + 1]);

    if (current <= 3) {
        [2, 3, 4].forEach((p) => pages.add(p));
    }

    if (current >= totalPages - 2) {
        [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
    }

    const sorted = [...pages]
        .filter((p) => p >= 1 && p <= totalPages)
        .sort((a, b) => a - b);

    const list = [];

    sorted.forEach((page, index) => {
        if (index > 0 && page - sorted[index - 1] > 1) {
            list.push("gap");
        }

        list.push(page);
    });

    return list;
}

function renderPagination(totalPages) {
    if (!paginationEl) return;

    // No need for pagination controls when everything fits on one page.
    if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
    }

    const buttons = [];

    buttons.push(`
        <button
            class="page-btn"
            type="button"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? "disabled" : ""}
            aria-label="Previous page"
        >
            ‹ Prev
        </button>
    `);

    getPageList(totalPages, currentPage).forEach((item) => {
        if (item === "gap") {
            buttons.push(`<span class="page-gap">…</span>`);
            return;
        }

        buttons.push(`
            <button
                class="page-btn${item === currentPage ? " active" : ""}"
                type="button"
                data-page="${item}"
                ${item === currentPage ? 'aria-current="page"' : ""}
            >
                ${item}
            </button>
        `);
    });

    buttons.push(`
        <button
            class="page-btn"
            type="button"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? "disabled" : ""}
            aria-label="Next page"
        >
            Next ›
        </button>
    `);

    paginationEl.innerHTML = buttons.join("");
}

// =====================================================
// CATEGORY IMAGE
// =====================================================

function placeholderHTML(name) {
    const letter = escapeHTML(
        (name || "?").charAt(0).toUpperCase()
    );

    return `
        <span class="category-img" aria-hidden="true">
            ${letter}
        </span>
    `;
}

function getCategoryImage(category) {
    const name = escapeHTML(category.name);

    if (!category.image) {
        return placeholderHTML(category.name);
    }

    return `
        <img
            class="category-img"
            src="${escapeHTML(category.image)}"
            alt="${name}"
            loading="lazy"
            data-name="${name}"
        >
    `;
}

// =====================================================
// RENDER CATEGORIES
// =====================================================

function renderCategories() {
    if (!tableBody) return;

    const filtered = getSorted(getFiltered());

    const pageSize = getPageSize();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    // Keep the current page valid (e.g. after deleting the last item on a page).
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    if (resultsCount) {
        resultsCount.textContent = filtered.length === 0
            ? `Showing 0 of ${categories.length} categories`
            : `Showing ${start + 1}–${start + items.length} of ${filtered.length} categories`;
    }

    renderPagination(totalPages);

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-row">
                    <div class="empty-state">
                        <p>No categories found.</p>
                        <span>
                            Try another search or change the status filter.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = items.map((category) => {
        const active = getStatusValue(category);
        const image = getCategoryImage(category);

        return `
            <tr>
                <td>
                    <div class="category-info">
                        ${image}

                        <span>
                            ${escapeHTML(category.name)}
                        </span>
                    </div>
                </td>

                <td>
                    ${Number(category.products_count) || 0}
                </td>

                <td>
                    <span class="badge ${active ? "active" : "inactive"}">
                        ${active ? "Active" : "Inactive"}
                    </span>
                </td>

                <td>
                    <button
                        class="icon-btn"
                        type="button"
                        data-action="edit"
                        data-id="${escapeHTML(category.id)}"
                        title="Edit"
                        aria-label="Edit category"
                    >
                        ✎
                    </button>

                    <button
                        class="icon-btn delete"
                        type="button"
                        data-action="delete"
                        data-id="${escapeHTML(category.id)}"
                        title="Delete"
                        aria-label="Delete category"
                    >
                        🗑
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Use a letter placeholder if an image cannot load.
    tableBody.querySelectorAll("img.category-img").forEach((img) => {
        img.addEventListener("error", () => {
            img.outerHTML = placeholderHTML(img.dataset.name);
        }, { once: true });
    });
}

// =====================================================
// CREATE CATEGORY
// =====================================================

function openCreateModal() {
    if (!categoryForm || !categoryModal) return;

    categoryForm.reset();

    categoryIdInput.value = "";
    modalTitle.textContent = "Add category";
    activeInput.value = "1";

    clearFormError();
    setSaving(false);

    categoryModal.showModal();
    nameInput.focus();
}

// =====================================================
// EDIT CATEGORY
// =====================================================

function openEditModal(category) {
    if (!categoryForm || !categoryModal) return;

    categoryForm.reset();

    categoryIdInput.value = category.id;
    modalTitle.textContent = "Edit category";

    nameInput.value = category.name ?? "";
    descriptionInput.value = category.description ?? "";
    imageInput.value = category.image ?? "";

    activeInput.value = String(
        getStatusValue(category) ? 1 : 0
    );

    clearFormError();
    setSaving(false);

    categoryModal.showModal();
    nameInput.focus();
}

// =====================================================
// SAVE CATEGORY
// =====================================================

async function saveCategory(event) {
    event.preventDefault();

    clearFormError();

    const name = nameInput.value.trim();

    if (!name) {
        showFormError("Category name is required.");
        return;
    }

    if (name.length > 100) {
        showFormError(
            "Category name is too long (maximum 100 characters)."
        );
        return;
    }

    const payload = {
        name,
        description: descriptionInput.value.trim() || null,
        image: imageInput.value.trim() || null,
        is_active: Number(activeInput.value)
    };

    const id = categoryIdInput.value;
    const isEditing = Boolean(id);

    const url = isEditing
        ? `${CATEGORIES_URL}/${encodeURIComponent(id)}`
        : CATEGORIES_URL;

    setSaving(true);

    try {
        const result = await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });

        categoryModal.close();

        showToast(
            result.message ||
            (isEditing
                ? "Category updated successfully."
                : "Category created successfully.")
        );

        // A new category goes to the first page so the user can see it.
        if (!isEditing) {
            currentPage = 1;
        }

        await loadCategories();

    } catch (error) {
        console.error("Could not save category:", error);
        showFormError(error.message);

    } finally {
        setSaving(false);
    }
}

// =====================================================
// DELETE CATEGORY
// =====================================================

function openDeleteModal(category) {
    categoryToDelete = category;

    deleteText.textContent =
        `Are you sure you want to delete "${category.name}"?`;

    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";

    deleteModal.showModal();
}

async function confirmDelete() {
    if (!categoryToDelete) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Deleting...";

    try {
        const result = await apiRequest(
            `${CATEGORIES_URL}/${encodeURIComponent(categoryToDelete.id)}`,
            {
                method: "DELETE"
            }
        );

        deleteModal.close();

        showToast(
            result.message || "Category deleted successfully."
        );

        await loadCategories();

    } catch (error) {
        console.error("Could not delete category:", error);

        deleteModal.close();

        showToast(error.message, "error");

    } finally {
        categoryToDelete = null;
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Delete";
    }
}

// =====================================================
// TABLE ACTIONS
// =====================================================

if (tableBody) {
    tableBody.addEventListener("click", (event) => {
        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button) return;

        const category = categories.find(
            (item) => getCategoryId(item) === button.dataset.id
        );

        if (!category) {
            showToast(
                "Category not found. Please refresh the page.",
                "error"
            );

            return;
        }

        if (button.dataset.action === "edit") {
            openEditModal(category);
        }

        if (button.dataset.action === "delete") {
            openDeleteModal(category);
        }
    });
}

// =====================================================
// EVENT LISTENERS
// =====================================================

$("addCategoryBtn")?.addEventListener(
    "click",
    openCreateModal
);

$("closeModalBtn")?.addEventListener(
    "click",
    () => categoryModal.close()
);

$("cancelBtn")?.addEventListener(
    "click",
    () => categoryModal.close()
);

categoryForm?.addEventListener(
    "submit",
    saveCategory
);

$("cancelDeleteBtn")?.addEventListener(
    "click",
    () => deleteModal.close()
);

confirmDeleteBtn?.addEventListener(
    "click",
    confirmDelete
);

// Close dialogs when clicking their backdrops.
[categoryModal, deleteModal].forEach((dialog) => {
    if (!dialog) return;

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
});

// Search, status filter, sort and page size: always go back to page 1.
function resetToFirstPage() {
    currentPage = 1;
    renderCategories();
}

searchInput?.addEventListener(
    "input",
    resetToFirstPage
);

statusFilter?.addEventListener(
    "change",
    resetToFirstPage
);

sortFilter?.addEventListener(
    "change",
    resetToFirstPage
);

pageSizeSelect?.addEventListener(
    "change",
    resetToFirstPage
);

// Pagination buttons (Prev / numbers / Next).
paginationEl?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");

    if (!button || button.disabled) return;

    const page = Number(button.dataset.page);

    if (!Number.isInteger(page) || page < 1) return;

    currentPage = page;
    renderCategories();

    // Bring the user back to the top of the table.
    document
        .querySelector(".table-card")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// =====================================================
// INITIALIZE
// =====================================================

loadCategories();