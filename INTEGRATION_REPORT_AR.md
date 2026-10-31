# DONO — تقرير دمج النسخة التجريبية

**المدخلات:** `dono-product-details(1).zip` كأساس للمشروع، و`DONO-leen-landing.zip` كمرجع للـ Landing Page والتصميم والصور.

**حالة التسليم:** نسخة Integration للاختبار والمراجعة؛ **ليست نسخة Production معتمدة**. لم يتم تعديل مستودع Git أو رفع Commit أو Merge.

## 1. التغييرات المنفذة

### تصميم وربط الواجهة
- اعتماد `frontend/landing.html` و`frontend/assets/css/landing.css` و`frontend/assets/js/landing.js` من نسخة Leen مع صورها. تم الحفاظ على أسماء مسارات الملفات الأصلية، وإضافة أسماء ملفات مساعدة لبعض الصور التي كانت تحتوي على مسافات أو اختلافات في الاسم.
- إصلاح روابط Landing Page: تسجيل الدخول، التسجيل، تصفح المنتجات، ونموذج إدخال البريد. إزالة ادعاءات عن وظائف Wishlist غير موجودة فعليًا.
- تحويل `frontend/index.html` الفارغة إلى مدخل يحوّل إلى `landing.html`.
- تنفيذ `frontend/products.html` بدل الصفحة الفارغة، مع JavaScript وCSS جديدين يعرضان المنتجات من `/api/products`، التصنيفات من `/api/categories`، البحث والتصفية والتنقل بين صفحات نتائج الـ API، وربط Add to Cart وWishlist بمساراتهما الفعلية.
- توحيد API base paths نسبيًا حسب موضع الملفات، بدل مسارات مثبتة على أسماء XAMPP قديمة؛ وإصلاح مسارات صور `/uploads/products/...` لتشير إلى `backend/public/uploads/products` في صفحات المنتجات والتفاصيل والكارت والويشليست والأدمن.
- ربط زر Checkout الموجود في `cart.js` بـ `/api/payments/checkout` وتمرير كود الخصم فقط، وليس السعر من المتصفح.
- تحويل Add to Cart / Buy Now / Wishlist في تفاصيل المنتجات من `localStorage` التجريبي إلى الـ APIs الفعلية.

### Admin — هوية Gen Z / Maximalist
- إضافة طبقة `frontend/assets/css/admin-brand.css` فوق CSS الموجود بدل استبدال ملفات الفريق. اعتمدت الأخضر الغامق `#00341e`، النعناعي `#55e06f`، الوردي `#ffc4f8`، الأصفر `#fff8b6`، والأزرق `#cce1ff` من Landing Leen، مع خطوط Archivo وWork Sans.
- تطبيق الهوية على Dashboard وProducts وReviews وCoupons وOrders القائمة، مع إبقاء IDs وJS hooks الأصلية.
- إنشاء الصفحات الناقصة `frontend/admin/categories.html` و`users.html` و`payments.html` و`logs.html`، وربطها بالـ Sidebar.
- ربط Orders بمسار صفحة `frontend/admin-orders.html` الموجودة مسبقًا بدل إنشاء صفحة Orders مكررة.
- صفحة Categories تدعم عرض وإضافة وتعديل وحذف التصنيفات الفارغة، باستخدام **أعمدة الجدول الفعلية** (`id`, `name`, `description`, `image`, `deleted_at`) من دون افتراض وجود `is_active` في categories.
- صفحة Users تستخدم الـ UserController الموجود، وتعرض بيانات الطلبات المؤكدة والمجموع مع البحث والفلترة للنتائج المحمّلة.
- صفحة Payments تعرض Stripe payments وتتيح طلب استرداد كامل للمدفوعات الناجحة بعد تأكيد صريح من الأدمن؛ المسار الخلفي يفرض دور الأدمن.
- صفحة Logs تعرض العمليات المسجلة من خادم النظام عند توفر جدول السجلات.

### Backend
- إضافة تسجيل مسارات `auth-routes.php` و`category-routes.php` وربط `payment-routes.php` داخل `backend/routes/api.php`. الحفاظ على مسارات REST وأسماء الدوال الموجودة.
- إصلاح استخدام صنف `Response` في AuthController، وتوافق `completeProfile()` مع توقيع UserRepository، والاستعلام من عمود `updated_at` غير الموجود في Schema `users`.
- منع تعطيل التحقق من TLS أثناء Google OAuth، مع رسائل خطأ إعدادات واضحة عند عدم ضبط Google.
- تحديث استعلام قائمة المستخدمين ليشمل عدد الطلبات ومبالغ الطلبات المؤكدة.
- توفير `AdminLogger` و`AdminLogController` اللازمين لتشغيل مسارات الدفع، مع Migration إضافي **غير هدّام** لسجلات الأدمن.
- توسيع مثال `backend/config/config.example.php` بالمفاتيح المطلوبة لإعداد Google وStripe و`frontend_url` دون مفاتيح فعلية.

## 2. حدود التنفيذ والوظائف التي تحتاج عملًا إضافيًا

1. **الـ Gift customization:** واجهة تفاصيل المنتجات تحتوي خيارات Gift recipient / wrapping / AI design من عمل الفريق. لم يتم نقل هذه الخيارات إلى قاعدة البيانات أو Stripe Checkout لأن هذا يتطلب تطويرًا ماليًا يضمن تسعيرها وتخزينها عند إنشاء الطلب؛ **بدلاً من تجاهلها أو محاسبة الزبون بشكل خاطئ، يمنع المسار الحقيقي إضافة المنتجات بهذه الخيارات المدفوعة أو المخصّصة وينبّه المستخدم**. المنتجات القياسية يمكن إضافتها للكارت عبر الـ API.
2. **صور المنتجات:** تم إصلاح مسارات الصور التي يرفعها `ProductImageController`، ولكن التأكد من وجود صور منتجات فعلية يعتمد على DB ومجلد uploads المحلي.
3. **الـ Admin Logs:** يتطلب تشغيل `backend/database/migration_admin_logs.sql`؛ لا يدّعي النظام وجود سجلات غير مخزنة.
4. **Google OAuth:** يحتاج Client ID/Secret وRedirect URI صحيحة. تم إصلاح خلل الـ PHP / TLS، ولكن لم يُنفّذ اختبار OAuth حقيقي.
5. **Stripe:** يعتمد على حزمة Composer، مفاتيح Test، webhook موقّع، و`migration_stripe_refunds.sql` في قاعدة بيانات التشغيل. لم تُنفذ عملية Charge أو Refund أو Webhook حقيقية في هذه البيئة.
6. **التكامل الشامل:** بعض الوظائف المعقدة الموجودة سابقًا في المشروع (AI customization، send-as-gift، custom box، التحقق البصري على المتصفح) ما زالت بحاجة لاختبارات E2E وربط حسب الـ Business Rules؛ لا يجوز اعتبار هذه النسخة منتهية لمجرد أن الفحوصات الثابتة نجحت.
7. **الأمان:** واجهات HTML يمكن فتحها مباشرة، لكن المسارات الإدارية الجديدة تستخدم `AdminMiddleware` في السيرفر. يلزم مراجعة CSRF، إعدادات الكوكيز، وصلاحيات كل العمليات قبل Production.

## 3. الفحوصات التي نُفّذت

| الفحص | النتيجة |
|---|---|
| PHP syntax عبر `php -l` | Passed: **39 ملف PHP** |
| JavaScript syntax عبر `node --check` | Passed: **20 ملف JS** |
| فحص روابط HTML المحلية `href/src/action` | Passed: **119 مرجعًا** دون روابط ملفات مفقودة |
| صور Landing Page المشار إليها في HTML | Passed: **21 مرجعًا** |
| PHP `require __DIR__` الثابت | **45 مرجعًا**؛ المرجع الوحيد غير الموجود هو `backend/config/config.php`، تم استبعاده عمدًا لحماية الإعدادات السرية |
| فحص خلو ملف التسليم من `.git` و`.env` و`config.php` | Passed |
| PHP + MySQL الحقيقي، CRUD، الجلسات | **Not Executed** — PDO MySQL غير متاح في بيئة الفحص ولم تُقدّم قاعدة بيانات متصلة |
| Browser visual and responsive E2E | **Not Executed** — لم ينجح تشغيل متصفح اختباري مكتمل |
| Stripe Checkout/Webhook/Refund | **Not Executed** — لا يوجد SDK مركّب أو مفاتيح وربط Stripe test حقيقي أثناء الفحص |
| Google Sign-In | **Not Executed** — لا توجد مفاتيح OAuth قابلة للاختبار |

## 4. خطوات التشغيل على XAMPP

1. استخدم **Integration Branch جديد** على Git. لا تستبدل مجلد الفريق الجاري العمل عليه دون نسخة احتياطية أو مراجعة `git diff`.
2. ضع **محتويات مجلد `DONO/`** داخل `C:\xampp\htdocs\DONO\` أو أي اسم آخر. أغلب مسارات الواجهة الجديدة تستخدم مسارات نسبية وتدعم أسماء مجلدات مختلفة.
3. انسخ `backend/config/config.example.php` إلى `backend/config/config.php` محليًا، ثم اضبط الاتصال بقاعدة `dono` و`app.frontend_url` إلى المسار الحقيقي، مثلاً `http://localhost/DONO/frontend`، ولا ترفع هذا الملف إلى Git.
4. شغّل Apache وMySQL، وتأكد من استيراد `backend/database/schema.sql` بالشكل المناسب لقاعدة البيانات لديك، **لا تعِد استيراد Schema على قاعدة تحتوي بيانات حقيقية من دون Backup**.
5. نفّذ الترحيلين الإضافيين عند الحاجة على قاعدة DB الموجودة، مرة واحدة: `backend/database/migration_stripe_refunds.sql` ثم `backend/database/migration_admin_logs.sql`.
6. من `backend/` نفّذ `composer install` لتثبيت Stripe SDK (بعد تثبيت Composer).
7. اضبط Stripe test `secret_key`، `webhook_secret` وWebhook Endpoint الذي يشير إلى `/backend/public/api/webhook/stripe` باستخدام إعدادات محلية تجريبية.
8. افتح `http://localhost/DONO/frontend/landing.html`، ثم جرّب: تسجيل حساب، تسجيل دخول، Shop، Product Details (standard item)، Cart، Stripe Checkout في test mode، التحقق من Webhook، ثم Admin.
9. راجع Developer Tools Console، Apache/PHP error log، وكل Responses من الـ API قبل أي Push إلى `develop`.

## 5. سياسة Git

هذه نسخة ZIP **منفصلة تمامًا**؛ لم يتم تنفيذ Git Commit أو Push أو Merge على جهازك. **مجلد `.git` غير موجود داخل ZIP**؛ استخدم مجلد Git المشروع الأصلي، وقارن الملفات وانقل التعديلات على `feature/integration` ثم افتح PR إلى `develop`. **لا تستخدم `git add .` قبل فحص قائمة الملفات**، ولا ترفع `config.php` أو `.env`.
