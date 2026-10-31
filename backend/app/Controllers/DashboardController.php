<?php

class DashboardController
{
    private DashboardRepository $dashboardRepository;

    public function __construct(DashboardRepository $dashboardRepository)
    {
        $this->dashboardRepository = $dashboardRepository;
    }

    // Get dashboard statistics and charts
    public function index(): void
    {
        // Read selected period from query parameters
        $period = $_GET["period"] ?? 30;

        // Validate the period
        $validatedPeriod = filter_var(
            $period,
            FILTER_VALIDATE_INT
        );

        if (
            $validatedPeriod === false ||
            !in_array($validatedPeriod, [7, 30, 90], true)
        ) {
            Response::send(
                false,
                "Period must be 7, 30 or 90 days",
                null,
                422
            );
            return;
        }

        try {
            // Get dashboard data from database
            $dashboardData = $this->dashboardRepository->getDashboardData(
                $validatedPeriod
            );

            // Return data to dashboard JavaScript
            Response::send(
                true,
                "Dashboard data retrieved successfully",
                $dashboardData,
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve dashboard data",
                null,
                500
            );
        }
    }
}