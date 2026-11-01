/* DONO shared Wishlist state. The PHP session and MySQL are authoritative. */
import {getCurrentUser} from './auth-cta.js';
const apiBase = new URL('../../../../backend/public/api', import.meta.url).pathname;
let savedIdsRequest = null;

export function getWishlistIds(refresh = false) {
  if (refresh) savedIdsRequest = null;
  if (!savedIdsRequest) {
    savedIdsRequest = (async () => {
      const user = await getCurrentUser();
      if (!user || user.role !== 'customer') return new Set();
      const response = await fetch(apiBase + '/wishlist', {
        credentials: 'same-origin', cache: 'no-store'
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success !== true) {
        throw new Error(json.message || 'Unable to load your wishlist.');
      }
      return new Set((json.data?.items || []).map(item => Number(item.id))
        .filter(id => Number.isSafeInteger(id) && id > 0));
    })().catch(error => { savedIdsRequest = null; throw error; });
  }
  return savedIdsRequest;
}

export async function toggleWishlist(productId) {
  const id = Number(productId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid gift.');
  const savedIds = await getWishlistIds();
  const wasSaved = savedIds.has(id);
  const response = await fetch(apiBase + '/wishlist/items' + (wasSaved ? '/' + id : ''), {
    method: wasSaved ? 'DELETE' : 'POST',
    credentials: 'same-origin',
    ...(wasSaved ? {} : {
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({product_id: id})
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success !== true) {
    // A stale tab can be out of sync; reload the authoritative state next time.
    savedIdsRequest = null;
    throw new Error(json.message || 'Could not update your wishlist.');
  }
  if (wasSaved) savedIds.delete(id);
  else savedIds.add(id);
  return !wasSaved;
}

export function paintWishlistButton(button, saved, withText = false) {
  if (!button) return;
  button.classList.toggle('is-wishlisted', Boolean(saved));
  button.setAttribute('aria-pressed', String(Boolean(saved)));
  const label = button.dataset.productName || 'gift';
  button.setAttribute('aria-label', (saved ? 'Remove ' : 'Add ') + label +
    (saved ? ' from wishlist' : ' to wishlist'));
  button.textContent = withText
    ? (saved ? '♥ In Wishlist' : '♡ Add to Wishlist')
    : (saved ? '♥' : '♡');
}
