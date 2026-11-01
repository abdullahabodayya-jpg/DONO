# DONO — Google Route not found fix

This patch changes only `backend/public/index.php`. It does not add database tables, change API endpoints, or include any secrets.

## Install

1. Back up `backend/public/index.php`.
2. Extract this overlay in the existing DONO project root and overwrite that file.
3. Restart Apache if using OPcache, then reload the Login page.
4. Open this exact URL in a browser (GET):

`http://localhost/DONO-v2-Auth-Explore-Profile-Review/DONO/backend/public/api/auth/google/url`

Expected: JSON containing `success:true` and `data.url` pointing to Google, or a 503 message `Google Sign-In is not configured.` if the private OAuth configuration is missing. A `Route not found.` JSON response should not occur for this URL.

5. Use the Sign in with Google button from `frontend/login.html` and test the callback. `POST /api/auth/google/callback` is correct; opening this endpoint directly with GET will result in a route 404 and does **not** test the callback.
6. Google Cloud OAuth Web app redirect URI must match:

`http://localhost/DONO-v2-Auth-Explore-Profile-Review/DONO/frontend/google-callback.html`

If `Route not found.` persists, check the exact failed URL and HTTP method in the browser DevTools Network tab. The error could be a different endpoint.

## Verification

PHP lint: passed. Routing path examples were tested independently. XAMPP/Google integration cannot be tested here.
