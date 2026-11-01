/* Presentation only; userAuth.js retains full ownership of API login and OAuth. */
(() => {
  // Never let an unloaded wordmark leave a broken image; use an embedded typographic fallback.
  for (const img of document.querySelectorAll('.auth-brand-logo img')) {
    const logo = img.closest('.auth-brand-logo');
    const show = () => { if (img.naturalWidth > 0) logo.classList.add('logo-loaded'); };
    img.addEventListener('load', show);
    if (img.complete) show();
  }

  const params = new URLSearchParams(window.location.search);
  const desiredReturn = params.get('return');
  // Only preserve a relative destination within the same project, never a full external URL.
  if (desiredReturn && !desiredReturn.startsWith('//') &&
      !/^[a-z][a-z\d+.-]*:/i.test(desiredReturn) && !desiredReturn.includes('\\')) {
    document.querySelectorAll('[data-preserve-return]').forEach(link => {
      const next = new URL(link.href, window.location.href);
      next.searchParams.set('return', desiredReturn);
      link.href = next.pathname + next.search;
    });
  }

  const password = document.querySelector('#registerForm #password');
  const confirm = document.querySelector('#registerForm #confirmPassword');
  if (password && confirm) {
    const validateMatch = () => {
      confirm.setCustomValidity(confirm.value && confirm.value !== password.value
        ? 'Passwords do not match.' : '');
    };
    password.addEventListener('input', validateMatch);
    confirm.addEventListener('input', validateMatch);
  }
  document.querySelectorAll('[data-password-target]').forEach(button => {
    const input = document.getElementById(button.dataset.passwordTarget);
    if (!input) return;
    button.addEventListener('click', () => {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(reveal));
      button.setAttribute('aria-label', (reveal ? 'Hide ' : 'Show ') +
        (input.id === 'confirmPassword' ? 'confirm password' : 'password'));
      input.focus();
    });
  });
})();
