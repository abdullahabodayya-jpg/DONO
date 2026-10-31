<?php

declare(strict_types=1);
use app\Core\Response;
final class AdminMiddleware
{

    public function handle(): void
    {
        if (
            !isset($_SESSION['user'])
            || !is_array($_SESSION['user'])
        ) {
            Response::send(
                false,
                'Authentication required.',
                null,
                401
            );
        }

        if (($_SESSION['user']['role'] ?? null) !== 'admin') {
            Response::send(
                false,
                'Admin access required.',
                null,
                403
            );
        }
    }
}