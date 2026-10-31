/* ===================================
   DONO ADMIN - REVIEWS MANAGEMENT
   Reviews Listing, Search, Filter and Delete
=================================== */

// Get page elements
const reviewsTableBody = document.getElementById("reviewsTableBody");
const reviewSearch = document.getElementById("reviewSearch");
const reviewRatingFilter = document.getElementById("reviewRatingFilter");
const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");

const reviewsCountText = document.getElementById("reviewsCountText");
const reviewsPageMessage = document.getElementById("reviewsPageMessage");

// Get summary elements
const totalReviews = document.getElementById("totalReviews");
const averageRating = document.getElementById("averageRating");
const fiveStarReviews = document.getElementById("fiveStarReviews");

// Store reviews received from API
let reviews = [];
let reviewsLoaded = false;

// Build API URL based on the project folder
const reviewsApiUrl = new URL("../../../../backend/public/api/admin/reviews", import.meta.url);

// Build URL for a specific review
function getReviewUrl(reviewId) {
    return reviewsApiUrl.href + "/" + encodeURIComponent(reviewId);
}

// Show a page message
function showPageMessage(message, state = "info") {
    reviewsPageMessage.textContent = message;
    reviewsPageMessage.dataset.state = state;
    reviewsPageMessage.hidden = message === "";
}

// Read error messages returned by API
function getApiErrorMessage(result, fallbackMessage) {
    return result?.message || fallbackMessage;
}

// Send an API request
async function sendApiRequest(url, options = {}) {
    const response = await fetch(url, {
        method: options.method || "GET",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            ...options.headers,
        },
        body: options.body,
    });

    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error("The server returned an invalid response.");
    }

    if (response.status === 401) {
        throw new Error("Please log in to access review management.");
    }

    if (response.status === 403) {
        throw new Error("Admin access is required.");
    }

    if (!response.ok || result.success !== true) {
        throw new Error(getApiErrorMessage(result, "Request failed."));
    }

    return result;
}

// Display a message inside the table
function showTableMessage(message) {
    reviewsTableBody.innerHTML = "";

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.className = "admin-review-empty-cell";
    cell.textContent = message;

    row.appendChild(cell);
    reviewsTableBody.appendChild(row);
}

// Add a table cell safely
function addTableCell(row, value, className = "") {
    const cell = document.createElement("td");

    cell.textContent = value;

    if (className) {
        cell.className = className;
    }

    row.appendChild(cell);

    return cell;
}

// Format the date without changing its timezone
function formatReviewDate(value) {
    if (!value) {
        return "—";
    }

    return String(value).replace("T", " ").slice(0, 16);
}

// Get product name safely
function getProductName(review) {
    return review.product_name || "Product #" + review.product_id;
}

// Get review comment
function getReviewComment(review) {
    if (typeof review.comment === "string" && review.comment.trim() !== "") {
        return review.comment.trim();
    }

    return null;
}

// ===================================
// REVIEWS SUMMARY
// ===================================

// Reset summary when reviews are unavailable
function resetSummary() {
    totalReviews.textContent = "—";
    averageRating.textContent = "—";
    fiveStarReviews.textContent = "—";
}

// Calculate summary from loaded reviews
function updateSummary() {
    const count = reviews.length;

    const validRatings = reviews
        .map(function (review) {
            return Number(review.rating);
        })
        .filter(function (rating) {
            return Number.isInteger(rating) && rating >= 1 && rating <= 5;
        });

    const ratingTotal = validRatings.reduce(function (sum, rating) {
        return sum + rating;
    }, 0);

    const average = validRatings.length > 0 ? ratingTotal / validRatings.length : 0;

    const fiveStarCount = validRatings.filter(function (rating) {
        return rating === 5;
    }).length;

    totalReviews.textContent = count;
    averageRating.textContent = average.toFixed(1);
    fiveStarReviews.textContent = fiveStarCount;
}

// ===================================
// REVIEWS TABLE
// ===================================

// Display reviews in the table
function renderReviews() {
    if (!reviewsLoaded) {
        return;
    }

    const searchValue = reviewSearch.value.trim().toLowerCase();
    const selectedRating = reviewRatingFilter.value;

    // Filter reviews by search and rating
    const filteredReviews = reviews.filter(function (review) {
        const productName = getProductName(review).toLowerCase();
        const userId = String(review.user_id);
        const comment = (getReviewComment(review) || "").toLowerCase();

        const matchesSearch =
            productName.includes(searchValue) ||
            userId.includes(searchValue) ||
            comment.includes(searchValue);

        const matchesRating =
            selectedRating === "all" || Number(review.rating) === Number(selectedRating);

        return matchesSearch && matchesRating;
    });

    reviewsCountText.textContent =
        "Showing " + filteredReviews.length + " of " + reviews.length + " reviews";

    reviewsTableBody.innerHTML = "";

    if (filteredReviews.length === 0) {
        showTableMessage(
            reviews.length === 0
                ? "No customer reviews yet."
                : "No reviews match your search or filter.",
        );
        return;
    }

    filteredReviews.forEach(function (review) {
        const row = document.createElement("tr");

        // Product name
        addTableCell(row, getProductName(review), "admin-review-product-name");

        // Customer ID
        addTableCell(row, "User #" + review.user_id, "admin-review-user");

        // Rating
        const ratingCell = addTableCell(row, "", "admin-review-rating");

        const rating = Number(review.rating);

        if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
            const stars = document.createElement("span");
            stars.className = "admin-review-stars";
            stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
            stars.setAttribute("aria-label", rating + " out of 5 stars");

            const ratingNumber = document.createElement("span");
            ratingNumber.className = "admin-review-rating-number";
            ratingNumber.textContent = rating + "/5";

            ratingCell.appendChild(stars);
            ratingCell.appendChild(ratingNumber);
        } else {
            ratingCell.textContent = "—";
        }

        // Comment
        const commentCell = addTableCell(row, "", "admin-review-comment");

        const commentElement = document.createElement("span");
        const comment = getReviewComment(review);

        commentElement.className = comment
            ? "admin-review-comment-text"
            : "admin-review-no-comment";

        commentElement.textContent = comment || "No comment provided";

        if (comment) {
            commentElement.title = comment;
        }

        commentCell.appendChild(commentElement);

        // Date
        addTableCell(row, formatReviewDate(review.created_at), "admin-review-date");

        // Actions
        const actionsCell = addTableCell(row, "");

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "admin-review-delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", "Delete review for " + getProductName(review));

        deleteButton.addEventListener("click", function () {
            openDeleteReview(review);
        });

        actionsCell.appendChild(deleteButton);

        reviewsTableBody.appendChild(row);
    });
}

// ===================================
// LOAD REVIEWS FROM API
// ===================================

async function loadReviews() {
    // Prevent repeated requests
    if (refreshReviewsBtn.disabled) {
        return;
    }

    refreshReviewsBtn.disabled = true;
    refreshReviewsBtn.textContent = "Loading...";

    reviewsLoaded = false;

    showPageMessage("");
    showTableMessage("Loading reviews...");
    reviewsCountText.textContent = "Loading customer reviews...";

    try {
        const result = await sendApiRequest(reviewsApiUrl);

        if (!result.data || !Array.isArray(result.data.items)) {
            throw new Error("Invalid reviews response from server.");
        }

        // Store API results
        reviews = result.data.items;
        reviewsLoaded = true;

        // Update page
        updateSummary();
        renderReviews();
    } catch (error) {
        console.error("Reviews loading error:", error);

        reviews = [];
        reviewsLoaded = false;

        resetSummary();
        reviewsCountText.textContent = "Reviews unavailable";

        showTableMessage("Unable to load customer reviews.");
        showPageMessage(error.message, "error");
    } finally {
        refreshReviewsBtn.disabled = false;
        refreshReviewsBtn.textContent = "Refresh Reviews";
    }
}

// Search and filter events
reviewSearch.addEventListener("input", renderReviews);
reviewRatingFilter.addEventListener("change", renderReviews);

// Reload reviews
refreshReviewsBtn.addEventListener("click", loadReviews);

// ===================================
// DELETE REVIEW MODAL
// ===================================

// Get dialog elements
const deleteReviewDialog = document.getElementById("deleteReviewDialog");
const closeDeleteReviewDialog = document.getElementById("closeDeleteReviewDialog");
const cancelDeleteReview = document.getElementById("cancelDeleteReview");

const deleteReviewProduct = document.getElementById("deleteReviewProduct");
const deleteReviewCustomer = document.getElementById("deleteReviewCustomer");
const deleteReviewRating = document.getElementById("deleteReviewRating");
const deleteReviewComment = document.getElementById("deleteReviewComment");

const deleteReviewMessage = document.getElementById("deleteReviewMessage");
const confirmDeleteReviewBtn = document.getElementById("confirmDeleteReviewBtn");

// Store selected review
let selectedReview = null;
let isDeletingReview = false;

// Open delete confirmation
function openDeleteReview(review) {
    selectedReview = review;

    // Fill review details
    deleteReviewProduct.textContent = getProductName(review);
    deleteReviewCustomer.textContent = "User #" + review.user_id;
    deleteReviewRating.textContent = review.rating + " / 5";
    deleteReviewComment.textContent = getReviewComment(review) || "No written comment.";

    // Clear previous errors
    deleteReviewMessage.hidden = true;
    deleteReviewMessage.textContent = "";

    deleteReviewDialog.showModal();
}

// Close dialog safely
function closeReviewDialog() {
    if (!isDeletingReview) {
        deleteReviewDialog.close();
    }
}

closeDeleteReviewDialog.addEventListener("click", closeReviewDialog);
cancelDeleteReview.addEventListener("click", closeReviewDialog);

// Prevent Escape from closing the dialog during deletion
deleteReviewDialog.addEventListener("cancel", function (event) {
    if (isDeletingReview) {
        event.preventDefault();
    }
});

// Clear selection when dialog closes
deleteReviewDialog.addEventListener("close", function () {
    selectedReview = null;
    deleteReviewMessage.hidden = true;
});

// ===================================
// DELETE REVIEW REQUEST
// ===================================

confirmDeleteReviewBtn.addEventListener("click", async function () {
    if (!selectedReview || isDeletingReview) {
        return;
    }

    const reviewId = selectedReview.id;

    isDeletingReview = true;

    confirmDeleteReviewBtn.disabled = true;
    confirmDeleteReviewBtn.textContent = "Deleting...";

    cancelDeleteReview.disabled = true;
    closeDeleteReviewDialog.disabled = true;
    deleteReviewMessage.hidden = true;

    try {
        // Delete review using Admin API
        await sendApiRequest(getReviewUrl(reviewId), {
            method: "DELETE",
        });

        // Remove deleted review from the current list
        reviews = reviews.filter(function (review) {
            return String(review.id) !== String(reviewId);
        });

        // Close dialog
        deleteReviewDialog.close();

        // Refresh summary and table
        updateSummary();
        renderReviews();

        showPageMessage("Review deleted successfully.", "success");
    } catch (error) {
        console.error("Delete review error:", error);

        deleteReviewMessage.textContent = error.message;
        deleteReviewMessage.hidden = false;
    } finally {
        isDeletingReview = false;

        confirmDeleteReviewBtn.disabled = false;
        confirmDeleteReviewBtn.textContent = "Delete Review";

        cancelDeleteReview.disabled = false;
        closeDeleteReviewDialog.disabled = false;
    }
});

// Load reviews when the page opens
loadReviews();
