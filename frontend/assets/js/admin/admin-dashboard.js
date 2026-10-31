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
                        label: "Net Sales (JOD)",
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
                                return context.parsed.y.toFixed(2) + " JOD";
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
                                return value + " JOD";
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

    console.log("DONO Dashboard: Chart components initialized.");
});
