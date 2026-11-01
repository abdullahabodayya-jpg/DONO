<?php

declare(strict_types=1);

require_once __DIR__ . '/../services/OrderPricing.php';

/**
 * DONO Stripe Payments
 *
 * Currency: USD
 * Minor unit: cents (1 USD = 100 cents)
 *
 * Includes:
 * - Stripe Checkout
 * - Verified Stripe Webhooks
 * - Payment status
 * - Admin payments listing
 * - Full refunds
 */
final class StripePaymentController
{
    private const CURRENCY = 'usd';

    public function __construct(
        private PDO $pdo,
        private array $config
    ) {}

    private function stripe(): void
    {
        $key = $this->config['stripe']['secret_key'] ?? '';

        if (!class_exists(\Stripe\Stripe::class)) {
            Response::send(
                false,
                'Stripe PHP SDK is missing. Run composer install inside DONO/backend.',
                null,
                503
            );
        }

        if (
            !is_string($key)
            || !preg_match('/^sk_(test|live)_[A-Za-z0-9_-]+$/', $key)
            || str_contains($key, 'REPLACE_ME')
        ) {
            Response::send(
                false,
                'Stripe secret key is missing or invalid. Configure backend/config/config.php.',
                null,
                503
            );
        }

        \Stripe\Stripe::setApiKey($key);
    }

    private function userId(): int
    {
        $userId = $_SESSION['user']['id'] ?? null;

        if (
            !filter_var(
                $userId,
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 1]]
            )
        ) {
            Response::send(
                false,
                'Authentication required.',
                null,
                401
            );
        }

        return (int) $userId;
    }

    private function admin(): void
    {
        (new AdminMiddleware())->handle();
    }

    /**
     * Create or reuse a Stripe Checkout Session.
     *
     * Order prices are stored in USD.
     * Stripe receives amounts in cents.
     */
    public function checkout(): void
    {
        $userId = $this->userId();

        $input = json_decode(
            (string) file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            Response::send(
                false,
                'JSON request body required.',
                null,
                422
            );
        }

        $coupon = $input['coupon_code'] ?? null;

        if (
            $coupon !== null
            && (!is_string($coupon) || strlen($coupon) > 50)
        ) {
            Response::send(
                false,
                'Invalid coupon code.',
                null,
                422
            );
        }

        $this->stripe();

        try {
            $this->pdo->beginTransaction();

            // Only select the authenticated user's own order.
            $stmt = $this->pdo->prepare(
                "SELECT *
                 FROM orders
                 WHERE user_id = :user_id
                   AND status IN ('cart', 'pending')
                 ORDER BY
                    CASE WHEN status = 'cart' THEN 0 ELSE 1 END,
                    id DESC
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'user_id' => $userId
            ]);

            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                throw new DomainException(
                    'No cart or pending checkout found.'
                );
            }

            $orderId = (int) $order['id'];

            // Restore the saved coupon if the request did not
            // explicitly provide a coupon_code.
            if (
                $order['status'] === 'cart'
                && !array_key_exists('coupon_code', $input)
                && $order['coupon_id'] !== null
            ) {
                $savedCoupon = $this->pdo->prepare(
                    'SELECT code
                     FROM coupons
                     WHERE id = ?
                     LIMIT 1'
                );

                $savedCoupon->execute([
                    (int) $order['coupon_id']
                ]);

                $coupon = $savedCoupon->fetchColumn() ?: null;
            }

            /*
             * Calculate the final amount.
             *
             * USD uses two decimal places.
             *
             * Example:
             * $25.50 -> 2550 cents
             */
            if ($order['status'] === 'cart') {
                $amountData = (
                    new OrderPricing($this->pdo)
                )->recalculate($orderId, $coupon);

                $amountMinor = (int) $amountData['total_minor'];
                $amount = (string) $amountData['amount'];

            } else {
                if (
                    $coupon !== null
                    && trim($coupon) !== ''
                ) {
                    throw new DomainException(
                        'Coupon cannot be changed on a pending checkout.'
                    );
                }

                $amount = (string) $order['total_amount'];

                // USD: convert dollars to cents.
                $amountMinor = OrderPricing::toMinor($amount);
            }

            if (
                $amountMinor < 1
                || $amountMinor > 999999999999
            ) {
                throw new DomainException(
                    'Invalid payment amount.'
                );
            }

            /*
             * Check for an existing Stripe payment.
             */
            $stmt = $this->pdo->prepare(
                "SELECT *
                 FROM payments
                 WHERE order_id = :id
                   AND provider = 'stripe'
                 ORDER BY id DESC
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'id' => $orderId
            ]);

            $last = $stmt->fetch(PDO::FETCH_ASSOC);

            if (
                $last
                && in_array(
                    $last['status'],
                    ['succeeded', 'refunded'],
                    true
                )
            ) {
                throw new LogicException(
                    'Order has already been paid.'
                );
            }

            /*
             * Reuse an existing Checkout Session only if:
             *
             * 1. It is still open.
             * 2. Its currency is USD.
             * 3. Its amount matches the current order.
             *
             * Old JOD sessions must never be reused.
             */
            if (
                $last
                && $last['status'] === 'pending'
            ) {
                if (
                    OrderPricing::toMinor(
                        (string) $last['amount']
                    ) !== OrderPricing::toMinor($amount)
                ) {
                    throw new LogicException(
                        'Cart changed while a payment was pending. Contact support.'
                    );
                }

                $existing = \Stripe\Checkout\Session::retrieve(
                    $last['provider_reference']
                );

                if ($existing->status === 'complete') {
                    throw new LogicException(
                        'Payment verification is still in progress. Please check My Orders.'
                    );
                }

                if ($existing->status === 'open') {
                    $existingCurrency = strtolower(
                        (string) ($existing->currency ?? '')
                    );

                    $existingAmount = (int) (
                        $existing->amount_total ?? 0
                    );

                    $canReuse =
                        $existingCurrency === self::CURRENCY
                        && $existingAmount === $amountMinor
                        && str_contains((string) ($existing->success_url ?? ''), '/payment-success.html?session_id=')
                        && str_ends_with((string) ($existing->cancel_url ?? ''), '/payment-cancelled.html')
                        && !empty($existing->url);

                    if ($canReuse) {
                        $this->pdo->commit();

                        Response::success(
                            'Existing Checkout session.',
                            [
                                'checkout_url' => $existing->url,
                                'session_id' => $existing->id,
                            ]
                        );

                        return;
                    }
                    $existing->expire();
                }

                $this->pdo->prepare(
                    "UPDATE payments
                     SET status = 'failed'
                     WHERE id = ?
                       AND status = 'pending'"
                )->execute([
                    (int) $last['id']
                ]);
            }

            /*
             * Determine the next payment attempt.
             */
            $attempt = $this->pdo->prepare(
                "SELECT COUNT(*)
                 FROM payments
                 WHERE order_id = ?
                   AND provider = 'stripe'"
            );

            $attempt->execute([
                $orderId
            ]);

            $attemptNumber = 1 + (int) $attempt->fetchColumn();

            /*
             * Validate frontend redirect URL.
             */
            $frontendUrl = rtrim(
                (string) (
                    $this->config['app']['frontend_url'] ?? ''
                ),
                '/'
            );

            if (
                !preg_match(
                    '~^https?://[^/]+/.+~i',
                    $frontendUrl
                )
            ) {
                throw new DomainException(
                    'Frontend URL configuration is invalid.'
                );
            }

            // When running under a nested XAMPP project folder, do not redirect
            // users to the example /DONO/frontend path. The script path is set
            // by Apache (not supplied by the browser), unlike HTTP_HOST.
            $configuredHost = strtolower((string) parse_url($frontendUrl, PHP_URL_HOST));
            $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
            $projectPrefix = preg_replace('~/backend/public(?:/index\.php)?/?$~', '', $scriptName);
            if (
                in_array($configuredHost, ['localhost', '127.0.0.1'], true)
                && is_string($projectPrefix)
                && $projectPrefix !== $scriptName
            ) {
                $configuredScheme = (string) parse_url($frontendUrl, PHP_URL_SCHEME);
                $configuredPort = parse_url($frontendUrl, PHP_URL_PORT);
                $frontendUrl = $configuredScheme . '://' . $configuredHost
                    . ($configuredPort ? ':' . $configuredPort : '')
                    . rtrim($projectPrefix, '/') . '/frontend';
            }

            /*
             * Create USD Stripe Checkout Session.
             */
            // Display the selected wrapping in hosted checkout without altering the server-side total.
            $giftWrapStmt = $this->pdo->prepare('SELECT wrapping_type FROM order_gift_details WHERE order_id = ? LIMIT 1');
            $giftWrapStmt->execute([$orderId]);
            $wrapType = $giftWrapStmt->fetchColumn();
            $checkoutDescription = is_string($wrapType) && $wrapType !== ''
                ? 'Gift wrapping: ' . $wrapType : 'DONO gift order';
            $checkout = \Stripe\Checkout\Session::create(
                [
                    'mode' => 'payment',

                    'line_items' => [
                        [
                            'price_data' => [
                                'currency' => self::CURRENCY,

                                // USD amount in cents.
                                'unit_amount' => $amountMinor,

                                'product_data' => [
                                    'name' => 'DONO Order '
                                        . $order['order_number'],
                                    'description' => $checkoutDescription,
                                ],
                            ],

                            'quantity' => 1,
                        ],
                    ],

                    'metadata' => [
                        'order_id' => (string) $orderId,
                        'user_id' => (string) $userId,
                    ],

                    'payment_intent_data' => [
                        'metadata' => [
                            'dono_order_id' => (string) $orderId,
                        ],
                    ],

                    'success_url' =>
                        $frontendUrl
                        . '/payment-success.html?session_id={CHECKOUT_SESSION_ID}',

                    'cancel_url' =>
                        $frontendUrl
                        . '/payment-cancelled.html',
                ],
                [
                    'idempotency_key' =>
                        'dono-checkout-'
                        . $orderId
                        . '-attempt-'
                        . $attemptNumber,
                ]
            );

            /*
             * Save the payment in the database.
             *
             * payments.amount is stored in USD,
             * not in cents.
             */
            $insert = $this->pdo->prepare(
                "INSERT INTO payments (
                    order_id,
                    provider,
                    provider_reference,
                    amount,
                    status
                )
                VALUES (
                    :id,
                    'stripe',
                    :ref,
                    :amount,
                    'pending'
                )"
            );

            $insert->execute([
                'id' => $orderId,
                'ref' => $checkout->id,
                'amount' => $amount,
            ]);

            /*
             * Mark order as pending.
             */
            $this->pdo->prepare(
                "UPDATE orders
                 SET status = 'pending'
                 WHERE id = ?
                   AND status = 'cart'"
            )->execute([
                $orderId
            ]);

            $this->pdo->commit();

            Response::success(
                'Checkout ready.',
                [
                    'checkout_url' => $checkout->url,
                    'session_id' => $checkout->id,
                ],
                201
            );

        } catch (\Stripe\Exception\ApiErrorException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            error_log(
                'Stripe checkout: ' . $e->getMessage()
            );

            Response::send(
                false,
                'Stripe checkout could not start.',
                null,
                502
            );

        } catch (DomainException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            Response::send(
                false,
                $e->getMessage(),
                null,
                422
            );

        } catch (LogicException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            Response::send(
                false,
                $e->getMessage(),
                null,
                409
            );

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            error_log(
                'Checkout error: ' . $e->getMessage()
            );

            Response::send(
                false,
                'Checkout error. Please contact support.',
                null,
                500
            );
        }
    }

    /**
     * Verify Stripe webhook signatures and process events.
     */
    public function webhook(): void
    {
        $secret = (string) (
            $this->config['stripe']['webhook_secret'] ?? ''
        );

        if (
            $secret === ''
            || str_contains($secret, 'REPLACE_ME')
            || !class_exists(\Stripe\Webhook::class)
        ) {
            Response::send(
                false,
                'Webhook unavailable.',
                null,
                503
            );
        }

        $payload = (string) file_get_contents('php://input');

        $signature = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $signature,
                $secret
            );

        } catch (
            \UnexpectedValueException
            | \Stripe\Exception\SignatureVerificationException $e
        ) {
            Response::send(
                false,
                'Invalid webhook signature or payload.',
                null,
                400
            );
        }

        try {
            if (
                in_array(
                    $event->type,
                    [
                        'checkout.session.completed',
                        'checkout.session.async_payment_succeeded',
                    ],
                    true
                )
            ) {
                $session = $event->data->object;

                if (
                    ($session->payment_status ?? null) === 'paid'
                    && ($session->mode ?? null) === 'payment'
                ) {
                    $this->confirmPayment($session);
                }

            } elseif (
                in_array(
                    $event->type,
                    [
                        'checkout.session.expired',
                        'checkout.session.async_payment_failed',
                    ],
                    true
                )
            ) {
                $session = $event->data->object;

                $stmt = $this->pdo->prepare(
                    "UPDATE payments
                     SET status = 'failed'
                     WHERE provider = 'stripe'
                       AND provider_reference = :ref
                       AND status = 'pending'"
                );

                $stmt->execute([
                    'ref' => (string) $session->id
                ]);

            } elseif (
                in_array(
                    $event->type,
                    [
                        'refund.created',
                        'refund.updated',
                    ],
                    true
                )
            ) {
                $refund = $event->data->object;

                $this->recordRefund(
                    (string) $refund->id,
                    (string) $refund->status
                );
            }

            Response::success(
                'Webhook accepted.'
            );

        } catch (Throwable $e) {
            error_log(
                'Stripe webhook reconciliation failed: '
                . $e->getMessage()
            );

            Response::send(
                false,
                'Unable to reconcile Stripe event.',
                null,
                500
            );
        }
    }

    /**
     * Confirm payment only when the Stripe currency
     * and amount match the database.
     */
    private function confirmPayment(object $session): void
    {
        $id = filter_var(
            $session->metadata->order_id ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            throw new RuntimeException(
                'Missing Stripe order metadata.'
            );
        }

        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare(
                "SELECT
                    p.id,
                    p.status,
                    p.amount,
                    o.id AS order_id,
                    o.status AS order_status,
                    o.total_amount
                 FROM payments p
                 JOIN orders o ON o.id = p.order_id
                 WHERE p.provider = 'stripe'
                   AND p.provider_reference = :sid
                   AND p.order_id = :oid
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                'sid' => (string) $session->id,
                'oid' => $id,
            ]);

            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                throw new RuntimeException(
                    'Unknown Stripe Checkout session.'
                );
            }

            /*
             * USD amount verification.
             *
             * $25.50 in DB = 2550 cents in Stripe.
             */
            $expected = OrderPricing::toMinor(
                (string) $row['amount']
            );

            $orderAmount = OrderPricing::toMinor(
                (string) $row['total_amount']
            );

            $stripeCurrency = strtolower(
                (string) ($session->currency ?? '')
            );

            $stripeAmount = (int) (
                $session->amount_total ?? 0
            );

            if (
                $stripeCurrency !== self::CURRENCY
                || $stripeAmount !== $expected
                || $expected !== $orderAmount
            ) {
                throw new RuntimeException(
                    'Checkout currency or amount mismatch.'
                );
            }

            /*
             * Ignore duplicate webhook after refund.
             */
            if ($row['status'] === 'refunded') {
                $this->pdo->commit();
                return;
            }

            if (
                !in_array(
                    $row['order_status'],
                    ['pending', 'confirmed'],
                    true
                )
            ) {
                throw new RuntimeException(
                    'Payment received for an order in an invalid state: manual reconciliation required.'
                );
            }

            /*
             * Mark payment as succeeded.
             */
            if ($row['status'] !== 'succeeded') {
                $this->pdo->prepare(
                    "UPDATE payments
                     SET status = 'succeeded'
                     WHERE id = ?"
                )->execute([
                    (int) $row['id']
                ]);
            }

            /*
             * Confirm the order.
             */
            $this->pdo->prepare(
                "UPDATE orders
                 SET status = 'confirmed'
                 WHERE id = ?
                   AND status = 'pending'"
            )->execute([
                $id
            ]);

            $this->pdo->commit();

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }

    /**
     * Return payment status for the authenticated user.
     */
    public function status(): void
    {
        $userId = $this->userId();

        $sid = $_GET['session_id'] ?? '';

        if (
            !is_string($sid)
            || !preg_match('/^cs_[A-Za-z0-9_]+$/', $sid)
        ) {
            Response::send(
                false,
                'Invalid Checkout session.',
                null,
                422
            );
        }

        $stmt = $this->pdo->prepare(
            "SELECT
                p.status AS payment_status,
                p.amount,
                o.order_number,
                o.status AS order_status
             FROM payments p
             JOIN orders o ON o.id = p.order_id
             WHERE p.provider = 'stripe'
               AND p.provider_reference = :ref
               AND o.user_id = :user_id
             LIMIT 1"
        );

        $stmt->execute([
            'ref' => $sid,
            'user_id' => $userId,
        ]);

        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            Response::send(
                false,
                'Payment not found.',
                null,
                404
            );
        }

        Response::success(
            'Payment status.',
            $payment
        );
    }

    /**
     * Admin payments listing.
     *
     * Works even if the optional refund table
     * has not been created yet.
     */
    public function adminPayments(): void
    {
        $this->admin();

        $hasRefundTable = (bool) $this->pdo
            ->query("SHOW TABLES LIKE 'payment_refunds'")
            ->fetchColumn();

        if ($hasRefundTable) {
            $sql = "
                SELECT
                    p.*,
                    o.order_number,
                    r.stripe_refund_id,
                    r.status AS refund_status,
                    1 AS refund_available
                FROM payments p
                JOIN orders o ON o.id = p.order_id
                LEFT JOIN payment_refunds r
                    ON r.payment_id = p.id
                ORDER BY p.id DESC
            ";

        } else {
            $sql = "
                SELECT
                    p.*,
                    o.order_number,
                    NULL AS stripe_refund_id,
                    NULL AS refund_status,
                    0 AS refund_available
                FROM payments p
                JOIN orders o ON o.id = p.order_id
                ORDER BY p.id DESC
            ";
        }

        $payments = $this->pdo
            ->query($sql)
            ->fetchAll(PDO::FETCH_ASSOC);

        Response::success(
            'Payments loaded.',
            $payments
        );
    }

    /**
     * Process a full Stripe refund.
     */
    public function refund(?int $requestedId = null): void
    {
        $this->admin();

        $id = $requestedId;

        if ($id === null) {
            $body = json_decode(
                (string) file_get_contents('php://input'),
                true
            );

            $id = is_array($body)
                ? filter_var(
                    $body['payment_id'] ?? null,
                    FILTER_VALIDATE_INT
                )
                : false;
        }

        if (!$id || $id < 1) {
            Response::send(
                false,
                'Valid payment_id required.',
                null,
                422
            );
        }

        $this->stripe();

        $stmt = $this->pdo->prepare(
            'SELECT * FROM payments WHERE id = ?'
        );

        $stmt->execute([$id]);

        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            Response::send(
                false,
                'Payment not found.',
                null,
                404
            );
        }

        if (
            $payment['provider'] !== 'stripe'
            || empty($payment['provider_reference'])
        ) {
            Response::send(
                false,
                'Only Stripe Checkout payments can be refunded.',
                null,
                422
            );
        }

        if (
            !in_array(
                $payment['status'],
                ['succeeded', 'refunded'],
                true
            )
        ) {
            Response::send(
                false,
                'Only successful payments may be refunded.',
                null,
                409
            );
        }

        $hasRefundTable = (bool) $this->pdo
            ->query("SHOW TABLES LIKE 'payment_refunds'")
            ->fetchColumn();

        if (!$hasRefundTable) {
            Response::send(
                false,
                'Refund history table missing. Apply backend/database/migration_stripe_refunds.sql.',
                null,
                503
            );
        }

        if ($payment['status'] === 'refunded') {
            $check = $this->pdo->prepare(
                "SELECT stripe_refund_id, status
                 FROM payment_refunds
                 WHERE payment_id = ?"
            );

            $check->execute([$id]);

            $past = $check->fetch(PDO::FETCH_ASSOC);

            if (!$past) {
                Response::send(
                    false,
                    'Already refunded outside DONO. Verify in Stripe.',
                    null,
                    409
                );
            }
        }

        /*
         * Ensure a local refund record exists.
         */
        $this->pdo->prepare(
            "INSERT IGNORE INTO payment_refunds (
                payment_id,
                status
            )
            VALUES (?, 'pending')"
        )->execute([$id]);

        $lookup = $this->pdo->prepare(
            'SELECT * FROM payment_refunds WHERE payment_id = ?'
        );

        $lookup->execute([$id]);

        $stored = $lookup->fetch(PDO::FETCH_ASSOC);

        if ($stored['status'] === 'succeeded') {
            Response::success(
                'Already refunded.',
                [
                    'payment_id' => $id,
                    'refund_id' => $stored['stripe_refund_id'],
                    'status' => 'refunded',
                ]
            );

            return;
        }

        try {
            /*
             * Reuse an existing refund if available.
             */
            if ($stored['stripe_refund_id']) {
                $refund = \Stripe\Refund::retrieve(
                    $stored['stripe_refund_id']
                );

            } else {
                $session = \Stripe\Checkout\Session::retrieve(
                    $payment['provider_reference']
                );

                if (empty($session->payment_intent)) {
                    throw new RuntimeException(
                        'PaymentIntent not available.'
                    );
                }

                /*
                 * Stripe refunds the original PaymentIntent
                 * in its original payment currency (USD).
                 */
                $refund = \Stripe\Refund::create(
                    [
                        'payment_intent' => $session->payment_intent,

                        'reason' => 'requested_by_customer',

                        'metadata' => [
                            'dono_payment_id' => (string) $id,
                            'dono_order_id' => (string) $payment['order_id'],
                            'dono_admin_id' => (string) (
                                $_SESSION['user']['id'] ?? ''
                            ),
                        ],
                    ],
                    [
                        'idempotency_key' =>
                            'dono-full-refund-payment-' . $id,
                    ]
                );
            }

            /*
             * Save the Stripe refund reference.
             */
            $this->pdo->prepare(
                "UPDATE payment_refunds
                 SET stripe_refund_id = ?
                 WHERE payment_id = ?"
            )->execute([
                (string) $refund->id,
                $id,
            ]);

            $this->recordRefund(
                (string) $refund->id,
                (string) $refund->status
            );

            error_log(
                sprintf(
                    'DONO refund requested | admin_id=%d payment_id=%d order_id=%d stripe_refund_id=%s status=%s',
                    (int) ($_SESSION['user']['id'] ?? 0),
                    $id,
                    (int) $payment['order_id'],
                    (string) $refund->id,
                    (string) $refund->status
                )
            );

            $http = $refund->status === 'succeeded'
                ? 200
                : 202;

            Response::success(
                'Stripe refund processed.',
                [
                    'payment_id' => $id,
                    'refund_id' => $refund->id,
                    'refund_status' => $refund->status,
                ],
                $http
            );

        } catch (\Stripe\Exception\ApiErrorException $e) {
            error_log(
                'Stripe refund error: ' . $e->getMessage()
            );

            Response::send(
                false,
                'Stripe refund failed. Review Stripe Dashboard before retrying.',
                null,
                502
            );

        } catch (Throwable $e) {
            error_log(
                'Refund reconciliation error: ' . $e->getMessage()
            );

            Response::send(
                false,
                'Unable to process refund. Reconcile with Stripe Dashboard.',
                null,
                500
            );
        }
    }

    /**
     * Update local refund and order statuses.
     */
    private function recordRefund(
        string $stripeRefundId,
        string $stripeStatus
    ): void {
        $status = match ($stripeStatus) {
            'succeeded' => 'succeeded',
            'failed', 'canceled' => 'failed',
            default => 'pending',
        };

        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare(
                "SELECT
                    p.id,
                    p.order_id,
                    r.status AS old_status
                 FROM payment_refunds r
                 JOIN payments p
                    ON p.id = r.payment_id
                 WHERE r.stripe_refund_id = ?
                 LIMIT 1
                 FOR UPDATE"
            );

            $stmt->execute([
                $stripeRefundId
            ]);

            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->pdo->commit();
                return;
            }

            if ($row['old_status'] === 'succeeded') {
                $this->pdo->commit();
                return;
            }

            /*
             * Update refund status.
             */
            $this->pdo->prepare(
                "UPDATE payment_refunds
                 SET status = ?
                 WHERE stripe_refund_id = ?"
            )->execute([
                $status,
                $stripeRefundId,
            ]);

            if ($status === 'succeeded') {
                /*
                 * Mark payment as refunded.
                 */
                $this->pdo->prepare(
                    "UPDATE payments
                     SET status = 'refunded'
                     WHERE id = ?
                       AND status IN ('succeeded', 'refunded')"
                )->execute([
                    (int) $row['id']
                ]);

                /*
                 * Cancel the associated order.
                 */
                $this->pdo->prepare(
                    "UPDATE orders
                     SET status = 'cancelled'
                     WHERE id = ?
                       AND status = 'confirmed'"
                )->execute([
                    (int) $row['order_id']
                ]);
            }

            $this->pdo->commit();

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }
}
