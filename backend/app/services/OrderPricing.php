<?php

declare(strict_types=1);

/** Server-authoritative cart pricing in USD cents. */
final class OrderPricing
{
    public function __construct(private PDO $pdo) {}

    public static function toMinor(string|float|int $amount): int
    {
        // Schema uses DECIMAL(10,2); Stripe USD uses 100 cents per dollar.
        return (int) round((float) $amount * 100);
    }

    /** Requires caller to hold the order row lock in a transaction. */
    public function recalculate(int $orderId, ?string $couponCode): array
    {
        $buildSelect = 'cb.id AS custom_build_id, cb.prompt AS configuration_json';
        $buildJoin = "LEFT JOIN custom_orders cb ON cb.order_item_id = oi.id AND cb.prompt LIKE 'DONO_CUSTOM_BOX_V1:%'";
        $stmt = $this->pdo->prepare(
            "SELECT oi.id, oi.quantity, p.name, p.price, p.stock_quantity, p.is_active, p.deleted_at,
                    {$buildSelect}
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             {$buildJoin}
             WHERE oi.order_id = :id FOR UPDATE"
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
            $name = $item['name'];
            if ($item['custom_build_id'] !== null) {
                if ((int)$item['quantity'] !== 1) throw new DomainException('Custom box quantity must be one.');
                $cfg = json_decode(substr((string)$item['configuration_json'], strlen('DONO_CUSTOM_BOX_V1:')), true);
                if (!is_array($cfg) || !isset($cfg['items']) || !is_array($cfg['items'])) {
                    throw new DomainException('Invalid custom box configuration.');
                }
                $children = $this->pdo->prepare(
                    'SELECT g.product_id,g.quantity,p.name,p.price,p.stock_quantity,p.is_active,p.deleted_at
                     FROM gift_box_items g JOIN products p ON p.id=g.product_id
                     WHERE g.order_item_id=? FOR UPDATE'
                );
                $children->execute([(int)$item['id']]);
                $parts = $children->fetchAll(PDO::FETCH_ASSOC);
                if (count($parts) !== count($cfg['items'])) throw new DomainException('Custom box contents changed.');
                $expectedComponents = [];
                foreach ($cfg['items'] as $comp) {
                    $expectedComponents[(int)$comp['product_id']] = (int)$comp['quantity'];
                }
                $updateChild = $this->pdo->prepare('UPDATE gift_box_items SET unit_price=? WHERE order_item_id=? AND product_id=?');
                foreach ($parts as $part) {
                    $pid = (int)$part['product_id'];
                    $qty = (int)$part['quantity'];
                    if (!isset($expectedComponents[$pid]) || $qty !== $expectedComponents[$pid]
                        || (int)$part['is_active'] !== 1 || $part['deleted_at'] !== null
                        || $qty < 1 || (int)$part['stock_quantity'] < $qty) {
                        throw new DomainException('A custom box item is no longer available.');
                    }
                    $childCents = self::toMinor((string)$part['price']);
                    if ($childCents < 0) throw new DomainException('A custom box item has an invalid price.');
                    $unit += $childCents * $qty;
                    $updateChild->execute([number_format($childCents / 100,2,'.',''), $item['id'], $pid]);
                }
                $name = 'Custom Box — ' . $item['name'];
            }
            if ($unit <= 0) throw new DomainException('A product has an invalid price.');
            $line = $unit * (int) $item['quantity'];
            $subtotalCents += $line;
            $itemUpdate->execute([
                'name' => $name, 'price' => number_format($unit / 100, 2, '.', ''),
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

        $stmt = $this->pdo->prepare('SELECT o.shipping_fee, COALESCE(g.wrapping_fee, 0) AS wrapping_fee FROM orders o LEFT JOIN order_gift_details g ON g.order_id = o.id WHERE o.id = ?');
        $stmt->execute([$orderId]);
        $feeRow = $stmt->fetch(PDO::FETCH_ASSOC);
        $shippingCents = self::toMinor((string) ($feeRow['shipping_fee'] ?? 0));
        $wrappingCents = self::toMinor((string) ($feeRow['wrapping_fee'] ?? 0));
        if ($wrappingCents < 0) { throw new DomainException('Invalid wrapping fee.'); }
        if ($shippingCents < 0) {
            throw new DomainException('Invalid shipping fee.');
        }
        $totalCents = $subtotalCents - $discountCents + $shippingCents + $wrappingCents;
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
        return ['total_minor' => $totalCents, 'amount' => number_format($totalCents / 100, 2, '.', '')];
    }
}
