
"use strict";

// DONO Coupon Management

const API_BASE_URL = new URL("../../backend/public/api", document.baseURI).pathname;
const COUPONS_URL = `${API_BASE_URL}/coupons`;

const tableBody = document.getElementById("couponsTableBody");
const totalCoupons = document.getElementById("totalCoupons");
const activeCoupons = document.getElementById("activeCoupons");
const inactiveCoupons = document.getElementById("inactiveCoupons");
const resultsCount = document.getElementById("resultsCount");
const paginationControls = document.getElementById("paginationControls");
const pageSizeSelect = document.getElementById("pageSize");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const refreshBtn = document.getElementById("refreshBtn");

const addCouponBtn = document.getElementById("addCouponBtn");
const couponModal = document.getElementById("couponModal");
const couponForm = document.getElementById("couponForm");
const modalTitle = document.getElementById("modalTitle");
const couponIdInput = document.getElementById("couponId");

const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const saveCouponBtn = document.getElementById("saveCouponBtn");

const codeInput = document.getElementById("code");
const discountTypeInput = document.getElementById("discount_type");
const discountValueInput = document.getElementById("discount_value");
const discountHint = document.getElementById("discountHint");
const minimumInput = document.getElementById("min_order_amount");
const startDateInput = document.getElementById("start_date");
const endDateInput = document.getElementById("end_date");
const activeInput = document.getElementById("is_active");

const notification = document.getElementById("notification");
const formError = document.getElementById("formError");

let coupons = [];
let notificationTimeout;

let currentPage = 1;
let pageSize = Number(pageSizeSelect.value) || 10;

// Sorting cycles: default -> ascending -> descending -> default.
let sortKey = null;
let sortDirection = null;

const sortableKeys = [
    "code",
    "discount_value",
    "min_order_amount",
    "start_date",
    "end_date",
    "status"
];

// --------------------------------------------------
// API
// --------------------------------------------------

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const rawResponse = await response.text();
    let result;

    try {
        result = rawResponse ? JSON.parse(rawResponse) : null;
    } catch {
        throw new Error(
            `The server returned an invalid response (HTTP ${response.status}).`
        );
    }

    if (!response.ok || result?.success === false) {
        throw new Error(
            result?.message || `Request failed (HTTP ${response.status}).`
        );
    }

    if (!result) {
        throw new Error("The server returned an empty response.");
    }

    return result;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function formatDiscount(coupon) {
    const value = formatMoney(coupon.discount_value);

    return coupon.discount_type === "percentage"
        ? `${value.replace(/\.00$/, "")}%`
        : `${value} fixed`;
}

function parseDate(value) {
    if (!value) return NaN;

    // Treat MySQL DATETIME as local time consistently with datetime-local.
    const normalized = String(value).replace(" ", "T");
    const timestamp = new Date(normalized).getTime();

    return timestamp;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function toDateTimeLocal(value) {
    return value ? String(value).replace(" ", "T").slice(0, 16) : "";
}

function toDatabaseDateTime(value) {
    return value ? value.replace("T", " ") + ":00" : "";
}

function showNotification(message, type = "success") {
    clearTimeout(notificationTimeout);

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.hidden = false;

    notificationTimeout = setTimeout(() => {
        notification.hidden = true;
    }, 5000);
}

function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
}

function clearFormError() {
    formError.textContent = "";
    formError.hidden = true;
}

function setSaving(isSaving) {
    saveCouponBtn.disabled = isSaving;
    saveCouponBtn.textContent = isSaving ? "Saving..." : "Save Coupon";
}

// --------------------------------------------------
// Status
// --------------------------------------------------

function getCouponStatus(coupon) {
    if (Number(coupon.is_active) !== 1) {
        return { label: "Inactive", className: "status-inactive", rank: 0 };
    }

    const now = Date.now();
    const start = parseDate(coupon.start_date);
    const end = parseDate(coupon.end_date);

    if (Number.isFinite(end) && now > end) {
        return { label: "Expired", className: "status-expired", rank: 1 };
    }

    if (Number.isFinite(start) && now < start) {
        return { label: "Scheduled", className: "status-scheduled", rank: 2 };
    }

    return { label: "Active", className: "status-active", rank: 3 };
}

// --------------------------------------------------
// Load and statistics
// --------------------------------------------------

async function loadCoupons() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="table-message">Loading coupons...</td>
        </tr>
    `;

    paginationControls.replaceChildren();
    refreshBtn.disabled = true;

    try {
        const result = await apiRequest(COUPONS_URL);

        if (!Array.isArray(result.data)) {
            throw new Error("The coupons API returned an unexpected format.");
        }

        coupons = result.data;

        updateStatistics();
        renderCoupons();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    ${escapeHTML(error.message)}
                    <br><br>
                    <button class="btn btn-secondary" id="retryBtn" type="button">
                        Try Again
                    </button>
                </td>
            </tr>
        `;

        document.getElementById("retryBtn")
            ?.addEventListener("click", loadCoupons);

        resultsCount.textContent = "Unable to load coupons";
        paginationControls.replaceChildren();

        showNotification(error.message, "error");
    } finally {
        refreshBtn.disabled = false;
    }
}

function updateStatistics() {
    const activeCount = coupons.filter(
        coupon => Number(coupon.is_active) === 1
    ).length;

    totalCoupons.textContent = coupons.length;
    activeCoupons.textContent = activeCount;
    inactiveCoupons.textContent = coupons.length - activeCount;
}

// --------------------------------------------------
// Search and filter
// --------------------------------------------------

function getFilteredCoupons() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    return coupons.filter(coupon => {
        const matchesSearch = String(coupon.code ?? "")
            .toLowerCase()
            .includes(search);

        const enabled = Number(coupon.is_active) === 1;

        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "active" && enabled) ||
            (selectedStatus === "inactive" && !enabled);

        return matchesSearch && matchesStatus;
    });
}

// --------------------------------------------------
// Sorting
// --------------------------------------------------

function getSortValue(coupon, key) {
    switch (key) {
        case "code":
            return String(coupon.code ?? "").toLowerCase();

        case "discount_value":
            return Number(coupon.discount_value) || 0;

        case "min_order_amount":
            return Number(coupon.min_order_amount) || 0;

        case "start_date":
            return parseDate(coupon.start_date);

        case "end_date":
            return parseDate(coupon.end_date);

        case "status":
            return getCouponStatus(coupon).rank;

        default:
            return "";
    }
}

function compareCoupons(a, b, key, direction) {
    const valueA = getSortValue(a, key);
    const valueB = getSortValue(b, key);

    let comparison = 0;

    // Keep invalid or missing dates at the end in either direction.
    if (typeof valueA === "number" && typeof valueB === "number") {
        const aInvalid = !Number.isFinite(valueA);
        const bInvalid = !Number.isFinite(valueB);

        if (aInvalid || bInvalid) {
            if (aInvalid !== bInvalid) return aInvalid ? 1 : -1;
            comparison = 0;
        } else {
            comparison = valueA - valueB;
        }
    } else {
        comparison = String(valueA).localeCompare(String(valueB));
    }

    return direction === "desc" ? -comparison : comparison;
}

function getSortedCoupons(items) {
    const sorted = [...items];

    if (!sortKey || !sortDirection) {
        return sorted;
    }

    return sorted.sort((a, b) =>
        compareCoupons(a, b, sortKey, sortDirection)
    );
}

function updateSortHeaders() {
    document.querySelectorAll(".sort-button[data-sort]").forEach(button => {
        const key = button.dataset.sort;
        const icon = button.querySelector(".sort-icon");

        button.removeAttribute("aria-sort");

        if (key !== sortKey || !sortDirection) {
            icon.textContent = "↕";
            return;
        }

        if (sortDirection === "asc") {
            icon.textContent = "↓";
            button.setAttribute("aria-sort", "ascending");
        } else {
            icon.textContent = "↑";
            button.setAttribute("aria-sort", "descending");
        }
    });
}

function handleSort(key) {
    if (!sortableKeys.includes(key)) return;

    if (sortKey !== key) {
        sortKey = key;
        sortDirection = "asc";
    } else if (sortDirection === "asc") {
        sortDirection = "desc";
    } else if (sortDirection === "desc") {
        sortKey = null;
        sortDirection = null;
    } else {
        sortDirection = "asc";
    }

    currentPage = 1;
    renderCoupons();
}

// --------------------------------------------------
// Icons
// --------------------------------------------------

const icons = {
    edit: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>
        </svg>
    `,
    delete: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="m19 6-1 14H6L5 6"/>
            <path d="M10 11v5M14 11v5"/>
        </svg>
    `,
    enable: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
            <path d="M12 2v10"/>
            <path d="M6.2 4.8a9 9 0 1 0 11.6 0"/>
        </svg>
    `,
    previous: `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,
    next: `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    `
};

function actionButton(action, id, label, icon, extraClass = "") {
    return `
        <button
            class="action-icon-btn ${extraClass}"
            type="button"
            data-action="${action}"
            data-id="${escapeHTML(id)}"
            title="${escapeHTML(label)}"
            aria-label="${escapeHTML(label)}"
        >
            ${icon}
        </button>
    `;
}

// --------------------------------------------------
// Pagination
// --------------------------------------------------

function renderPagination(totalItems, totalPages, startIndex, endIndex) {
    resultsCount.textContent =
        `Showing ${totalItems ? startIndex + 1 : 0}–${endIndex} of ${totalItems} coupons`;

    paginationControls.replaceChildren();

    function addButton(label, page, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `page-btn${options.active ? " active" : ""}`;
        button.disabled = Boolean(options.disabled);
        button.setAttribute("aria-label", options.ariaLabel || label);

        if (options.active) {
            button.setAttribute("aria-current", "page");
        }

        if (options.html) {
            button.innerHTML = options.html;
        } else {
            button.textContent = label;
        }

        button.addEventListener("click", () => {
            if (page === currentPage || page < 1 || page > totalPages) return;

            currentPage = page;
            renderCoupons();
        });

        paginationControls.appendChild(button);
    }

    addButton("Previous", currentPage - 1, {
        disabled: currentPage <= 1,
        ariaLabel: "Previous page",
        html: icons.previous
    });

    if (totalPages > 0) {
        const pages = new Set([1, totalPages]);

        for (
            let page = Math.max(1, currentPage - 1);
            page <= Math.min(totalPages, currentPage + 1);
            page++
        ) {
            pages.add(page);
        }

        const visiblePages = [...pages].sort((a, b) => a - b);
        let previousPage = 0;

        visiblePages.forEach(page => {
            if (previousPage && page - previousPage > 1) {
                const ellipsis = document.createElement("span");
                ellipsis.className = "page-ellipsis";
                ellipsis.textContent = "…";
                paginationControls.appendChild(ellipsis);
            }

            addButton(String(page), page, {
                active: page === currentPage,
                ariaLabel: `Page ${page}`
            });

            previousPage = page;
        });
    }

    addButton("Next", currentPage + 1, {
        disabled: currentPage >= totalPages || totalPages === 0,
        ariaLabel: "Next page",
        html: icons.next
    });
}

// --------------------------------------------------
// Render table
// --------------------------------------------------

function renderCoupons() {
    const filtered = getSortedCoupons(getFilteredCoupons());
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Keep the current page valid after deleting or filtering rows.
    currentPage = totalPages === 0
        ? 1
        : Math.min(currentPage, totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const visibleCoupons = filtered.slice(startIndex, startIndex + pageSize);
    const endIndex = startIndex + visibleCoupons.length;

    updateSortHeaders();
    renderPagination(totalItems, totalPages, startIndex, endIndex);

    if (totalItems === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    No coupons found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = visibleCoupons.map(coupon => {
        const status = getCouponStatus(coupon);
        const enabled = Number(coupon.is_active) === 1;

        return `
            <tr>
                <td>
                    <span class="coupon-code">${escapeHTML(coupon.code)}</span>
                    <span class="coupon-description">ID: ${escapeHTML(coupon.id)}</span>
                </td>

                <td>
                    <span class="discount-value">
                        ${escapeHTML(formatDiscount(coupon))}
                    </span>
                </td>

                <td>${escapeHTML(formatMoney(coupon.min_order_amount))}</td>

                <td>
                    <span class="date-range">
                        ${escapeHTML(formatDate(coupon.start_date))}
                    </span>
                </td>

                <td>
                    <span class="date-range">
                        ${escapeHTML(formatDate(coupon.end_date))}
                    </span>
                </td>

                <td>
                    <span class="status ${status.className}">
                        ${escapeHTML(status.label)}
                    </span>
                </td>

                <td>
                    <div class="row-actions">
                        ${actionButton("edit", coupon.id, "Edit coupon", icons.edit)}
                        ${actionButton(
                            "toggle",
                            coupon.id,
                            enabled ? "Disable coupon" : "Enable coupon",
                            icons.enable
                        )}
                        ${actionButton(
                            "delete",
                            coupon.id,
                            "Delete coupon",
                            icons.delete,
                            "danger"
                        )}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// --------------------------------------------------
// Modal
// --------------------------------------------------

function openModal() {
    couponModal.hidden = false;
    document.body.style.overflow = "hidden";
    clearFormError();
}

function closeModal() {
    couponModal.hidden = true;
    document.body.style.overflow = "";
    couponForm.reset();
    couponIdInput.value = "";
    clearFormError();
    setSaving(false);
}

function openCreateModal() {
    couponForm.reset();

    couponIdInput.value = "";
    modalTitle.textContent = "Create Coupon";
    saveCouponBtn.textContent = "Create Coupon";

    activeInput.value = "1";
    minimumInput.value = "0";
    discountTypeInput.value = "percentage";

    updateDiscountHint();
    clearFormError();
    openModal();
}

function openEditModal(coupon) {
    couponForm.reset();

    couponIdInput.value = coupon.id;
    modalTitle.textContent = "Edit Coupon";
    saveCouponBtn.textContent = "Save Changes";

    codeInput.value = coupon.code;
    discountTypeInput.value = coupon.discount_type;
    discountValueInput.value = coupon.discount_value;
    minimumInput.value = coupon.min_order_amount;
    startDateInput.value = toDateTimeLocal(coupon.start_date);
    endDateInput.value = toDateTimeLocal(coupon.end_date);
    activeInput.value = String(Number(coupon.is_active));

    updateDiscountHint();
    clearFormError();
    openModal();
}

function updateDiscountHint() {
    if (discountTypeInput.value === "percentage") {
        discountValueInput.max = "100";
        discountHint.textContent = "Must be greater than 0 and at most 100%.";
    } else {
        discountValueInput.removeAttribute("max");
        discountHint.textContent = "Enter the fixed discount amount.";
    }
}

// --------------------------------------------------
// Form validation
// --------------------------------------------------

function getFormData() {
    const code = codeInput.value.trim();
    const discountType = discountTypeInput.value;
    const discountValue = Number(discountValueInput.value);
    const minimum = Number(minimumInput.value);

    if (!code) throw new Error("Coupon code is required.");
    if (code.length > 50) throw new Error("Coupon code cannot exceed 50 characters.");

    if (!["percentage", "fixed"].includes(discountType)) {
        throw new Error("Select a valid discount type.");
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        throw new Error("Discount value must be greater than zero.");
    }

    if (discountType === "percentage" && discountValue > 100) {
        throw new Error("Percentage discount cannot exceed 100.");
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
        throw new Error("Minimum order amount cannot be negative.");
    }

    if (!startDateInput.value || !endDateInput.value) {
        throw new Error("Start and end dates are required.");
    }

    if (
        new Date(endDateInput.value).getTime() <
        new Date(startDateInput.value).getTime()
    ) {
        throw new Error("End date must be after the start date.");
    }

    return {
        code,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minimum,
        start_date: toDatabaseDateTime(startDateInput.value),
        end_date: toDatabaseDateTime(endDateInput.value),
        is_active: Number(activeInput.value)
    };
}

// --------------------------------------------------
// Create / Update
// --------------------------------------------------

async function saveCoupon(event) {
    event.preventDefault();
    clearFormError();

    let data;

    try {
        data = getFormData();
    } catch (error) {
        showFormError(error.message);
        return;
    }

    const couponId = couponIdInput.value;
    const isEditing = Boolean(couponId);

    const url = isEditing
        ? `${COUPONS_URL}/${encodeURIComponent(couponId)}`
        : COUPONS_URL;

    setSaving(true);

    try {
        const result = await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(data)
        });

        closeModal();

        showNotification(
            result.message ||
            (isEditing
                ? "Coupon updated successfully."
                : "Coupon created successfully.")
        );

        await loadCoupons();
    } catch (error) {
        showFormError(error.message);
    } finally {
        setSaving(false);
    }
}

// --------------------------------------------------
// Enable / Disable
// --------------------------------------------------

async function toggleCoupon(coupon) {
    const currentlyActive = Number(coupon.is_active) === 1;
    const nextValue = currentlyActive ? 0 : 1;
    const action = nextValue === 1 ? "enable" : "disable";

    if (!await window.DonoUI.confirm(`Are you sure you want to ${action} "${coupon.code}"?`)) {
        return;
    }

    try {
        const result = await apiRequest(
            `${COUPONS_URL}/${encodeURIComponent(coupon.id)}`,
            {
                method: "PATCH",
                body: JSON.stringify({ is_active: nextValue })
            }
        );

        showNotification(
            result.message || `Coupon ${action}d successfully.`
        );

        await loadCoupons();
    } catch (error) {
        showNotification(error.message, "error");
    }
}

// --------------------------------------------------
// Delete
// --------------------------------------------------

async function deleteCoupon(coupon) {
    const confirmed = await window.DonoUI.confirm(
        `Delete coupon "${coupon.code}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
        const result = await apiRequest(
            `${COUPONS_URL}/${encodeURIComponent(coupon.id)}`,
            { method: "DELETE" }
        );

        showNotification(result.message || "Coupon deleted successfully.");
        await loadCoupons();
    } catch (error) {
        showNotification(error.message, "error");
    }
}

// --------------------------------------------------
// Table event delegation
// --------------------------------------------------

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const coupon = coupons.find(
        item => String(item.id) === button.dataset.id
    );

    if (!coupon) {
        showNotification("Coupon not found. Refresh and try again.", "error");
        return;
    }

    if (button.dataset.action === "edit") {
        openEditModal(coupon);
    } else if (button.dataset.action === "toggle") {
        await toggleCoupon(coupon);
    } else if (button.dataset.action === "delete") {
        await deleteCoupon(coupon);
    }
});

// --------------------------------------------------
// Event listeners
// --------------------------------------------------

document.querySelectorAll(".sort-button[data-sort]").forEach(button => {
    button.addEventListener("click", () => {
        handleSort(button.dataset.sort);
    });
});

addCouponBtn.addEventListener("click", openCreateModal);
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

couponModal.addEventListener("click", event => {
    if (event.target.matches("[data-close-modal]")) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !couponModal.hidden) {
        closeModal();
    }
});

couponForm.addEventListener("submit", saveCoupon);
discountTypeInput.addEventListener("change", updateDiscountHint);

searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderCoupons();
});

statusFilter.addEventListener("change", () => {
    currentPage = 1;
    renderCoupons();
});

pageSizeSelect.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value) || 10;
    currentPage = 1;
    renderCoupons();
});

refreshBtn.addEventListener("click", loadCoupons);

// Initial load
updateSortHeaders();
loadCoupons();
