/* DONO team shopping assistant: original widget integrated without hardcoded /dono paths. */
const apiUrl = new URL('../../../backend/public/api/chat', import.meta.url).pathname;
const rootUrl = new URL('../../', import.meta.url);
const productPageUrl = new URL('product-details.html', rootUrl);
const fallbackImageUrl = new URL('assets/img/gift-box.jpg', rootUrl);

function safeProductImage(raw) {
  if (!raw) return fallbackImageUrl.href;
  if (/^https:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return new URL('../../../backend/public' + raw, import.meta.url).href;
  if (raw.startsWith('uploads/')) return new URL('../../../backend/public/' + raw, import.meta.url).href;
  if (raw.startsWith('/')) return fallbackImageUrl.href;
  return new URL(raw, rootUrl).href;
}
function mountChatbot() {
  if (document.getElementById('chatbot-toggle-btn') || location.pathname.includes('/admin/')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('../css/chatbot.css', import.meta.url).href;
  document.head.append(css);
  const wrapper = document.createElement('div');
  wrapper.id='dono-shopping-chatbot';
  wrapper.innerHTML = `
    <button type="button" id="chatbot-toggle-btn" class="chatbot-float-btn" aria-label="Open shopping assistant" aria-expanded="false" aria-controls="chatbot-window">✳</button>
    <section id="chatbot-window" class="chatbot-window hidden" role="dialog" aria-modal="false" aria-label="DONO shopping assistant" aria-hidden="true">
      <div class="chatbot-header"><div class="chatbot-title"><span class="chatbot-status-dot" aria-hidden="true"></span> DONO Gift Assistant</div>
        <button type="button" id="chatbot-close-btn" class="chatbot-close-btn" aria-label="Close shopping assistant">×</button></div>
      <div id="chatbot-messages" class="chatbot-messages" role="log" aria-live="polite"><div class="chat-bubble bot">Hi! Tell me who you're shopping for and your budget. ✨</div></div>
      <form id="chatbot-form" class="chatbot-input-area"><input id="chatbot-input" type="text" maxlength="500" placeholder="Find the perfect gift..." aria-label="Your message" autocomplete="off" required>
        <button type="submit" id="chatbot-submit">Send</button></form>
    </section>`;
  document.body.append(wrapper);
  const toggle=wrapper.querySelector('#chatbot-toggle-btn');
  const close=wrapper.querySelector('#chatbot-close-btn');
  const panel=wrapper.querySelector('#chatbot-window');
  const form=wrapper.querySelector('#chatbot-form');
  const input=wrapper.querySelector('#chatbot-input');
  const submit=wrapper.querySelector('#chatbot-submit');
  const messages=wrapper.querySelector('#chatbot-messages');
  let busy=false;
  const setOpen=open=>{
    panel.classList.toggle('hidden',!open);
    panel.setAttribute('aria-hidden',String(!open));
    toggle.setAttribute('aria-expanded',String(open));
    if(open)input.focus();else toggle.focus();
  };
  toggle.addEventListener('click',()=>setOpen(panel.classList.contains('hidden')));
  close.addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.classList.contains('hidden'))setOpen(false)});
  function bubble(msg,type){
    const el=document.createElement('div');el.className='chat-bubble '+type;el.textContent=String(msg);
    messages.append(el);messages.scrollTop=messages.scrollHeight;return el;
  }
  function products(items){
    const container=document.createElement('div');container.className='chat-cards-container';
    for(const product of items){
      const id=Number(product.id);if(!Number.isSafeInteger(id)||id<1)continue;
      const card=document.createElement('div');card.className='chat-product-card';
      const img=document.createElement('img');img.src=safeProductImage(product.image_url);img.alt='';img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src=fallbackImageUrl.href};
      const info=document.createElement('div');info.className='chat-product-info';
      const name=document.createElement('span');name.className='chat-product-name';name.textContent=product.name;
      const price=document.createElement('span');price.className='chat-product-price';price.textContent=Number.isFinite(Number(product.price))?`USD ${Number(product.price).toFixed(2)}`:'Price unavailable';
      const link=document.createElement('a');link.className='chat-view-link';link.href=new URL(`product-details.html?id=${id}`,rootUrl).href;link.textContent='View gift ↗';
      info.append(name,price,link);card.append(img,info);container.append(card);
    }
    messages.append(container);messages.scrollTop=messages.scrollHeight;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const text=input.value.trim();if(!text)return;
    busy=true;submit.disabled=true;input.disabled=true;
    bubble(text,'user');input.value='';const pending=bubble('Looking through DONO gifts…','bot');
    try{
      const res=await fetch(apiUrl,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({message:text})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok||body.success!==true)throw new Error(body.message||'Assistant is unavailable.');
      pending.remove();bubble(body.data?.reply||'I could not find a matching gift.','bot');
      if(Array.isArray(body.data?.products)&&body.data.products.length)products(body.data.products);
    }catch(err){pending.remove();bubble(err.message||'Please try again.','bot')}
    finally{busy=false;submit.disabled=false;input.disabled=false;input.focus()}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountChatbot,{once:true});else mountChatbot();
