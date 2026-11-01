/* DONO shared session and login CTA. Session is verified by PHP, never localStorage. */
const root = new URL('../../../', import.meta.url);
const meEndpoint = new URL('../../../../backend/public/api/auth/me', import.meta.url);
let sessionRequest = null;
export function getCurrentUser(refresh = false) {
  if (!sessionRequest || refresh) {
    sessionRequest = fetch(meEndpoint, {credentials:'same-origin',cache:'no-store'})
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Could not verify your session. Please try again.');
        const json = await response.json();
        return json?.data?.user || null;
      }).catch(error => {sessionRequest = null; throw error;});
  }
  return sessionRequest;
}
export function safeReturnPath(value) {
  if (!value || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('\n') || value.includes('\r')) return null;
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith(root.pathname)) return null;
    if (!/\.html$/i.test(url.pathname) || /(?:login|register|google-callback|payment-success|payment-cancelled)\.html$/i.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch {return null;}
}
function entryUrl(page) {
  const next = safeReturnPath(location.pathname + location.search + location.hash);
  const url = new URL(page, root);
  if (next) url.searchParams.set('return', next);
  return url.href;
}
export function loginPrompt(action='continue') {
  return new Promise(resolve => {
    const previous = document.activeElement;
    const modal = document.createElement('dialog');
    modal.className = 'dono-auth-modal';
    modal.innerHTML = `<div class="dono-auth-modal-body"><p class="dono-auth-eyebrow">DONO GIFT CLUB</p><h2>Sign in to ${String(action).replace(/[<>]/g,'')}</h2><p>Log in or create an account to save your gifts and continue.</p><div class="dono-auth-actions"><button type="button" data-action="login" class="dono-auth-primary">Log In</button><button type="button" data-action="register">Create Account</button></div><button type="button" data-action="cancel" class="dono-auth-cancel">Continue Browsing</button></div>`;
    const finish = value => {modal.close();modal.remove();previous?.focus?.();resolve(value);};
    modal.addEventListener('click', event => {
      if (event.target === modal) {finish(false);return;}
      const button=event.target.closest('[data-action]');if(!button)return;
      const kind=button.dataset.action;
      if(kind==='cancel'){finish(false);return;}
      const url=entryUrl(kind==='login'?'login.html':'register.html');
      finish(true);location.assign(url);
    });
    modal.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    document.body.append(modal);modal.showModal();modal.querySelector('[data-action="login"]').focus();
  });
}
export async function requireAccount(action='continue') {
  try {
    const user=await getCurrentUser();
    if (user && user.role === 'customer') return true;
    if (user?.role === 'admin') {window.DonoUI?.toast('Please use a customer account for shopping.','warning');return false;}
    await loginPrompt(action);return false;
  } catch (e) {window.DonoUI?.toast(e.message,'error');return false;}
}
