/* ===================================
   DONO ADMIN - SHARED LAYOUT
   Sidebar, Topbar and Responsive Drawer
=================================== */

document.addEventListener("DOMContentLoaded", async function () {
    // ===================================
    // 1. GET SHARED LAYOUT ELEMENTS
    // ===================================

    const sidebar = document.getElementById("adminSidebar");
    const topbar = document.getElementById("adminTopbar");
    const overlay = document.getElementById("adminDrawerOverlay");
    const main = document.querySelector(".admin-main");

    if (!sidebar || !topbar || !overlay || !main) {
        console.error("Admin layout elements are missing.");
        return;
    }

    // ===================================
    // 2. LOAD SHARED HTML COMPONENTS
    // ===================================

    async function loadComponent(element, url) {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load component: " + url);
        }

        element.innerHTML = await response.text();
    }

    try {
        await Promise.all([
            loadComponent(sidebar, "components/sidebar.html"),
            loadComponent(topbar, "components/topbar.html"),
        ]);
    } catch (error) {
        console.error("Admin layout loading error:", error);
        return;
    }

    // Logout must revoke PHP session, then return to standalone landing.
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    adminLogoutBtn?.addEventListener('click', async () => {
        adminLogoutBtn.disabled = true;
        try {
            const api = new URL('../../backend/public/api/auth/logout', document.baseURI);
            const response = await fetch(api, {method:'POST',credentials:'same-origin'});
            if(!response.ok) throw new Error('Unable to log out; please try again.');
            location.replace('../landing.html');
        } catch (error) {
            window.DonoUI?.toast(error.message,'error');
            adminLogoutBtn.disabled=false;
        }
    });

    // ===================================
    // 3. SET CURRENT PAGE
    // ===================================

    // Add new Admin pages here when they are created
    const pages = {
        "index.html": {
            key: "dashboard",
            title: "Dashboard",
            breadcrumb: "Admin / Dashboard",
        },
        "products.html": {
            key: "products",
            title: "Products Management",
            breadcrumb: "Admin / Products",
        },
        "reviews.html": {
            key: "reviews",
            title: "Reviews Management",
            breadcrumb: "Admin / Reviews",
        },
        "categories.html": {
            key: "categories",
            title: "Categories Management",
            breadcrumb: "Admin / Categories",
        },
        "coupons.html": {
            key: "coupons",
            title: "Coupons Management",
            breadcrumb: "Admin / Coupons",
        },
        "users.html": {
            key: "users",
            title: "Users Management",
            breadcrumb: "Admin / Users",
        },
        "payments.html": {
            key: "payments",
            title: "Payments Management",
            breadcrumb: "Admin / Payments",
        },
        "orders.html": {
            key: "orders",
            title: "Orders Management",
            breadcrumb: "Admin / Orders",
        },
    };

    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    const currentPage = pages[currentFile];

    if (currentPage) {
        const activeLink = sidebar.querySelector('[data-admin-page="' + currentPage.key + '"]');

        if (activeLink) {
            activeLink.classList.add("active");
            activeLink.setAttribute("aria-current", "page");
        }

        const pageTitle = document.getElementById("adminPageTitle");
        const breadcrumb = document.getElementById("adminBreadcrumb");

        if (pageTitle) {
            pageTitle.textContent = currentPage.title;
        }

        if (breadcrumb) {
            breadcrumb.textContent = currentPage.breadcrumb;
        }
    }

    // ===================================
    // 4. INITIALIZE LUCIDE ICONS
    // ===================================

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // ===================================
    // 5. RESPONSIVE DRAWER
    // ===================================

    const menuButton = document.getElementById("adminMenuButton");
    const closeButton = document.getElementById("adminDrawerClose");

    const drawerBreakpoint = window.matchMedia("(max-width: 1023px)");

    // Get all focusable elements inside the sidebar
    function getFocusableElements() {
        return Array.from(
            sidebar.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
        ).filter(function (element) {
            return element.getClientRects().length > 0;
        });
    }

    // Check if drawer is open
    function isDrawerOpen() {
        return sidebar.classList.contains("is-open");
    }

    function openDrawer() {
        if (!drawerBreakpoint.matches || !menuButton || !closeButton) {
            return;
        }

        sidebar.classList.add("is-open");
        overlay.classList.add("is-visible");

        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Close navigation menu");

        // Prevent interaction with the page behind the drawer
        main.inert = true;

        // Prevent scrolling behind the drawer
        document.body.style.overflow = "hidden";

        closeButton.focus();
    }

    function closeDrawer(restoreFocus = true) {
        if (!isDrawerOpen()) {
            return;
        }

        sidebar.classList.remove("is-open");
        overlay.classList.remove("is-visible");

        if (menuButton) {
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Open navigation menu");
        }

        // Allow interaction with the page again
        main.inert = false;

        // Restore page scrolling
        document.body.style.overflow = "";

        // Return keyboard focus to the menu button
        if (restoreFocus && drawerBreakpoint.matches && menuButton) {
            menuButton.focus();
        }

        // Remove focus from the hidden drawer on desktop
        if (!drawerBreakpoint.matches && sidebar.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    }

    if (menuButton && closeButton) {
        menuButton.addEventListener("click", function () {
            if (isDrawerOpen()) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        closeButton.addEventListener("click", function () {
            closeDrawer();
        });

        overlay.addEventListener("click", function () {
            closeDrawer();
        });

        // Keyboard navigation
        document.addEventListener("keydown", function (event) {
            if (!isDrawerOpen()) {
                return;
            }

            // Close drawer when Escape is pressed
            if (event.key === "Escape") {
                event.preventDefault();
                closeDrawer();
                return;
            }

            // Keep keyboard focus inside the drawer
            if (event.key === "Tab") {
                const focusableElements = getFocusableElements();

                if (focusableElements.length === 0) {
                    event.preventDefault();

                    sidebar.setAttribute("tabindex", "-1");
                    sidebar.focus();

                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                // If focus somehow moves outside, bring it back
                if (!sidebar.contains(document.activeElement)) {
                    event.preventDefault();
                    firstElement.focus();
                    return;
                }

                // Shift + Tab on first element goes to last element
                if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }

                // Tab on last element goes back to first element
                if (!event.shiftKey && document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        });

        // Close drawer when switching to desktop layout
        drawerBreakpoint.addEventListener("change", function () {
            if (isDrawerOpen()) {
                closeDrawer(false);
            }
        });
    }
});
