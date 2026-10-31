/* ===================================
   DONO ADMIN - DASHBOARD
   Dashboard Charts and Statistics
=================================== */

document.addEventListener("DOMContentLoaded", function () {
    // ===================================
    // SHARED CHART SETTINGS
    // ===================================

    const chartColors = {
        green: "#146C43",
        blue: "#285FA3",
        purple: "#6941A5",
        amber: "#946000",
        red: "#A52A24",
        grid: "#E7E9E5",
        text: "#64748B",
        white: "#FFFFFF",
    };

    // Each chart has its own elements and Chart.js instance
    const charts = {
        sales: {
            canvas: document.getElementById("dashboardSalesChart"),
            empty: document.getElementById("dashboardSalesEmpty"),
            loading: document.getElementById("dashboardSalesLoading"),
            error: document.getElementById("dashboardSalesError"),
            status: document.getElementById("dashboardSalesStatus"),
            instance: null,
        },

        orders: {
            canvas: document.getElementById("dashboardOrderStatusChart"),
            empty: document.getElementById("dashboardOrdersEmpty"),
            loading: document.getElementById("dashboardOrdersLoading"),
            error: document.getElementById("dashboardOrdersError"),
            status: document.getElementById("dashboardOrderStatusMessage"),
            instance: null,
        },

        topProducts: {
            canvas: document.getElementById("dashboardTopProductsChart"),
            empty: document.getElementById("dashboardTopProductsEmpty"),
            loading: document.getElementById("dashboardTopProductsLoading"),
            error: document.getElementById("dashboardTopProductsError"),
            status: document.getElementById("dashboardTopProductsStatus"),
            instance: null,
        },
    };

    // ===================================
    // SHARED HELPER FUNCTIONS
    // ===================================

    function getChart(name) {
        const chart = charts[name];

        if (!chart) {
            console.error("Unknown dashboard chart:", name);
            return null;
        }

        return chart;
    }

    function hasChartElements(chart) {
        return Boolean(chart.canvas && chart.empty && chart.loading && chart.error && chart.status);
    }

    // Remove an existing Chart.js instance before replacing it
    function destroyChart(chart) {
        if (chart.instance) {
            chart.instance.destroy();
            chart.instance = null;
        }
    }

    // Show one state and hide the others
    function setChartState(name, state) {
        const chart = getChart(name);

        if (!chart || !hasChartElements(chart)) {
            return;
        }

        const validStates = ["loading", "empty", "error", "success"];

        if (!validStates.includes(state)) {
            console.error("Invalid chart state:", state);
            return;
        }

        if (state !== "success") {
            destroyChart(chart);
        }

        chart.canvas.hidden = state !== "success";
        chart.empty.hidden = state !== "empty";
        chart.loading.hidden = state !== "loading";
        chart.error.hidden = state !== "error";

        // The status paragraph describes the chart to screen readers
        chart.status.hidden = state !== "success";
    }

    // Check that labels and values are usable by Chart.js
    function isValidChartData(data) {
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
            return false;
        }

        if (data.labels.length !== data.values.length) {
            return false;
        }

        return data.values.every(function (value) {
            return typeof value === "number" && Number.isFinite(value);
        });
    }

    function hasChartData(data) {
        return data.labels.length > 0 && data.values.length > 0;
    }

    // ===================================
    // 1. SALES PERFORMANCE CHART
    // ===================================

    function createSalesChart(canvas, data) {
        // Chart colors
        const salesColor = chartColors.green;
        const gridColor = chartColors.grid;
        const labelColor = chartColors.text;

        return new Chart(canvas, {
            type: "line",

            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Net Sales (USD)",
                        data: data.values,
                        borderColor: salesColor,
                        backgroundColor: "rgba(20, 108, 67, 0.08)",
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y.toFixed(2) + " USD";
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: labelColor,
                        },
                    },

                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor,
                        },
                        ticks: {
                            color: labelColor,
                            callback: function (value) {
                                return value + " USD";
                            },
                        },
                    },
                },
            },
        });
    }

    // ===================================
    // 2. ORDERS BY STATUS CHART
    // ===================================

    // Order status colors
    const orderStatusColors = {
        delivered: chartColors.green,
        completed: chartColors.green,
        processing: chartColors.blue,
        shipped: chartColors.purple,
        pending: chartColors.amber,
        cancelled: chartColors.red,
        canceled: chartColors.red,
        failed: chartColors.red,
    };

    function getOrderStatusColor(status) {
        const normalizedStatus = String(status).trim().toLowerCase();

        return orderStatusColors[normalizedStatus] || chartColors.text;
    }

    function createOrdersChart(canvas, data) {
        const statusColors = data.labels.map(getOrderStatusColor);

        return new Chart(canvas, {
            type: "doughnut",

            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Orders",
                        data: data.values,
                        backgroundColor: statusColors,
                        borderColor: chartColors.white,
                        borderWidth: 2,
                        hoverOffset: 4,
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: chartColors.text,
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: "circle",
                        },
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.label + ": " + context.parsed + " orders";
                            },
                        },
                    },
                },
            },
        });
    }

    // ===================================
    // 3. TOP SELLING PRODUCTS CHART
    // ===================================

    function createTopProductsChart(canvas, data) {
        // Chart colors
        const productBarColor = chartColors.blue;
        const productGridColor = chartColors.grid;
        const productLabelColor = chartColors.text;

        return new Chart(canvas, {
            type: "bar",

            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Units Sold",
                        data: data.values,
                        backgroundColor: productBarColor,
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28,
                    },
                ],
            },

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.x + " units sold";
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: productGridColor,
                        },
                        ticks: {
                            color: productLabelColor,
                            precision: 0,
                        },
                    },

                    y: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: productLabelColor,
                            autoSkip: false,
                        },
                    },
                },
            },
        });
    }

    // ===================================
    // 4. UPDATE CHART WITH REAL DATA
    // ===================================

    const chartFactories = {
        sales: createSalesChart,
        orders: createOrdersChart,
        topProducts: createTopProductsChart,
    };

    function updateChart(name, data) {
        const chart = getChart(name);

        if (!chart || !hasChartElements(chart)) {
            return;
        }

        if (!isValidChartData(data)) {
            console.error("Invalid data for chart:", name);
            setChartState(name, "error");
            return;
        }

        // A doughnut chart needs a positive total to display slices
        if (
            !hasChartData(data) ||
            (name === "orders" &&
                data.values.every(function (value) {
                    return value === 0;
                }))
        ) {
            setChartState(name, "empty");
            return;
        }

        // Orders and product quantities cannot be negative
        if (
            name !== "sales" &&
            data.values.some(function (value) {
                return value < 0;
            })
        ) {
            setChartState(name, "error");
            return;
        }

        if (typeof Chart === "undefined") {
            console.error("Chart.js failed to load.");
            setChartState(name, "error");
            return;
        }

        destroyChart(chart);

        try {
            // Show the canvas before Chart.js measures its dimensions
            chart.canvas.hidden = false;

            chart.instance = chartFactories[name](chart.canvas, data);

            chart.status.textContent =
                chart.canvas.getAttribute("aria-label") +
                ". Data is available for " +
                data.labels.length +
                " categories.";

            setChartState(name, "success");
        } catch (error) {
            console.error("Failed to render dashboard chart:", name, error);
            setChartState(name, "error");
        }
    }

    // ===================================
    // 5. INITIAL DASHBOARD STATE
    // ===================================

    // Create an empty chart until real API data is available
    // Do not create Chart.js instances with placeholder values
    Object.keys(charts).forEach(function (name) {
        const chart = charts[name];

        if (!hasChartElements(chart)) {
            console.error("Dashboard chart elements are missing:", name);
            return;
        }

        setChartState(name, "empty");
    });

    // Show the correct empty state
    // Show empty state until real data is available

    // The API integration will call these functions later
    window.DONOAdminDashboard = {
        updateChart: updateChart,
        setChartState: setChartState,
    };

    // ===================================
    // 6. DASHBOARD API INTEGRATION
    // ===================================

    // Use the script location so the URL works inside the DONO project folder
    const dashboardScriptUrl = new URL(
        "../assets/js/admin/admin-dashboard.js",
        window.location.href,
    );

    const dashboardApiUrl = new URL(
        "../../../../backend/public/api/admin/dashboard",
        dashboardScriptUrl,
    );

    const dashboardPeriod = document.getElementById("dashboardPeriod");
    let currentRequest = null;

    // Update a single value without changing the dashboard HTML
    function setDashboardValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // MySQL DECIMAL values may arrive as strings in JSON
    function toNumber(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(value);

        return Number.isFinite(number) && number >= 0 ? number : null;
    }

    function formatCount(value) {
        const number = toNumber(value);

        return number === null ? "—" : Math.round(number).toLocaleString("en-US");
    }

    function formatMoney(value) {
        const number = toNumber(value);

        return number === null ? "—" : number.toFixed(2) + " USD";
    }

    function setTableMessage(body, message, colSpan) {
        if (!body) {
            return;
        }

        body.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = colSpan;
        cell.className = "dashboard-table-message";
        cell.textContent = message;

        row.appendChild(cell);
        body.appendChild(row);
    }

    function appendTableCell(row, value) {
        const cell = document.createElement("td");

        cell.textContent = value;

        row.appendChild(cell);
    }

    const recentOrdersBody = document.getElementById("dashboardRecentOrdersBody");

    const lowStockBody = document.getElementById("dashboardLowStockBody");

    // The reviews table has no approval/pending status in DONO's database
    const reviewsAlert = document.getElementById("dashboardPendingReviews");

    if (reviewsAlert) {
        const alertItem = reviewsAlert.closest(".dashboard-alert-item");

        if (alertItem) {
            const heading = alertItem.querySelector("h5");
            const description = alertItem.querySelector("p");

            if (heading) {
                heading.textContent = "Total Reviews";
            }

            if (description) {
                description.textContent = "Customer reviews received";
            }
        }
    }

    const metricIds = [
        "dashboardNetSales",
        "dashboardTotalOrders",
        "dashboardAverageOrder",
        "dashboardPendingOrders",
        "dashboardLowStockCount",
        "dashboardPendingOrdersAlert",
        "dashboardPendingReviews",
        "dashboardPaymentIssues",
    ];

    function resetDashboard(message, chartState) {
        metricIds.forEach(function (id) {
            setDashboardValue(id, "—");
        });

        Object.keys(charts).forEach(function (name) {
            setChartState(name, chartState);
        });

        setTableMessage(recentOrdersBody, message, 3);
        setTableMessage(lowStockBody, message, 2);
    }

    function renderRecentOrders(orders) {
        if (orders.length === 0) {
            setTableMessage(recentOrdersBody, "No recent orders available.", 3);
            return;
        }

        recentOrdersBody.replaceChildren();

        orders.forEach(function (order) {
            const row = document.createElement("tr");

            const orderLabel = order.order_number || "Order #" + order.id;

            appendTableCell(row, String(orderLabel));

            appendTableCell(row, formatMoney(order.total_amount));

            appendTableCell(row, String(order.status || "—"));

            recentOrdersBody.appendChild(row);
        });
    }

    function renderLowStockProducts(items) {
        if (items.length === 0) {
            setTableMessage(lowStockBody, "No low stock products.", 2);
            return;
        }

        lowStockBody.replaceChildren();

        items.forEach(function (product) {
            const row = document.createElement("tr");

            appendTableCell(row, String(product.name || "Product #" + product.id));

            appendTableCell(row, formatCount(product.stock_quantity));

            lowStockBody.appendChild(row);
        });
    }

    // Convert numeric strings from PHP/PDO into Chart.js numbers
    function normalizeChartData(data) {
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
            return null;
        }

        return {
            labels: data.labels.map(function (label) {
                return String(label);
            }),

            values: data.values.map(function (value) {
                if (value === null || value === "") {
                    return NaN;
                }

                return Number(value);
            }),
        };
    }

    function renderDashboard(data) {
        if (
            !data ||
            !data.kpis ||
            !data.charts ||
            !data.alerts ||
            !Array.isArray(data.recent_orders) ||
            !Array.isArray(data.low_stock_products)
        ) {
            throw new Error("Unexpected dashboard data from the server.");
        }

        // Update KPI Cards
        setDashboardValue("dashboardNetSales", formatMoney(data.kpis.net_sales));

        setDashboardValue("dashboardTotalOrders", formatCount(data.kpis.total_orders));

        setDashboardValue("dashboardAverageOrder", formatMoney(data.kpis.average_order_value));

        setDashboardValue("dashboardPendingOrders", formatCount(data.kpis.pending_orders));

        // Update Needs Attention
        setDashboardValue("dashboardLowStockCount", formatCount(data.alerts.low_stock_count));

        setDashboardValue("dashboardPendingOrdersAlert", formatCount(data.alerts.pending_orders));

        setDashboardValue("dashboardPendingReviews", formatCount(data.alerts.total_reviews));

        setDashboardValue("dashboardPaymentIssues", formatCount(data.alerts.payment_issues));

        // Update Charts
        updateChart("sales", normalizeChartData(data.charts.sales));

        updateChart("orders", normalizeChartData(data.charts.orders));

        updateChart("topProducts", normalizeChartData(data.charts.top_products));

        // Update Tables
        renderRecentOrders(data.recent_orders);
        renderLowStockProducts(data.low_stock_products);
    }

    async function loadDashboard() {
        if (!dashboardPeriod) {
            console.error("Dashboard period selector is missing.");
            return;
        }

        // Cancel an older request if the admin changes the period quickly
        if (currentRequest) {
            currentRequest.abort();
        }

        const controller = new AbortController();
        currentRequest = controller;

        const period = Number(dashboardPeriod.value);

        if (![7, 30, 90].includes(period)) {
            resetDashboard("Invalid dashboard period.", "error");
            return;
        }

        resetDashboard("Loading dashboard data...", "loading");

        const url = new URL(dashboardApiUrl);
        url.searchParams.set("period", String(period));

        try {
            const response = await fetch(url, {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            });

            if (response.status === 401) {
                throw new Error("Please log in as admin to view the dashboard.");
            }

            if (response.status === 403) {
                throw new Error("Admin access is required.");
            }

            if (response.status === 404) {
                throw new Error("Dashboard API is not connected yet.");
            }

            let result;

            try {
                result = await response.json();
            } catch (error) {
                throw new Error("The dashboard API returned invalid JSON.");
            }

            if (!response.ok || result.success !== true) {
                throw new Error(result.message || "Unable to load dashboard data.");
            }

            // Do not overwrite newer data with a previous request's result
            if (currentRequest !== controller) {
                return;
            }

            renderDashboard(result.data);
        } catch (error) {
            if (error.name === "AbortError" || currentRequest !== controller) {
                return;
            }

            console.error("Dashboard API error:", error);

            resetDashboard(error.message, "error");
        } finally {
            if (currentRequest === controller) {
                currentRequest = null;
            }
        }
    }

    // Reload dashboard when the time period changes
    if (dashboardPeriod) {
        dashboardPeriod.addEventListener("change", loadDashboard);
    }

    // Load real dashboard data when the page opens
    loadDashboard();

    console.log("DONO Dashboard: Chart components initialized.");
});
