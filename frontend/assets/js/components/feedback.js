/* DONO shared, accessible notification and confirmation UI. No native alert/confirm. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('../../css/dono-feedback.css', document.querySelector('script[src$="components/feedback.js"]')?.src || document.baseURI).href;
  document.head.appendChild(css);
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  let toastTimer;
  function toast(message, type='info') {
    ready(() => {
      let live = document.getElementById('dono-feedback-toast');
      if (!live) {live = document.createElement('div');live.id='dono-feedback-toast';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live);}
      live.textContent = String(message || '');
      live.dataset.kind = type;
      live.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(()=>live.classList.remove('show'),4400);
    });
  }
  function modal({title='DONO',message='',confirmText='Continue',cancelText='Cancel',destructive=false,canCancel=true} = {}) {
    return new Promise(resolve => ready(() => {
      const backdrop = document.createElement('div');backdrop.className='dono-feedback-backdrop';
      const dialog=document.createElement('section');dialog.className='dono-feedback-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dono-feedback-title');dialog.setAttribute('aria-describedby','dono-feedback-description');
      const heading=document.createElement('h2');heading.id='dono-feedback-title';heading.textContent=title;
      const desc=document.createElement('p');desc.id='dono-feedback-description';desc.textContent=message;
      const actions=document.createElement('div');actions.className='dono-feedback-actions';
      const okay=document.createElement('button');okay.type='button';okay.className='dono-feedback-primary';okay.textContent=confirmText;if(destructive)okay.dataset.danger='true';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='dono-feedback-secondary';cancel.textContent=cancelText;
      if(canCancel)actions.append(cancel);actions.append(okay);dialog.append(heading,desc,actions);backdrop.append(dialog);
      const prev=document.activeElement;document.body.append(backdrop);okay.focus();
      let done=false;
      function close(result){if(done)return;done=true;document.removeEventListener('keydown',onKey);backdrop.remove();if(prev&&prev.isConnected)prev.focus();resolve(result);}
      function onKey(e){if(e.key==='Escape'&&canCancel){e.preventDefault();close(false);}if(e.key==='Tab'){const available=canCancel?[cancel,okay]:[okay];const i=available.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();available.at(-1).focus();}else if(!e.shiftKey&&i===available.length-1){e.preventDefault();available[0].focus();}}}
      okay.addEventListener('click',()=>close(true));cancel.addEventListener('click',()=>close(false));backdrop.addEventListener('click',e=>{if(e.target===backdrop&&canCancel)close(false);});document.addEventListener('keydown',onKey);
    }));
  }
  async function checkoutReturn() {
    const params=new URLSearchParams(location.search), session=params.get('checkout_session_id');
    if(params.has('checkout_cancelled')) {
      params.delete('checkout_cancelled');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
      const resume=await modal({title:'Checkout cancelled',message:'No payment was confirmed. You can resume the existing Stripe checkout without creating another order.',confirmText:'Resume secure checkout',cancelText:'Stay on cart'});
      if(resume){
        try{
          const endpoint=new URL('../../../../backend/public/api/payments/checkout',document.querySelector('script[src$="components/feedback.js"]')?.src || new URL('assets/js/components/feedback.js',document.baseURI));
          const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
          const result=await r.json();
          if(!r.ok||!result.success)throw new Error(result.message||'Unable to resume payment');
          const checkout=result.data?.checkout_url;
          if(!checkout||!/^https:\/\/checkout\.stripe\.com\//i.test(checkout))throw new Error('Invalid Stripe checkout URL.');
          location.assign(checkout);
        }catch(error){toast(error.message,'error');}
      }
    }
    if (!session) return;
    const path=new URL('../../../../backend/public/api/payments/status',document.querySelector('script[src$="components/feedback.js"]')?.src || new URL('assets/js/components/feedback.js',document.baseURI)).pathname;
    const query='?session_id='+encodeURIComponent(session);
    const strip=()=>{params.delete('checkout_session_id');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));};
    try{
      const response=await fetch(path+query,{credentials:'same-origin'});
      const data=await response.json();
      if(!response.ok||!data.success)throw Error(data.message||'Unable to verify payment.');
      const pay=data.data||{};
      if(pay.payment_status==='succeeded'&&pay.order_status==='confirmed'){
        strip();const go=await modal({title:'Payment confirmed ✓',message:`Your payment for ${pay.order_number||'your gift'} was verified.`,confirmText:'View my orders',cancelText:'Keep shopping'});if(go)location.href='my-orders.html';
      }else if(pay.payment_status==='pending'){
        strip();const go=await modal({title:'Payment verification pending',message:'DONO is waiting for secure confirmation from Stripe. Please check your order before trying to pay again.',confirmText:'View my orders',cancelText:'Keep shopping'});if(go)location.href='my-orders.html';
      }else{
        strip();await modal({title:'Payment not confirmed',message:'No confirmed payment was found for this checkout. You can review your orders or try again.',confirmText:'OK',canCancel:false});
      }
    }catch(error){strip();toast(error.message,'error');}
  }
  window.DonoUI={toast,modal,confirm:message=>modal({title:'Please confirm',message,confirmText:'Confirm',destructive:true})};
  ready(checkoutReturn);
})();
