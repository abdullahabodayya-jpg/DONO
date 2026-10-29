<?php

final class CartHelper
{
    // Calculate the total price of one product
    public static function calculateLineTotal(
        float $price,
        int $quantity
    ): float {
        return round($price * $quantity, 2);
    }

    // Calculate the final cart total
    public static function calculateTotal(
        float $subtotal,
        float $discount,
        float $shipping
    ): float {
        return round($subtotal - $discount + $shipping, 2);
    }
}