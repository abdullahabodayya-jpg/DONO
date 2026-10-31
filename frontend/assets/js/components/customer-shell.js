/* Shared customer navigation. Never touches admin DOM or CSS. */
const rootPath = new URL('../../../',import.meta.url).pathname;
const apiPath = new URL('../../../../backend/public/api',import.meta.url).pathname;
if (!location.pathname.includes('/admin/')) {
 document.body.classList.add('dono-shell-enabled');
 const shell=document.createElement('aside');shell.id='dono-customer-sidebar';shell.className='dono-side';shell.setAttribute('aria-label','Customer navigation');
 const links=[['products.html','✳','Explore'],['wishlist.html','♡','Wishlist'],['cart.html','▢','Gift bag'],['my-orders.html','▤','My orders'],['profile.html','◉','Profile']];
 const active=location.pathname.split('/').pop()||'products.html';
 shell.innerHTML=`<div class="dono-side-brand"><a href="${rootPath}products.html" class="dono-side-logo" aria-label="DONO Explore"><img src="${rootPath}assets/img/dono-mark.svg" alt=""></a><span class="dono-side-wordmark">dono</span></div>
 <a href="${rootPath}profile.html" class="dono-side-user" aria-label="Your profile"><span id="dono-side-avatar">☺</span><span id="dono-side-username">Your profile</span></a>
 <nav class="dono-side-links">${links.map(([path,icon,name])=>`<a href="${rootPath+path}" ${path===active?'aria-current="page"':''}><span class="side-icon" aria-hidden="true">${icon}</span><span class="side-title">${name}</span></a>`).join('')}</nav>
 <div class="dono-side-bottom"><a href="${rootPath}login.html" id="dono-side-login"><span class="side-icon" aria-hidden="true">↳</span><span class="side-title">Log in</span></a><button type="button" id="dono-side-logout" hidden><span class="side-icon" aria-hidden="true">↩</span><span class="side-title">Log out</span></button></div>`;
 document.body.prepend(shell);
 const menu=document.createElement('button');menu.className='dono-mobile-menu';menu.type='button';menu.setAttribute('aria-label','Open DONO navigation');menu.setAttribute('aria-expanded','false');menu.textContent='☰';document.body.prepend(menu);
 const shade=document.createElement('button');shade.type='button';shade.className='dono-side-shade';shade.setAttribute('aria-label','Close navigation');document.body.prepend(shade);
 const close=()=>{document.body.classList.remove('dono-menu-open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';};
 menu.addEventListener('click',()=>{const open=document.body.classList.toggle('dono-menu-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});shade.addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 try {const response=await fetch(apiPath+'/auth/me',{credentials:'same-origin'});if(response.ok){const body=await response.json();const user=body.data?.user;
 if(user){const avatar=document.getElementById('dono-side-avatar');const username=document.getElementById('dono-side-username');avatar.textContent=(user.name||'D').split(/\s+/).slice(0,2).map(x=>x.slice(0,1)).join('').toUpperCase();username.textContent=user.name||'My profile';document.getElementById('dono-side-login').hidden=true;const logout=document.getElementById('dono-side-logout');logout.hidden=false;
 logout.addEventListener('click',async()=>{logout.disabled=true;try{const response=await fetch(apiPath+'/auth/logout',{method:'POST',credentials:'same-origin'});if(!response.ok)throw new Error('Unable to sign out. Please try again.');location.replace(rootPath+'landing.html');}catch(error){window.DonoUI?.toast(error.message,'error');logout.disabled=false;}});
 if(user.role==='admin'){const adm=document.createElement('a');adm.href=rootPath+'admin/index.html';adm.innerHTML='<span class="side-icon" aria-hidden="true">⚙</span><span class="side-title">Admin dashboard</span>';shell.querySelector('.dono-side-bottom').prepend(adm);}
 }} }catch{ /* Guests can still navigate public store. */ }
}
