# DONO — تقرير نسخة الإصلاح والتكامل الثانية

التاريخ: 31 أكتوبر 2026

## النتيجة
تم تعديل نسخة `DONO-Full-Integration-GenZ-Review(1).zip` انطلاقًا من هيكلها الحالي، مع الاحتفاظ بأسماء الملفات والفولدرات الموجودة، وعدم استبدال واجهات الأدمن الأصلية بتصميم الـ Customer الجديد. النسخة **مُعدّة للاختبار المحلي**، وليس مُثبتًا أنها تعمل بالكامل مع MySQL أو Stripe.

## التغييرات المنفذة بالفعل

### المصادقة
- تعديل `AuthController::register()` لإنشاء Session مصادقة تلقائيًا بعد حفظ المستخدم الجديد في MySQL، مع معالجة التكرار عند تعارض البريد الإلكتروني في قاعدة البيانات.
- نقل توجيه العملاء بعد التسجيل أو تسجيل الدخول إلى `frontend/products.html` (Explore)، وتوجيه الأدمن إلى `frontend/admin/index.html`.
- تعديل Google Callback الناجح للتوجيه حسب الدور، مع بقاء Google OAuth بحاجة إلى إعداد واختبار.
- إصلاح كلاس `d-none` الخاص بإظهار أخطاء المصادقة، وتحسين رسائل أخطاء الـ API ومنع الضغط المتكرر على زر الإرسال.
- تعزيز واجهة الأدمن بفحص واجهي للحساب على جميع صفحات الأدمن الثمانية؛ الحماية الأساسية تبقى في Middleware الخلفي.

### Explore وتجربة العميل
- استبدال `frontend/products.html` بواجهة اكتشاف مبنية على Search Bar بارز وفلاتر Category / Age / Gift Type.
- نقل البحث والفلاتر إلى استعلامات MySQL في `ProductRepository` و`ProductController` قبل الـ Pagination، بدل البحث ضمن صفحة المنتجات الحالية فقط.
- إضافة شريط تصنيفات Sticky متزامن مع فلتر الـ Category.
- إضافة Flip Cards بتصميم 3D، وجه أمامي بالصورة واسم المنتج، ووجه خلفي بالسعر والوصف وروابط Details وCart وWishlist، مع زر للرجوع ودعم الكيبورد ومراعاة تقليل الحركة.
- إضافة Sidebar مشتركة لصفحات العملاء: أيقونات بشكل افتراضي، توسّع عند Hover/Focus، وDrawer على الموبايل، مع Avatar من جلسة المستخدم.
- إضافة شعار SVG أصلي باسم `dono-mark.svg` وهوية Wordmark متحركة في الـ Landing.
- إضافة طبقة تنسيق Customer فقط إلى الصفحات الموجودة دون تغيير IDs أو روابط Backend الخاصة بها.

### User Profile
- إنشاء `frontend/profile.html` و`frontend/assets/js/pages/profile.js`.
- إضافة `ProfileController` مع `GET /api/profile` و`PUT /api/profile` و`POST /api/profile/password`.
- عرض/تعديل الاسم والبريد والهاتف والعنوان، والتحقق من كلمة المرور الحالية عند تغيير البريد، وتغيير كلمة المرور مع حماية الـ Session.
- عدم تخزين بيانات بطاقات دفع حساسة؛ Saved Cards غير متوفرة حتى وجود Stripe Customer flow فعلي.

### Age Filter
- إضافة `backend/database/migration_product_age.sql` لإنشاء حقلي `age_min` و`age_max`، وإضافة مدخلات لهما في صفحة Product Management بالأدمن.
- **مهم:** العمر غير موجود في Schema الأصلي. يجب تنفيذ Migration وتصنيف المنتجات بالعمر الصحيح. المنتجات التي تظل قيم عمرها `NULL` تظهر عند اختيار All ages فقط. لا توجد تصنيفات عمر مختلقة.

### الأدمن والدفع
- الحفاظ على CSS المرجعي الأصلي الخاص بـ `dono-product-details` وعدم تطبيق طبقة `admin-brand.css` التي غيّرت هوية الأدمن في النسخة السابقة.
- إضافة تنسيق محدود للصفحات الإدارية المضافة سابقًا (Categories / Users / Payments / Logs) مستوحى من لون المرجع.
- الحفاظ على `StripePaymentController`, `OrderPricing`, `payment-routes.php`, Cart Checkout وRefund routes؛ لم يتم استبدال بوابة الدفع أو الادعاء بأنها تعمل بدون إعداد الـ SDK والـ Webhook.
- تصحيح عرض حالة Refund في واجهة الأدمن.

## الفحوصات التي نُفّذت

| الفحص | النتيجة |
|---|---|
| PHP syntax (`php -l`) | PASS: 40 ملفات |
| JavaScript syntax (`node --check`) | PASS: 23 ملفات |
| HTML local asset/href/src existence | PASS: 147 مرجع محلي في 27 صفحة، 0 مراجع مفقودة بالفحص الثابت |
| حساب JOD من وحدات Stripe باستخدام `OrderPricing::toMinor` | PASS: 12.34 JOD → 12340 فلسًا |
| تسجيل فعلي في MySQL وتسجيل الدخول والـ Sessions | NOT EXECUTED: لا يتوفر `pdo_mysql` أو خادم MySQL هنا |
| Checkout عبر Stripe Test mode، webhook، وRefund | NOT EXECUTED: لا تتوفر المفاتيح التجريبية أو Stripe SDK مثبتة أو Stripe CLI موصول |
| User Profile على قاعدة بيانات حقيقية | NOT EXECUTED |
| اختبار بصري تفاعلي في Browser | NOT EXECUTED: منع التشغيل المحلي من بيئة المتصفح |
| Google Sign-In عبر OAuth | NOT EXECUTED |
| إدارة الأدمن الفعلية على MySQL | NOT EXECUTED |

**هذه النسخة ليست نسخة Production أو نسخة مؤكدة النجاح End-to-End بعد.**

## خطوات التشغيل على Windows / XAMPP

1. فك الملف داخل `C:\xampp\htdocs\DONO` بحيث تتوفر الملفات تحت `C:\xampp\htdocs\DONO\frontend` و`...\backend`.
2. شغّل Apache وMySQL من XAMPP.
3. تأكّد من إنشاء قاعدة `dono` واستيراد `backend/database/schema.sql` **في قاعدة فارغة فقط**. في حال وجود قاعدة حالية، خذ Backup **ولا تعيد استيراد Schema فوقها**.
4. نفّذ على قاعدة موجودة، عند الحاجة، الـ migrations التالية فقط بعد مراجعة بنية الجداول الحالية: `backend/database/migration_stripe_refunds.sql` و`backend/database/migration_admin_logs.sql` و`backend/database/migration_product_age.sql` (كل Migration مرة واحدة).
5. أنشئ `backend/config/config.php` من نسخة `backend/config/config.example.php`، مع تعبئة إعدادات قاعدة البيانات الصحيحة، وتعديل `app.frontend_url` إلى `http://localhost/DONO/frontend` أو مسار المجلد الفعلي.
6. من PowerShell داخل `backend` نفذ `composer install` لتثبيت Stripe SDK من `composer.lock`. (المجلد `vendor` غير مشمول.)
7. استخدم **Stripe Test keys** في `config.php` فقط، وليس في JavaScript. لتجربة Webhook محليًا استخدم Stripe CLI مع `stripe listen --forward-to http://localhost/DONO/backend/public/api/webhook/stripe` وضع قيمة `whsec_...` الناتجة في إعدادات Webhook.
8. افتح `http://localhost/DONO/frontend/register.html` وأنشئ حسابًا تجريبيًا. تأكّد من ظهوره في جدول `users` ومن الوصول إلى `products.html` مع Session.
9. جرّب Login/Logout/Refresh، ثم Search/Category/Cart/Wishlist/Profile، وبعدها Stripe Test Checkout وWebhook وPayments/Refunds في الأدمن.
10. إذا ظهر رد 404 من API تحقق من Apache `mod_rewrite` و`.htaccess` واسم مجلد المشروع؛ إذا ظهر 500 راجع Apache/PHP error log، وملف config بدون نشر أسراره.

## النقاط المتبقية التي تحتاج تنفيذ/اختبار

- التأكد فعليًا من PHP MySQL driver / DB schema compatibility ومشاركة لقطات الأخطاء إن وجدت.
- Stripe Checkout مع Test Session حقيقية، تأكيد Webhook، Refund بدون أموال حقيقية، ومعالجة الأحداث المتكررة.
- تعيين أعمار مناسبة للمنتجات في قاعدة البيانات بعد الـ Migration.
- اختبار Google OAuth بمفاتيح وRedirect URI صحيحين، ومراجعة حماية OAuth state.
- اختبارات على Chrome/Firefox/Mobile للتحقق من الـ Sidebar والحركة والـ flip والتجاوب.
- عدم توفير Saved Cards UI وهمية؛ تحتاج Stripe customer/payment method integration لاحقًا.
- مراجعة تدفقات إضافية مثل Custom Boxes وGift-specific checkout بصورة مستقلة قبل وصفها بالمكتملة.

## Git / سلامة الفريق

لم يتم تنفيذ Push أو Merge أو أي تعديل على مستودع GitHub. لا ترفع محتويات `backend/config/config.php` أو `.env` أو Stripe secrets. اعمل Integration Branch مستقلًا واختبر على قاعدة تجريبية، ثم راجع الـ Diff قبل طلب الدمج في `develop`.
