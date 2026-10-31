<?php

declare(strict_types=1);

require_once __DIR__ . '/../Repositories/CartRepository.php';

/** Order-level gift details and wrapping. Existing order_gift_details has UNIQUE(order_id). */
final class GiftController
{
    private const WRAPPING = ['Basic Wrapping' => '0.00', 'Premium Wrapping' => '3.00'];
    public function __construct(private PDO $pdo) {}

    private function userId(): int
    {
        $id = filter_var($_SESSION['user']['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $id < 1) Response::send(false, 'Login required.', null, 401);
        return (int) $id;
    }

    public function show(): void
    {
        $id = $this->userId();
        $sql = "SELECT g.* FROM order_gift_details g JOIN orders o ON o.id=g.order_id
                WHERE o.user_id=? AND o.status='cart' ORDER BY o.id DESC LIMIT 1";
        $stmt=$this->pdo->prepare($sql);
        $stmt->execute([$id]);
        Response::success('Gift settings loaded.', $stmt->fetch(PDO::FETCH_ASSOC) ?: null);
    }

    public function save(): void
    {
        $userId = $this->userId();
        $body = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($body)) Response::send(false, 'Invalid gift details.', null, 422);

        $gift = ($body['send_as_gift'] ?? false) === true;
        $wrap = $body['wrapping_type'] ?? 'Basic Wrapping';
        if (!is_string($wrap) || !array_key_exists($wrap, self::WRAPPING)) {
            Response::send(false, 'Unknown wrapping option.', null, 422);
        }
        $fields = [];
        foreach (['recipient_name'=>100, 'recipient_phone'=>20, 'recipient_address'=>255, 'gift_message'=>2000] as $key=>$max) {
            $v = $body[$key] ?? '';
            if (!is_string($v) || strlen(trim($v)) > $max) Response::send(false, 'Invalid '.$key.'.', null, 422);
            $fields[$key] = trim($v);
        }
        if ($gift && (!$fields['recipient_name'] || !$fields['recipient_phone'] || !$fields['recipient_address'])) {
            Response::send(false, 'Recipient name, phone, and address are required.', null, 422);
        }
        // Price is server authoritative; ignore user-provided wrapping_fee/total.
        $fee = self::WRAPPING[$wrap];
        try {
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare("SELECT id FROM orders WHERE user_id=? AND status='cart' ORDER BY id DESC LIMIT 1 FOR UPDATE");
            $stmt->execute([$userId]);
            $orderId=(int)$stmt->fetchColumn();
            if (!$orderId) throw new DomainException('Add a product to your cart first.');
            if (!$gift && $wrap === 'Basic Wrapping') {
                $this->pdo->prepare('DELETE FROM order_gift_details WHERE order_id=?')->execute([$orderId]);
            } else {
                $stmt=$this->pdo->prepare("INSERT INTO order_gift_details
                    (order_id,recipient_name,recipient_phone,recipient_address,gift_message,hide_price,wrapping_type,wrapping_fee)
                    VALUES (?,?,?,?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE recipient_name=VALUES(recipient_name),recipient_phone=VALUES(recipient_phone),
                     recipient_address=VALUES(recipient_address),gift_message=VALUES(gift_message),
                     hide_price=VALUES(hide_price),wrapping_type=VALUES(wrapping_type),wrapping_fee=VALUES(wrapping_fee)");
                $stmt->execute([$orderId,$gift?$fields['recipient_name']:'',$gift?$fields['recipient_phone']:'',
                    $gift?$fields['recipient_address']:'',$gift?$fields['gift_message']:'',
                    $gift && ($body['hide_price'] ?? true) !== false ? 1:0,$wrap,$fee]);
            }
            (new CartRepository($this->pdo))->updateCartTotal($orderId);
            $this->pdo->commit();
            Response::success('Gift settings saved.', ['wrapping_fee'=>$fee, 'send_as_gift'=>$gift]);
        } catch (DomainException $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Response::send(false,$e->getMessage(),null,422);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            error_log('Gift settings: '.$e->getMessage());
            Response::send(false,'Could not save gift settings.',null,500);
        }
    }
}
