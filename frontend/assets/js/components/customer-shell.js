/* DONO customer navigation: nothing private is shown before backend session verification. */
import {getCurrentUser,loginPrompt} from './auth-cta.js';
import '../chatbot.js';
const rootPath = new URL('../../../', import.meta.url).pathname;
const apiPath = new URL('../../../../backend/public/api', import.meta.url).pathname;
if (!location.pathname.includes('/admin/') && !location.pathname.endsWith('/landing.html')) {
  let user = null;
  try { user = await getCurrentUser(); }
  catch (error) {console.warn('DONO session unavailable:',error.message);}
  const style=document.createElement('link');style.rel='stylesheet';style.href=rootPath+'assets/css/dono-shell-polish.css';document.head.append(style);
  const unified=document.createElement('link');unified.rel='stylesheet';unified.href=rootPath+'assets/css/dono-brand-unified.css';document.head.append(unified);
  // Guest and admin browsing the storefront never see the customer sidebar.
  if (!user || user.role !== 'customer') {
    document.body.classList.add('dono-guest');
    const bar=document.createElement('header');bar.className='dono-public-header';bar.setAttribute('aria-label','Public navigation');
    bar.innerHTML=`<a class="dono-public-brand" href="${rootPath}landing.html" aria-label="DONO home"><img src="${rootPath}assets/img/dono-wordmark.png" alt="DONO"></a><nav aria-label="Browse"><a href="${rootPath}products.html">Explore Gifts</a><a href="${rootPath}custom-box.html">Build a Box</a></nav><div class="dono-public-actions">${user?.role==='admin'?`<a class="dono-auth-primary" href="${rootPath}admin/index.html">Admin Dashboard</a>`:`<a href="${rootPath}login.html">Log In</a><a class="dono-auth-primary" href="${rootPath}register.html">Create Account</a>`}</div>`;
    document.body.prepend(bar);
  } else {
    document.body.classList.add('dono-shell-enabled');
 const shell=document.createElement('aside');shell.id='dono-customer-sidebar';shell.className='dono-side';shell.setAttribute('aria-label','Customer navigation');
 const links=[['products.html','✳','Explore'],['custom-box.html','<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M2 8v9l10 5 10-5V8"/><path d="M12 13v9"/><path d="M18 2v5"/><path d="M15.5 4.5h5"/></svg>','Build a Box'],['wishlist.html','♡','Wishlist'],['cart.html','▢','Gift bag'],['my-orders.html','▤','My orders'],['profile.html','◉','Profile']];
 const active=location.pathname.split('/').pop()||'products.html';
 shell.innerHTML=`<div class="dono-side-brand"><a href="${rootPath}products.html" class="dono-side-logo" aria-label="DONO Explore"><img class="dono-logo-mark" src="${rootPath}assets/img/dono-monogram.png" alt=""><img class="dono-logo-word" src="${rootPath}assets/img/dono-wordmark.png" alt=""></a></div>
 <a href="${rootPath}profile.html" class="dono-side-user" aria-label="Your profile"><span id="dono-side-avatar">☺</span><span id="dono-side-username">Your profile</span></a>
 <nav class="dono-side-links">${links.map(([path,icon,name])=>`<a href="${rootPath+path}" ${path===active?'aria-current="page"':''}><span class="side-icon${path==='custom-box.html'?' side-icon-build-box':''}" aria-hidden="true">${icon}</span><span class="side-title">${name}</span></a>`).join('')}</nav>
 <div class="dono-side-bottom"><a href="${rootPath}login.html" id="dono-side-login"><span class="side-icon" aria-hidden="true">↳</span><span class="side-title">Log in</span></a><button type="button" id="dono-side-logout" hidden><span class="side-icon" aria-hidden="true">↩</span><span class="side-title">Log out</span></button></div>`;
 document.body.prepend(shell);
 const menu=document.createElement('button');menu.className='dono-mobile-menu';menu.type='button';menu.setAttribute('aria-label','Open DONO navigation');menu.setAttribute('aria-expanded','false');menu.textContent='☰';document.body.prepend(menu);
 const shade=document.createElement('button');shade.type='button';shade.className='dono-side-shade';shade.setAttribute('aria-label','Close navigation');document.body.prepend(shade);
 const close=()=>{document.body.classList.remove('dono-menu-open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';};
 menu.addEventListener('click',()=>{const open=document.body.classList.toggle('dono-menu-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});shade.addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});

    const avatar=document.getElementById('dono-side-avatar');
    const username=document.getElementById('dono-side-username');
    avatar.textContent=(user.name||'D').split(/\s+/).slice(0,2).map(x=>x.slice(0,1)).join('').toUpperCase();
    username.textContent=user.name||'My profile';
    document.getElementById('dono-side-login').hidden=true;
    const logout=document.getElementById('dono-side-logout');logout.hidden=false;
    logout.addEventListener('click',async()=>{logout.disabled=true;try{const response=await fetch(apiPath+'/auth/logout',{method:'POST',credentials:'same-origin'});if(!response.ok)throw new Error('Unable to sign out.');location.replace(rootPath+'landing.html');}catch(error){window.DonoUI?.toast(error.message,'error');logout.disabled=false;}});
  }
 // Shared footer uses the Product Details reference, never the Landing footer.
 if (!document.querySelector('.site-footer') && !document.body.classList.contains('dono-landing')) {
  const footer=document.createElement('footer');footer.className='site-footer';
  footer.innerHTML=`<div class="footer-container"><div><a class="footer-logo" href="${rootPath}products.html"><img src="${rootPath}assets/img/dono-wordmark.png" alt="DONO"></a><p>Make every moment feel special.</p></div><p>© 2026 DONO. All rights reserved.</p></div>`;
  document.body.append(footer);
 }
 const existingFooter=document.querySelector('.site-footer .footer-logo');
 if (existingFooter && !existingFooter.querySelector('img')) {
  existingFooter.innerHTML=`<img src="${rootPath}assets/img/dono-wordmark.png" alt="DONO">`;
 }

  if (!user && ['wishlist.html','cart.html','my-orders.html','profile.html'].includes(location.pathname.split('/').pop())) {
    document.body.classList.add('dono-private-guest');
    const prompt=document.createElement('section');prompt.className='dono-private-entry';
    prompt.innerHTML='<h1>Welcome to your DONO space</h1><p>Sign in to view your saved gifts, bag and orders.</p><button type="button" class="dono-new-cta">Log In to Continue</button>';
    prompt.querySelector('button').addEventListener('click',()=>loginPrompt('view your account'));
    document.querySelector('main')?.before(prompt);
  }
  // Accessible private links on public pages invite login without exposing private navigation.
  if (!user) document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    const page=new URL(link.href,location.href).pathname.split('/').pop();
    if(['wishlist.html','my-orders.html','profile.html','cart.html'].includes(page)) {event.preventDefault();loginPrompt('access your gifts');}
  });
}
