/* ===================================
   DONO - PRODUCT REVIEWS COMPONENT
   Display Reviews and Submit Rating
=================================== */

// Build URLs based on the project folder
const reviewsTemplateUrl = new URL("../../../components/product-reviews.html", import.meta.url);

const productsApiUrl = new URL("../../../../backend/public/api/products/", import.meta.url);

// Get API URL for a specific product's reviews
function getReviewsUrl(productId) {
    return new URL(encodeURIComponent(productId) + "/reviews", productsApiUrl);
}

// Read an API response
async function sendRequest(url, options = {}) {
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
        throw new Error("Please log in to submit a review.");
    }

    if (response.status === 403) {
        throw new Error("You do not have permission to submit a review.");
    }

    if (response.status === 409) {
        throw new Error("You have already reviewed this product.");
    }

    if (!response.ok || result.success !== true) {
        throw new Error(result.message || "Request failed.");
    }

    return result;
}

// Create a text element safely
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// Format review date
function formatReviewDate(value) {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}

// Create stars for a review
function createStars(rating) {
    const stars = createElement("div", "dono-reviews-item-stars");

    const number = Number(rating);
    const safeRating = Number.isInteger(number) ? Math.max(0, Math.min(5, number)) : 0;

    stars.textContent = "★".repeat(safeRating) + "☆".repeat(5 - safeRating);

    stars.setAttribute("aria-label", safeRating + " out of 5 stars");

    return stars;
}

// ===================================
// MOUNT PRODUCT REVIEWS COMPONENT
// ===================================

export async function mountProductReviews(container, productId) {
    // Validate the container
    if (!(container instanceof HTMLElement)) {
        throw new Error("Product reviews container was not found.");
    }

    // Validate product ID
    const id = Number(productId);

    if (!Number.isInteger(id) || id <= 0) {
        container.textContent = "Invalid product ID.";
        return;
    }

    container.textContent = "Loading product reviews...";

    // Load the independent HTML component
    let html;

    try {
        const response = await fetch(reviewsTemplateUrl, {
            credentials: "same-origin",
        });

        if (!response.ok) {
            throw new Error("Unable to load reviews component.");
        }

        html = await response.text();
    } catch (error) {
        console.error("Reviews component loading error:", error);
        container.textContent = "Unable to load reviews component.";
        return;
    }

    // Only local trusted component HTML is inserted here
    const template = document.createElement("template");
    template.innerHTML = html.trim();

    const component = template.content.querySelector(".dono-reviews");

    if (!component) {
        container.textContent = "Reviews component is unavailable.";
        return;
    }

    container.replaceChildren(component);

    // Get component elements
    const averageElement = component.querySelector("[data-review-average]");
    const starsElement = component.querySelector("[data-review-stars]");
    const countElement = component.querySelector("[data-review-count]");
    const reviewList = component.querySelector("[data-review-list]");

    const feedbackElement = component.querySelector("[data-review-feedback]");
    const reviewForm = component.querySelector("[data-review-form]");
    const formMessage = component.querySelector("[data-review-form-message]");
    const submitButton = component.querySelector("[data-review-submit]");

    const ratingInputs = reviewForm.querySelectorAll('input[name="rating"]');

    const commentInput = reviewForm.querySelector('textarea[name="comment"]');

    const reviewsUrl = getReviewsUrl(id);

    // Show a message
    function showMessage(element, message, state = "error") {
        element.textContent = message;
        element.dataset.state = state;
        element.hidden = message === "";
    }

    // Update rating selection appearance
    function updateSelectedStars() {
        const selected = reviewForm.querySelector('input[name="rating"]:checked');

        const rating = selected ? Number(selected.value) : 0;

        ratingInputs.forEach(function (input) {
            input.parentElement.classList.toggle("is-selected", Number(input.value) <= rating);
        });
    }

    // Listen for star selection
    ratingInputs.forEach(function (input) {
        input.addEventListener("change", updateSelectedStars);
    });

    // Display average rating and total reviews
    function renderSummary(summary) {
        const total = Number(summary?.total_reviews) || 0;
        const average = Number(summary?.average_rating) || 0;

        const safeAverage = Math.max(0, Math.min(5, average));
        const roundedRating = Math.round(safeAverage);

        averageElement.textContent = safeAverage.toFixed(1);

        starsElement.textContent = "★".repeat(roundedRating) + "☆".repeat(5 - roundedRating);

        starsElement.setAttribute("aria-label", safeAverage.toFixed(1) + " out of 5 stars");

        countElement.textContent = total + (total === 1 ? " review" : " reviews");
    }

    // Display customer reviews
    function renderReviews(reviews) {
        reviewList.replaceChildren();

        if (reviews.length === 0) {
            reviewList.appendChild(
                createElement(
                    "p",
                    "dono-reviews-empty",
                    "No reviews yet. Be the first to review this product.",
                ),
            );

            return;
        }

        reviews.forEach(function (review) {
            const reviewItem = createElement("article", "dono-reviews-item");

            // Review header
            const header = createElement("div", "dono-reviews-item-header");

            header.appendChild(createElement("strong", "", "Customer Review"));

            header.appendChild(
                createElement(
                    "span",
                    "dono-reviews-item-date",
                    formatReviewDate(review.created_at),
                ),
            );

            reviewItem.appendChild(header);

            // Stars
            reviewItem.appendChild(createStars(review.rating));

            // Comment
            const comment = typeof review.comment === "string" ? review.comment.trim() : "";

            reviewItem.appendChild(
                createElement("p", "dono-reviews-item-comment", comment || "No written comment."),
            );

            reviewList.appendChild(reviewItem);
        });
    }

    // ===================================
    // LOAD REVIEWS FROM API
    // ===================================

    async function loadReviews() {
        try {
            const result = await sendRequest(reviewsUrl);

            if (!result.data || !Array.isArray(result.data.items) || !result.data.summary) {
                throw new Error("Invalid reviews response.");
            }

            // Display reviews and rating summary
            renderSummary(result.data.summary);
            renderReviews(result.data.items);

            showMessage(feedbackElement, "");
        } catch (error) {
            console.error("Reviews loading error:", error);

            reviewList.replaceChildren(
                createElement("p", "dono-reviews-empty", "Unable to load product reviews."),
            );

            showMessage(feedbackElement, error.message);
        }
    }

    // ===================================
    // SUBMIT PRODUCT REVIEW
    // ===================================

    reviewForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get selected rating
        const selectedRating = reviewForm.querySelector('input[name="rating"]:checked');

        if (!selectedRating) {
            showMessage(formMessage, "Please select a rating.");
            return;
        }

        const rating = Number(selectedRating.value);
        const comment = commentInput.value.trim();

        // Validate rating
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            showMessage(formMessage, "Rating must be between 1 and 5.");
            return;
        }

        // Validate comment
        if (comment.length > 2000) {
            showMessage(formMessage, "Comment must not exceed 2000 characters.");
            return;
        }

        const reviewData = {
            rating: rating,
            comment: comment || null,
        };

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        showMessage(formMessage, "");

        let submittedSuccessfully = false;

        try {
            // Submit review to PHP API
            await sendRequest(reviewsUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(reviewData),
            });

            submittedSuccessfully = true;

            // Reset form after success
            reviewForm.reset();
            updateSelectedStars();

            showMessage(formMessage, "Your review was submitted successfully.", "success");

            // Prevent another submission from this form
            ratingInputs.forEach(function (input) {
                input.disabled = true;
            });

            commentInput.disabled = true;

            // Refresh reviews without refreshing the page
            await loadReviews();
        } catch (error) {
            console.error("Submit review error:", error);

            showMessage(formMessage, error.message);
        } finally {
            submitButton.disabled = submittedSuccessfully;

            submitButton.textContent = submittedSuccessfully ? "Review Submitted" : "Submit Review";
        }
    });

    // Load reviews when component is mounted
    await loadReviews();
}
