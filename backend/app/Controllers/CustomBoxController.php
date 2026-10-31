<?php

declare(strict_types=1);

require_once __DIR__ . '/../Repositories/CartRepository.php';
require_once __DIR__ . '/../services/OrderPricing.php';

/** Database-backed, one-box-per-cart builder. Current product prices are authoritative. */
final class CustomBoxController
{
    public function __construct(private PDO $pdo) {}

    private function userId(): int
    {
        $id = $_SESSION['user']['id'] ?? null;
        if (!filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
            Response::send(false, 'Sign in to save your custom box.', null, 401);
        }
        return (int) $id;
    }

    /** Builder roles are configured in a PHP file, never in new database tables. */
    private static function rolesFile(): string
    {
        return __DIR__ . '/../../config/custom_box_roles.php';
    }

    private static function storedRoles(): array
    {
        $file = self::rolesFile();
        if (!is_file($file)) return [];
        $map = require $file;
        return is_array($map) ? $map : [];
    }

    /** Infer roles from the EXISTING category and product type until admins override them. */
    private static function inferRoles(array $p): array
    {
        $category = strtolower((string)($p['category_name'] ?? ''));
        $name = strtolower((string)($p['name'] ?? ''));
        if ($p['product_type'] === 'custom_box'
            || preg_match('/box|basket|tote|packaging|container/', $category)) return ['box'];
        if (preg_match('/greeting|card|stationery/', $category)) return ['card'];
        if (preg_match('/extras?|addon|add-on|chocolate|flowers?|snack|accessor/', $category)) return ['extra'];
        if (preg_match('/greeting card/', $name)) return ['card'];
        return ['gift'];
    }

    private static function rolesFor(array $product, array $savedRoles): array
    {
        $id = (int)$product['id'];
        if (array_key_exists($id, $savedRoles)) {
            return array_values(array_intersect(['box','gift','extra','card'], (array)$savedRoles[$id]));
        }
        return self::inferRoles($product);
    }

    private function allProducts(bool $activeOnly): array
    {
        $sql = "SELECT p.id,p.name,p.description,p.price,p.stock_quantity,p.product_type,
                       p.is_active,p.deleted_at,c.name AS category_name,
                       (SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id
                        ORDER BY pi.is_primary DESC,pi.id LIMIT 1) AS image_url
                FROM products p JOIN categories c ON c.id=p.category_id";
        if ($activeOnly) $sql .= " WHERE p.is_active=1 AND p.deleted_at IS NULL AND p.stock_quantity>0";
        $sql .= " ORDER BY p.id DESC";
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function catalog(): void
    {
        try {
            $saved = self::storedRoles();
            $grouped = ['box'=>[], 'gift'=>[], 'extra'=>[], 'card'=>[]];
            foreach ($this->allProducts(true) as $p) {
                foreach (self::rolesFor($p,$saved) as $role) $grouped[$role][] = $p;
            }
            Response::success('Custom box catalog.', $grouped);
        } catch (Throwable $e) {
            error_log('Custom box catalog: '.$e->getMessage());
            Response::send(false, 'Unable to load gift box products.', null, 500);
        }
    }

    /** Manage role selections without adding any SQL table or column. */
    public function adminCatalog(): void
    {
        (new AdminMiddleware())->handle();
        try {
            $saved = self::storedRoles();
            $products = $this->allProducts(false);
            foreach ($products as &$p) {
                $p['roles'] = implode(',', self::rolesFor($p,$saved));
            }
            unset($p);
            Response::success('Builder catalog loaded.', $products);
        } catch (Throwable $e) {
            error_log('Admin custom box catalog: '.$e->getMessage());
            Response::send(false,'Unable to load the catalog.',null,500);
        }
    }

    public function adminAssign(): void
    {
        (new AdminMiddleware())->handle();
        $data=json_decode((string)file_get_contents('php://input'),true);
        $id=filter_var($data['product_id']??null,FILTER_VALIDATE_INT);
        $role=$data['role']??null;
        $enabled=$data['enabled']??null;
        if (!$id || $id<1 || !in_array($role,['box','gift','extra','card'],true) || !is_bool($enabled)) {
            Response::send(false,'Valid product, builder role and enabled flag are required.',null,422);
        }
        $p=$this->pdo->prepare('SELECT p.id,p.name,p.product_type,c.name AS category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=? AND p.deleted_at IS NULL');
        $p->execute([$id]);
        $product=$p->fetch(PDO::FETCH_ASSOC);
        if (!$product) Response::send(false,'Product not found.',null,404);
        $file=self::rolesFile();
        $lock=fopen($file.'.lock','c');
        if (!$lock || !flock($lock,LOCK_EX)) Response::send(false,'Cannot lock custom box settings.',null,500);
        try {
            // Re-read after locking, so concurrent admin requests cannot overwrite each other.
            $saved=self::storedRoles();
            $roles=self::rolesFor($product,$saved);
            if ($enabled) { if (!in_array($role,$roles,true)) $roles[]=$role; }
            else $roles=array_values(array_diff($roles,[$role]));
            $saved[(int)$id] = array_values(array_intersect(['box','gift','extra','card'],$roles));
            $content="<?php\nreturn ".var_export($saved,true).";\n";
            $target=fopen($file,'c+');
            if (!$target || !flock($target,LOCK_EX)) throw new RuntimeException('Cannot write roles configuration.');
            try {
                if (!ftruncate($target,0) || rewind($target) === false
                    || fwrite($target,$content) !== strlen($content)) throw new RuntimeException('Cannot save roles configuration.');
                fflush($target);
            } finally {
                flock($target, LOCK_UN);
                fclose($target);
            }
            if (function_exists('opcache_invalidate')) @opcache_invalidate($file,true);
            Response::success('Builder catalog updated.');
        } catch (Throwable $e) {
            error_log('Custom box roles save: '.$e->getMessage());
            Response::send(false,'Unable to save roles in backend/config. Check folder permissions.',null,500);
        } finally {
            flock($lock,LOCK_UN); fclose($lock);
        }
    }

    private static function text(mixed $value, int $max): string
    {
        if (!is_string($value)) throw new DomainException('Invalid text field.');
        $value = trim($value);
        if ((function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value)) > $max) throw new DomainException('A personalization field is too long.');
        return $value;
    }

    public function addToCart(): void
    {
        $userId = $this->userId();
        $data = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($data) || !filter_var($data['box_product_id'] ?? null, FILTER_VALIDATE_INT)
            || !isset($data['items']) || !is_array($data['items'])) {
            Response::send(false, 'Choose a box and at least one gift.', null, 422);
        }
        $boxId = (int) $data['box_product_id'];
        $lines = $data['items'];
        if (count($lines) < 1 || count($lines) > 30) {
            Response::send(false, 'Choose between 1 and 30 gift items.', null, 422);
        }
        try {
            $personal = $data['personalization'] ?? [];
            $card = $data['card'] ?? [];
            if (!is_array($personal) || !is_array($card)) throw new DomainException('Invalid customization.');
            $cleanPersonal = [
                'customize_items' => ($personal['customize_items'] ?? 'no') === 'yes' ? 'yes' : 'no',
                'initials' => self::text($personal['initials'] ?? '', 120),
                'ribbon_color' => self::text($personal['ribbon_color'] ?? '', 40),
                'font' => self::text($personal['font'] ?? '', 50),
                'font_color' => self::text($personal['font_color'] ?? '', 40),
                'delivery_date' => self::text($personal['delivery_date'] ?? '', 10),
                'notes' => self::text($personal['notes'] ?? '', 1500),
                'favorite_brand' => self::text($personal['favorite_brand'] ?? '', 100),
                'photo_url' => self::text($personal['photo_url'] ?? '', 255),
            ];
            if ($cleanPersonal['customize_items'] !== 'yes') {
                foreach (['initials','ribbon_color','font','font_color','photo_url'] as $field) {
                    $cleanPersonal[$field] = '';
                }
            }
            if ($cleanPersonal['delivery_date'] !== '') {
                $date = DateTimeImmutable::createFromFormat('!Y-m-d', $cleanPersonal['delivery_date']);
                if (!$date || $date->format('Y-m-d') !== $cleanPersonal['delivery_date']
                    || $date < new DateTimeImmutable('today')) throw new DomainException('Choose a valid future delivery date.');
            }
            if ($cleanPersonal['photo_url'] !== '' && !str_starts_with($cleanPersonal['photo_url'],
                '/uploads/custom-box/' . $userId . '/')) throw new DomainException('Photo must belong to your account.');
            if ($cleanPersonal['photo_url'] !== '') {
                $filename = basename($cleanPersonal['photo_url']);
                if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $filename)
                    || !is_file(__DIR__ . '/../../public/uploads/custom-box/' . $userId . '/' . $filename)) {
                    throw new DomainException('Your uploaded photo could not be verified. Upload it again.');
                }
            }
            $cleanCard = [
                'occasion' => self::text($card['occasion'] ?? '', 60),
                'placement' => self::text($card['placement'] ?? '', 40),
                'message' => self::text($card['message'] ?? '', 1000),
                'add_sender_name' => ($card['add_sender_name'] ?? 'no') === 'yes' ? 'yes' : 'no',
                'sender_name' => self::text($card['sender_name'] ?? '', 100),
            ];
            $requested = [['id'=>$boxId,'role'=>'box','quantity'=>1]];
            $giftCount = 0;
            $cardCount = 0;
            $seen = [$boxId => 1];
            $cleanLines = [];
            foreach ($lines as $line) {
                if (!is_array($line) || !in_array($line['role'] ?? null, ['gift','extra','card'], true)) {
                    throw new DomainException('Invalid gift item role.');
                }
                $id = filter_var($line['product_id'] ?? null, FILTER_VALIDATE_INT);
                $qty = filter_var($line['quantity'] ?? null, FILTER_VALIDATE_INT);
                if (!$id || $id < 1 || !$qty || $qty < 1 || $qty > 10 || isset($seen[$id])) {
                    throw new DomainException('Invalid, repeated, or oversized gift selection.');
                }
                $seen[$id] = $qty;
                $giftCount += $line['role'] === 'gift' ? 1 : 0;
                $cardCount += $line['role'] === 'card' ? 1 : 0;
                $cleanLines[] = ['product_id'=>(int)$id,'quantity'=>(int)$qty,'role'=>$line['role']];
                $requested[] = ['id'=>(int)$id,'role'=>$line['role'],'quantity'=>(int)$qty];
            }
            if (!$giftCount || $cardCount > 1) throw new DomainException('Pick a gift and at most one card.');
            foreach ($cleanLines as $line) {
                if ($line['role'] === 'card' && $line['quantity'] !== 1) throw new DomainException('Select only one greeting card.');
            }
            if ($cardCount && (!$cleanCard['message'] || !$cleanCard['occasion'])) {
                throw new DomainException('Select a card occasion and enter its message.');
            }
            if ($cardCount && $cleanCard['add_sender_name'] === 'yes' && !$cleanCard['sender_name']) {
                throw new DomainException('Enter the sender name or select No.');
            }
            if ($cleanCard['add_sender_name'] !== 'yes') $cleanCard['sender_name'] = '';

            $this->pdo->beginTransaction();
            // Lock cart first, same order as Stripe checkout and OrderPricing.
            $cartRepo = new CartRepository($this->pdo);
            $cart = $cartRepo->getCartByUserId($userId);
            $orderId = $cart ? (int)$cart['id'] : $cartRepo->createCart($userId);
            $lockCart = $this->pdo->prepare("SELECT id FROM orders WHERE id=? AND user_id=? AND status='cart' FOR UPDATE");
            $lockCart->execute([$orderId,$userId]);
            if (!$lockCart->fetchColumn()) throw new LogicException('Your cart is no longer editable.');
            $already = $this->pdo->prepare("SELECT 1 FROM custom_orders b JOIN order_items oi ON oi.id=b.order_item_id WHERE oi.order_id=? AND b.prompt LIKE 'DONO_CUSTOM_BOX_V1:%' LIMIT 1");
            $already->execute([$orderId]);
            if ($already->fetchColumn()) throw new LogicException('Only one custom box per cart is supported. Remove the current box first.');
            $conflict = $this->pdo->prepare('SELECT id FROM order_items WHERE order_id=? AND product_id=? LIMIT 1');
            $conflict->execute([$orderId,$boxId]);
            if ($conflict->fetchColumn()) throw new LogicException('This box already exists as a regular cart item. Remove it first.');

            $lockedProducts = [];
            $savedRoles = self::storedRoles();
            $lookup = $this->pdo->prepare(
                "SELECT p.id,p.name,p.price,p.stock_quantity,p.product_type,c.name AS category_name
                 FROM products p JOIN categories c ON c.id=p.category_id
                 WHERE p.id=:id AND p.is_active=1 AND p.deleted_at IS NULL FOR UPDATE"
            );
            $totalCents = 0;
            foreach ($requested as $line) {
                $lookup->execute(['id'=>$line['id']]);
                $p = $lookup->fetch(PDO::FETCH_ASSOC);
                if (!$p || !in_array($line['role'], self::rolesFor($p,$savedRoles),true) || (int)$p['stock_quantity'] < $line['quantity']) {
                    throw new DomainException('A selected item is unavailable or out of stock.');
                }
                $cents = OrderPricing::toMinor((string)$p['price']);
                if ($cents < 0) throw new DomainException('Invalid catalog price.');
                $totalCents += $cents * $line['quantity'];
                $lockedProducts[$line['id']] = $p;
            }
            if ($totalCents <= 0) throw new DomainException('The custom box total must be greater than zero.');
            if ($totalCents > 9999999999) throw new DomainException('Custom box amount is too high.');

            $amount = number_format($totalCents/100,2,'.','');
            $insert = $this->pdo->prepare('INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity,line_total) VALUES (?,?,?,?,1,?)');
            $insert->execute([$orderId,$boxId,'Custom Box — '.$lockedProducts[$boxId]['name'],$amount,$amount]);
            $orderItemId = (int)$this->pdo->lastInsertId();
            $insertChild = $this->pdo->prepare('INSERT INTO gift_box_items (order_item_id,product_id,quantity,unit_price) VALUES (?,?,?,?)');
            foreach ($cleanLines as $line) {
                $p = $lockedProducts[$line['product_id']];
                $insertChild->execute([$orderItemId,$line['product_id'],$line['quantity'],$p['price']]);
            }
            $cfg = json_encode(['box_product_id'=>$boxId,'items'=>$cleanLines,'personalization'=>$cleanPersonal,'card'=>$cleanCard], JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
            $this->pdo->prepare("INSERT INTO custom_orders (user_id,product_id,order_item_id,prompt,status) VALUES (?,?,?,?, 'pending')")
                ->execute([$userId,$boxId,$orderItemId,'DONO_CUSTOM_BOX_V1:'.$cfg]);
            $savedCoupon = $this->pdo->prepare('SELECT c.code FROM orders o LEFT JOIN coupons c ON c.id=o.coupon_id WHERE o.id=?');
            $savedCoupon->execute([$orderId]);
            $coupon = $savedCoupon->fetchColumn() ?: null;
            try {
                (new OrderPricing($this->pdo))->recalculate($orderId, $coupon);
            } catch (DomainException $e) {
                if (!$coupon) throw $e;
                (new OrderPricing($this->pdo))->recalculate($orderId,null);
            }
            $this->pdo->commit();
            Response::success('Your custom box has been added to the cart.', ['order_id'=>$orderId,'order_item_id'=>$orderItemId],201);
        } catch (DomainException $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Response::send(false,$e->getMessage(),null,422);
        } catch (LogicException $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Response::send(false,$e->getMessage(),null,409);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            error_log('Custom box save failed: '.$e->getMessage());
            Response::send(false,'Unable to save your custom box. Check the Apache error log.',null,500);
        }
    }

    public function upload(): void
    {
        $userId=$this->userId();
        $file=$_FILES['photo'] ?? null;
        if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || (int)($file['size'] ?? 0) < 1 || (int)$file['size'] > 10*1024*1024
            || !is_uploaded_file((string)($file['tmp_name']??''))) {
            Response::send(false,'Upload a valid image of at most 10 MB.',null,422);
        }
        $type=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
        if (!isset($allowed[$type]) || @getimagesize($file['tmp_name']) === false) {
            Response::send(false,'Only JPG, PNG, and WebP image files are supported.',null,422);
        }
        $folder=__DIR__.'/../../public/uploads/custom-box/'.$userId;
        if (!is_dir($folder) && !mkdir($folder,0755,true) && !is_dir($folder)) {
            Response::send(false,'Image storage is unavailable.',null,500);
        }
        $name=bin2hex(random_bytes(16)).'.'.$allowed[$type];
        if (!move_uploaded_file($file['tmp_name'],$folder.'/'.$name)) {
            Response::send(false,'Unable to save the uploaded image.',null,500);
        }
        Response::success('Photo uploaded.', ['photo_url'=>'/uploads/custom-box/'.$userId.'/'.$name],201);
    }
}
