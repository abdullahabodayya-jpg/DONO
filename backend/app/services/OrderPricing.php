<?php

declare(strict_types=1);

/** Server-authoritative cart pricing (all monetary calculations in JOD fils / 0.01 JOD increments). */
final class OrderPricing
{
    public function __construct(private PDO $pdo) {}

    public static function toMinor(string|float|int $amount): int
    {
        // Schema uses DECIMAL(10,2), so 1 JOD = 100 database price units.
        return (int) round((float) $amount * 100);
    }

    /** Requires caller to hold the order row lock in a transaction. */
    public function recalculate(int $orderId, ?string $couponCode): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT oi.id, oi.quantity, p.name, p.price, p.stock_quantity, p.is_active, p.deleted_at
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :id FOR UPDATE'
        );
        $stmt->execute(['id' => $orderId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $totalCount = $this->pdo->prepare('SELECT COUNT(*) FROM order_items WHERE order_id = ?');
        $totalCount->execute([$orderId]);
        if (!$items || count($items) !== (int) $totalCount->fetchColumn()) {
            throw new DomainException('Your cart is empty or contains unavailable products.');
        }

        $subtotalCents = 0;
        $itemUpdate = $this->pdo->prepare(
            'UPDATE order_items SET product_name = :name, unit_price = :price, line_total = :total WHERE id = :id'
        );
        foreach ($items as $item) {
            if ((int) $item['is_active'] !== 1 || $item['deleted_at'] !== null
                || (int) $item['quantity'] < 1 || (int) $item['stock_quantity'] < (int) $item['quantity']) {
                throw new DomainException('A product in your cart is no longer available in the requested quantity.');
            }
            $unit = self::toMinor($item['price']);
            if ($unit <= 0) {
                throw new DomainException('A product has an invalid price.');
            }
            $line = $unit * (int) $item['quantity'];
            $subtotalCents += $line;
            $itemUpdate->execute([
                'name' => $item['name'], 'price' => number_format($unit / 100, 2, '.', ''),
                'total' => number_format($line / 100, 2, '.', ''), 'id' => $item['id'],
            ]);
        }

        $couponId = null;
        $discountCents = 0;
        if ($couponCode !== null && trim($couponCode) !== '') {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM coupons WHERE code = :code AND is_active = 1
                  AND start_date <= NOW() AND end_date >= NOW() LIMIT 1'
            );
            $stmt->execute(['code' => trim($couponCode)]);
            $coupon = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$coupon || $subtotalCents < self::toMinor($coupon['min_order_amount'])) {
                throw new DomainException('Coupon is invalid, expired, or does not meet the minimum order amount.');
            }
            $value = (float) $coupon['discount_value'];
            if ($coupon['discount_type'] === 'percentage' && $value > 0 && $value <= 100) {
                $discountCents = (int) round($subtotalCents * $value / 100);
            } elseif ($coupon['discount_type'] === 'fixed' && $value > 0) {
                $discountCents = self::toMinor($coupon['discount_value']);
            } else {
                throw new DomainException('Coupon has invalid settings.');
            }
            $discountCents = min($discountCents, $subtotalCents);
            $couponId = (int) $coupon['id'];
        }

        $stmt = $this->pdo->prepare('SELECT shipping_fee FROM orders WHERE id = ?');
        $stmt->execute([$orderId]);
        $shippingCents = self::toMinor((string) $stmt->fetchColumn());
        if ($shippingCents < 0) {
            throw new DomainException('Invalid shipping fee.');
        }
        $totalCents = $subtotalCents - $discountCents + $shippingCents;
        if ($totalCents <= 0) {
            throw new DomainException('Zero-value orders need a separate free-checkout flow.');
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders SET coupon_id=:coupon, subtotal=:subtotal, discount_amount=:discount,
             total_amount=:total WHERE id=:id AND status = \'cart\''
        );
        $stmt->execute([
            'coupon' => $couponId, 'subtotal' => number_format($subtotalCents / 100, 2, '.', ''),
            'discount' => number_format($discountCents / 100, 2, '.', ''),
            'total' => number_format($totalCents / 100, 2, '.', ''), 'id' => $orderId,
        ]);
        return ['total_minor' => $totalCents * 10, 'amount' => number_format($totalCents / 100, 2, '.', '')];
    }
}
