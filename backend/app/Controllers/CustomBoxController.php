<?php

namespace App\Controllers;

use App\Repositories\CustomBoxRepository;
use App\Core\Response;
use PDO;
use Throwable;

class CustomBoxController
{
    private CustomBoxRepository $repository;

    public function __construct(PDO $db)
    {
        $this->repository = new CustomBoxRepository($db);
    }

    public function getBuilderData(): void
    {
        try {
            $boxes      = $this->repository->getProductsByCategory('box');
            $cards      = $this->repository->getProductsByCategory('card');
            $categories = $this->repository->getGiftCategories();
            $products   = $this->repository->getGiftProducts();

            Response::success('Builder data retrieved successfully.', [
                'boxes'      => $boxes,
                'categories' => $categories,
                'products'   => $products,
                'cards'      => $cards
            ]);
        } catch (Throwable $e) {
            Response::send(false, $e->getMessage(), null, 500);
        }
    }

    public function store(): void
    {
        $userId = $_SESSION['user']['id'] ?? null;
        if (!$userId) {
            Response::send(false, 'Unauthorized. Please login first.', null, 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $boxId       = (int) ($input['box_id'] ?? 0);
        $gifts       = $input['gifts'] ?? [];
        $cardId      = !empty($input['card_id']) ? (int) $input['card_id'] : null;

        if ($boxId <= 0) {
            Response::send(false, 'Please select a box first.', null, 422);
        }

        $totalGiftsCount = 0;
        foreach ($gifts as $gift) {
            $totalGiftsCount += (int) ($gift['quantity'] ?? 0);
        }

        if ($totalGiftsCount < 2 || $totalGiftsCount > 6) {
            Response::send(
                false,
                'Please select between 2 and 6 gift items.',
                ['gifts_count' => $totalGiftsCount],
                422
            );
        }

        $boxProduct = $this->repository->findProductById($boxId);
        if (!$boxProduct) {
            Response::send(false, 'Selected box does not exist.', null, 404);
        }

        $boxTotal = (float) $boxProduct['price'];
        $giftBoxItems = [];

        foreach ($gifts as $gift) {
            $prodId = (int) ($gift['product_id'] ?? 0);
            $qty    = (int) ($gift['quantity'] ?? 0);

            if ($prodId > 0 && $qty > 0) {
                $product = $this->repository->findProductById($prodId);
                if ($product) {
                    $unitPrice = (float) $product['price'];
                    $boxTotal += ($unitPrice * $qty);
                    $giftBoxItems[] = [
                        'product_id' => (int) $product['id'],
                        'quantity'   => $qty,
                        'unit_price' => $unitPrice
                    ];
                }
            }
        }

        if ($cardId) {
            $cardProduct = $this->repository->findProductById($cardId);
            if ($cardProduct) {
                $cardPrice = (float) $cardProduct['price'];
                $boxTotal += $cardPrice;
                $giftBoxItems[] = [
                    'product_id' => (int) $cardProduct['id'],
                    'quantity'   => 1,
                    'unit_price' => $cardPrice
                ];
            }
        }

        $orderItemId = $this->repository->saveCustomBoxOrder((int) $userId, $boxProduct, $giftBoxItems, $boxTotal);

        if (!$orderItemId) {
            Response::send(false, 'Failed to save custom box order.', null, 500);
        }

        Response::success('Custom box added to cart successfully.', [
            'order_item_id' => $orderItemId,
            'box_total'     => $boxTotal,
            'items_count'   => count($giftBoxItems)
        ], 201);
    }
}