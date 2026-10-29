<?php

declare(strict_types=1);

final class CouponController 
{
    private CouponRepository $coupons;

    public function __construct(Database $database)
    {
        $this->coupons = new CouponRepository(
            $database->getConnection()
        );
    }
private function readJsonBody(): array
    {
        $body = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($body)) {
            Response::send(
                false,
                'Invalid JSON request body.',
                null,
                400
            );
        }

        return $body;
    }

    private function validateData(array $body): array
    {
        $code = $body['code'] ?? null;
        $type = $body['discount_type'] ?? null;
        $value = $body['discount_value'] ?? null;
        $minimum = $body['min_order_amount'] ?? 0;
        $start = $body['start_date'] ?? null;
        $end = $body['end_date'] ?? null;
        $active = $body['is_active'] ?? 1;

        if (!is_string($code) || trim($code) === '') {
            Response::send(false, 'Coupon code is required.', null, 422);
        }

        $code = trim($code);

        if (strlen($code) > 50) {
            Response::send(false, 'Coupon code is too long.', null, 422);
        }

        if (!in_array($type, ['percentage', 'fixed'], true)) {
            Response::send(false, 'Invalid discount type.', null, 422);
        }

        if (
            (!is_int($value) && !is_float($value))
            || !is_finite((float) $value)
            || $value <= 0
        ) {
            Response::send(false, 'Discount value must be positive.', null, 422);
        }

        if ($type === 'percentage' && $value > 100) {
            Response::send(false, 'Percentage cannot exceed 100.', null, 422);
        }

        if (
            (!is_int($minimum) && !is_float($minimum))
            || !is_finite((float) $minimum)
            || $minimum < 0
        ) {
            Response::send(false, 'Minimum amount cannot be negative.', null, 422);
        }

        if (
            !is_string($start)
            || !is_string($end)
            || strtotime($start) === false
            || strtotime($end) === false
        ) {
            Response::send(false, 'Valid start and end dates are required.', null, 422);
        }

        if (strtotime($end) < strtotime($start)) {
            Response::send(false, 'End date must be after start date.', null, 422);
        }

        if (!in_array($active, [0, 1], true)) {
            Response::send(false, 'is_active must be 0 or 1.', null, 422);
        }

        return [
            'code' => $code,
            'discount_type' => $type,
            'discount_value' => round((float) $value, 2),
            'min_order_amount' => round((float) $minimum, 2),
            'start_date' => $start,
            'end_date' => $end,
            'is_active' => $active,
        ];
    }

    public function index(): void
    {
        Response::success(
            'Coupons retrieved successfully.',
            $this->coupons->getAll()
        );
    }

    public function show(string $id): void
    {
        if (!ctype_digit($id) || (int) $id < 1) {
            Response::send(false, 'Invalid coupon ID.', null, 422);
        }

        $coupon = $this->coupons->findById((int) $id);

        if ($coupon === false) {
            Response::send(false, 'Coupon not found.', null, 404);
        }

        Response::success('Coupon retrieved successfully.', $coupon);
    }

    public function store(): void
    {
        $data = $this->validateData($this->readJsonBody());

        if ($this->coupons->findByCode($data['code']) !== false) {
            Response::send(false, 'Coupon code already exists.', null, 409);
        }

        $id = $this->coupons->create($data);
        $coupon = $this->coupons->findById($id);

        Response::success('Coupon created successfully.', $coupon, 201);
    }

    public function update(string $id): void
    {
        if (!ctype_digit($id) || (int) $id < 1) {
            Response::send(false, 'Invalid coupon ID.', null, 422);
        }

        $couponId = (int) $id;

        if ($this->coupons->findById($couponId) === false) {
            Response::send(false, 'Coupon not found.', null, 404);
        }

        $data = $this->validateData($this->readJsonBody());
        $existing = $this->coupons->findByCode($data['code']);

        if ($existing !== false && (int) $existing['id'] !== $couponId) {
            Response::send(false, 'Coupon code already exists.', null, 409);
        }

        $this->coupons->update($couponId, $data);

        Response::success(
            'Coupon updated successfully.',
            $this->coupons->findById($couponId)
        );
    }

    public function patch(string $id): void
{
    // Validate coupon ID
    if (!ctype_digit($id) || (int) $id < 1) {
        Response::send(false, 'Invalid coupon ID.', null, 422);
    }

    $couponId = (int) $id;

    // Find existing coupon
    $coupon = $this->coupons->findById($couponId);

    if ($coupon === false) {
        Response::send(false, 'Coupon not found.', null, 404);
    }

    // Read the fields sent in the PATCH request
    $body = $this->readJsonBody();

    if ($body === []) {
        Response::send(false, 'At least one field is required.', null, 422);
    }

    // Convert database values to the expected PHP types
    $existingData = [
        'code' => $coupon['code'],
        'discount_type' => $coupon['discount_type'],
        'discount_value' => (float) $coupon['discount_value'],
        'min_order_amount' => (float) $coupon['min_order_amount'],
        'start_date' => $coupon['start_date'],
        'end_date' => $coupon['end_date'],
        'is_active' => (int) $coupon['is_active'],
    ];

    // Keep old values for fields not included in the request
    $mergedData = array_replace($existingData, $body);

    // Validate the complete result
    $data = $this->validateData($mergedData);

    // Prevent duplicate coupon codes
    $existingCode = $this->coupons->findByCode($data['code']);

    if (
        $existingCode !== false
        && (int) $existingCode['id'] !== $couponId
    ) {
        Response::send(false, 'Coupon code already exists.', null, 409);
    }

    // Save the updated coupon
    $this->coupons->update($couponId, $data);

    Response::success(
        'Coupon partially updated successfully.',
        $this->coupons->findById($couponId)
    );
}

    public function destroy(string $id): void
    {
        if (!ctype_digit($id) || (int) $id < 1) {
            Response::send(false, 'Invalid coupon ID.', null, 422);
        }

        if (!$this->coupons->delete((int) $id)) {
            Response::send(false, 'Coupon not found.', null, 404);
        }

        Response::success('Coupon deleted successfully.');
    }

    public function validateCoupon(): void
    {
        $body = $this->readJsonBody();
        $code = $body['code'] ?? null;
        $subtotal = $body['subtotal'] ?? null;

        if (!is_string($code) || trim($code) === '') {
            Response::send(false, 'Coupon code is required.', null, 422);
        }

        if (
            (!is_int($subtotal) && !is_float($subtotal))
            || !is_finite((float) $subtotal)
            || $subtotal <= 0
        ) {
            Response::send(false, 'Subtotal must be a positive number.', null, 422);
        }

        $coupon = $this->coupons->findByCode(trim($code));

        if ($coupon === false) {
            Response::send(false, 'Coupon not found.', null, 404);
        }

        if ((int) $coupon['is_active'] !== 1) {
            Response::send(false, 'Coupon is inactive.', null, 422);
        }

        $now = new DateTimeImmutable();
        $start = new DateTimeImmutable($coupon['start_date']);
        $end = new DateTimeImmutable($coupon['end_date']);

        if ($now < $start || $now > $end) {
            Response::send(false, 'Coupon is outside its validity period.', null, 422);
        }

        $subtotal = round((float) $subtotal, 2);

        if ($subtotal < (float) $coupon['min_order_amount']) {
            Response::send(false, 'Order subtotal does not meet the minimum amount.', null, 422);
        }

        $value = (float) $coupon['discount_value'];

        if ($coupon['discount_type'] === 'percentage') {
            if ($value <= 0 || $value > 100) {
                Response::send(false, 'Coupon discount configuration is invalid.', null, 500);
            }

            $discount = $subtotal * ($value / 100);
        } elseif ($coupon['discount_type'] === 'fixed') {
            if ($value <= 0) {
                Response::send(false, 'Coupon discount configuration is invalid.', null, 500);
            }

            $discount = $value;
        } else {
            Response::send(false, 'Coupon discount configuration is invalid.', null, 500);
        }

        $discount = round(min($discount, $subtotal), 2);

        Response::success('Coupon applied successfully.', [
            'code' => $coupon['code'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => $value,
            'discount_amount' => $discount,
            'subtotal' => $subtotal,
            'total_after_discount' => round($subtotal - $discount, 2),
        ]);
    }
}