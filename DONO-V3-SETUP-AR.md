# DONO v3 — خطوات التشغيل والتحقق (XAMPP)

هذه نسخة تكامل ومراجعة وليست إثباتًا على نجاح Stripe أو MySQL في جهازك. **خذ نسخة احتياطية من قاعدة `dono` قبل الاستبدال.**

## 1. النسخة المحلية

1. ضع مشروع `DONO` داخل `C:\xampp\htdocs\DONO`، واستبدل الملفات بعد Backup. لا تُعد استيراد `schema.sql` فوق قاعدة بيانات موجودة.
2. شغّل Apache وMySQL من XAMPP.
3. انسخ `backend/config/config.example.php` إلى `backend/config/config.php`، وعدّل بيانات قاعدة البيانات و`app.frontend_url` بحسب مسار مجلدك. **لا ترفع `config.php` إلى Git.**
4. افتح Terminal في `C:\xampp\htdocs\DONO\backend`، ثم شغّل `composer install` (يتطلب Composer مثبتًا على جهازك واتصال إنترنت). يتطلب Stripe PHP SDK امتدادات curl/json/mbstring.
5. أضف مفاتيح Stripe **Test Mode**: `stripe.secret_key` يبدأ بـ `sk_test_` و`stripe.webhook_secret` يبدأ بـ `whsec_`. لا تضع المفاتيح في JavaScript. لا تستخدم Live Mode أثناء الاختبار.
6. إذا بدك تفعّل Refunds في Admin، طبّق **فقط** `backend/database/migration_stripe_refunds.sql` عبر phpMyAdmin مرة واحدة. عرض Payments يعمل بدونها، لكن الاسترداد يتطلبها. لا تحتاج `admin_logs`، فقد أزيلت ميزة Activity Logs الاختيارية.
7. إذا تحتاج تصنيف العمر في Explore ولم تطبّقه سابقًا، راجع `backend/database/migration_product_age.sql` وطبّقه فقط عند الحاجة وبعد النسخ الاحتياطي.
8. شغّل التشخيص المحلي من جذر المشروع:

```powershell
C:\xampp\php\php.exe backend\tools\diagnose.php
```

## 2. روابط مهمة

- دخول الموقع (Landing لأول زائر): `http://localhost/DONO/frontend/`
- Landing مباشرة: `http://localhost/DONO/frontend/landing.html`
- Login: `http://localhost/DONO/frontend/login.html`
- Explore: `http://localhost/DONO/frontend/products.html`
- Admin Dashboard: `http://localhost/DONO/frontend/admin/index.html`
- Admin Orders الجديد: `http://localhost/DONO/frontend/admin/orders.html`
- فحص API بعد تشغيل DB: `http://localhost/DONO/backend/public/api/health`

## 3. التحقق من Webhook تجريبيًا

يحتاج Webhook إمكانية وصول Stripe إلى Apache المحلي. يمكن استخدام Stripe CLI على **جهازك** بعد تسجيل الدخول:

```powershell
stripe listen --forward-to http://localhost/DONO/backend/public/api/webhook/stripe
```

انسخ قيمة `whsec_...` التي يطبعها Stripe CLI إلى `backend/config/config.php`، ثم نفّذ دفعًا تجريبيًا من الواجهة. لا تعتبر نجاح صفحة العودة دليلًا على الدفع؛ تأكد من تحديث `payments.status = succeeded` و`orders.status = confirmed` بعد **Webhook موثّق**.

عند نجاح الدفع، يرجع المستخدم إلى Explore ويظهر Popup بعد التحقق من الـ API. عند الإلغاء، يرجع إلى Cart ويستطيع استكمال Stripe Session الموجودة إذا كانت ما تزال مفتوحة.

## 4. فحوصات عملية ضرورية بعد الإعداد

- سجّل حساب عميل جديد؛ تأكد من وجوده في `users` وأن `password_hash` مشفّر.
- سجّل دخول العميل والأدمن؛ تحقق من Redirect وLogout والعودة إلى Landing.
- أضف منتجين إلى Cart ثم طبّق Coupon حقيقي؛ تحقق من `orders.coupon_id`, `discount_amount`, `total_amount` ومن نفس المبلغ في Stripe Checkout.
- افتح Admin Payments بدون جدول Refunds؛ يجب أن تظهر السجلات إذا كانت موجودة. لتجربة Refund شغّل Migration أولًا، في Test Mode فقط.
- جرّب Categories, Coupons, Users, Orders, Products, Reviews وتأكد من أن كل API يستجيب وأن الـ Modal يعمل.

## تنبيهات

- هذا المشروع **لا يضم مفاتيح Stripe** ولا مجلد Composer `vendor`؛ من الضروري إعدادهما محليًا.
- لا يتم حفظ بطاقة العميل أو CVV داخل قاعدة DONO.
- لم يتم تشغيل MySQL/Stripe End-to-End في بيئة المراجعة، لذلك الاختبارات المتعلقة بها غير منفّذة هنا.
