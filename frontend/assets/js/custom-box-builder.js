import {requireAccount} from './components/auth-cta.js';
/* DONO Custom Box — catalog-backed wizard, server-calculated pricing. */
(() => {
  'use strict';
  const api = new URL('../backend/public/api', document.baseURI).pathname;
  const labels = ['Choose Box', 'Pick Gifts', 'Personalize', 'Add Extras', 'Add a Card'];
  const hints = [
    'First, pick the perfect home for your gifts.',
    'Choose one or more thoughtful gifts to put inside.',
    'Personal details make it unforgettable. Fields are optional unless needed by the selected gifts.',
    'Add an extra little surprise, or skip this step.',
    'Finish with a card and your own message, or continue without one.'
  ];
  const $ = id => document.getElementById(id);
  const savedKey = 'dono.custom-box.draft.v1';
  const blank = () => ({ step: 0, box: null, items: { gift: {}, extra: {}, card: {} }, personalization: {customize_items:'no',initials:'',ribbon_color:'',font:'',font_color:'',delivery_date:'',notes:'',favorite_brand:'',photo_url:''}, card: {occasion:'',placement:'inside',message:'',add_sender_name:'no',sender_name:''} });
  let state = blank();
  try {
    const stored = JSON.parse(localStorage.getItem(savedKey) || 'null');
    if (stored && typeof stored === 'object' && stored.items && stored.personalization && stored.card) {
      state = { ...blank(), ...stored, step: Math.min(4, Math.max(0, Number(stored.step) || 0)) };
    }
  } catch { /* Ignore corrupt draft. */ }
  let catalog = {box:[],gift:[],extra:[],card:[]};
  let loading = false;
  const money = cents => (cents/100).toLocaleString('en-US', {style:'currency',currency:'USD'});
  const cents = price => Math.round(Number(price) * 100);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const msg = (text, status='error') => { $('builder-feedback').textContent = text || ''; if (text && window.DonoUI?.toast) window.DonoUI.toast(text, status); };
  const persist = () => { try { localStorage.setItem(savedKey, JSON.stringify(state)); } catch { /* Storage may be disabled. */ } };
  const group = role => catalog[role] || [];
  const product = (role,id) => group(role).find(p => Number(p.id) === Number(id));
  const selectedLines = () => ['gift','extra','card'].flatMap(role => Object.entries(state.items[role] || {}).filter(([,qty])=>Number(qty)>0).map(([id,qty])=>({product_id:Number(id),quantity:Number(qty),role})));
  function photo(url) {
    if (!url) return 'assets/img/gift-box.jpg';
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/uploads/')) return new URL('../backend/public'+url,document.baseURI).href;
    if (url.startsWith('uploads/')) return new URL('../backend/public/'+url,document.baseURI).href;
    if (url.startsWith('assets/')) return url;
    return 'assets/img/gift-box.jpg';
  }
  function total() {
    let n=0;
    const box=product('box',state.box);
    if (box) n+=cents(box.price);
    for (const line of selectedLines()) { const p=product(line.role,line.product_id); if (p) n+=cents(p.price)*line.quantity; }
    return n;
  }
  function renderStepper() {
    $('builder-stepper').replaceChildren();
    labels.forEach((label,i)=>{
      const button=document.createElement('button'); button.type='button'; button.className='builder-step-button';
      button.setAttribute('aria-current',i===state.step?'step':'false');
      button.innerHTML=`<span class="builder-step-number">${i < state.step ? '✓':i+1}</span><span>${label}</span>`;
      button.onclick=()=>{ if(i>state.step && !validateThrough(i)) return;state.step=i;render();persist(); };
      $('builder-stepper').append(button);
    });
  }
  function validateThrough(next) {
    if (next>0 && !product('box',state.box)) {msg('Choose a box to continue.'); return false;}
    if (next>1 && !Object.values(state.items.gift || {}).some(q=>Number(q)>0)) {msg('Pick at least one gift to continue.'); return false;}
    return true;
  }
  function renderSummary() {
    const list=$('builder-summary-items'); list.replaceChildren();
    const lines=[]; const box=product('box',state.box);
    if(box) lines.push({title:box.name, qty:1, cost:cents(box.price)});
    selectedLines().forEach(line=>{const p=product(line.role,line.product_id); if(p) lines.push({title:p.name,qty:line.quantity,cost:cents(p.price)*line.quantity});});
    if(!lines.length){ const empty=document.createElement('p'); empty.className='builder-summary-empty';empty.textContent='Nothing in your box yet. Pick a box to begin.';list.append(empty); }
    for(const line of lines){
      const row=document.createElement('div');row.className='builder-summary-line';
      const text=document.createElement('span');text.textContent=`${line.qty} × ${line.title}`;
      const price=document.createElement('strong');price.textContent=money(line.cost);row.append(text,price);list.append(row);
    }
    $('builder-total').textContent=money(total());
  }
  function updateSelection(role,id,qty) {
    const num=Number(id);
    if(!product(role,num)) return;
    if(role==='box') state.box = num;
    else if(role==='card') state.items.card = qty>0 ? {[num]:1} : {};
    else { if (qty<1) delete state.items[role][num]; else state.items[role][num]=Math.max(1,Math.min(10,Number(product(role,num).stock_quantity),qty)); }
    persist();render();
  }
  function productCards(role) {
    const items=group(role); if (!items.length) return '<p class="builder-note">No products are available for this step yet. Ask an admin to assign existing products in Custom Box Catalog. No database migration is needed.</p>';
    return `<div class="builder-grid custom-box-items-grid" data-grid-role="${role}">${items.map(p=>{
      const id=Number(p.id); const qty=role==='box' ? (Number(state.box)===id?1:0) : Number(state.items[role]?.[id]||0);
      return `<article class="builder-product ${qty?'selected':''}" data-card-role="${role}" data-card-id="${id}" tabindex="0" role="group" aria-label="${esc(p.name)}, ${money(cents(p.price))}${qty?', selected':''}"><img src="${esc(photo(p.image_url))}" alt="${esc(p.name)}" loading="lazy"><div class="builder-product-info"><h3>${esc(p.name)}</h3><strong>${money(cents(p.price))}</strong><small>${Number(p.stock_quantity)} in stock</small>${role==='box'||role==='card' ? `<button type="button" data-role="${role}" data-id="${id}" data-action="toggle" aria-pressed="${!!qty}">${qty?'✓ Selected':'Select'}</button>` : `<div class="builder-qty"><button type="button" data-role="${role}" data-id="${id}" data-action="minus" aria-label="Remove one ${esc(p.name)}">−</button><span>${qty}</span><button type="button" data-role="${role}" data-id="${id}" data-action="plus" aria-label="Add one ${esc(p.name)}">+</button></div>`}</div></article>`;
    }).join('')}</div>`;
  }
  const field = (label, name, value, opts={}) => `<div class="builder-field ${opts.full?'full':''}"><label for="box-${name}">${label}</label>${opts.options ? `<select id="box-${name}" data-field="${name}" data-section="${opts.section||'personalization'}">${opts.options.map(([k,v])=>`<option value="${esc(k)}" ${value===k?'selected':''}>${esc(v)}</option>`).join('')}</select>` : opts.textarea ? `<textarea id="box-${name}" data-field="${name}" data-section="${opts.section||'personalization'}" maxlength="${opts.max||500}">${esc(value)}</textarea>` : `<input id="box-${name}" data-field="${name}" data-section="${opts.section||'personalization'}" type="${opts.type||'text'}" maxlength="${opts.max||120}" value="${esc(value)}">`}${opts.note?`<small>${esc(opts.note)}</small>`:''}</div>`;
  function personalize() {
    const p=state.personalization;
    return `<div class="builder-form">
      ${field('Customize items?','customize_items',p.customize_items,{full:true,options:[['no','No — standard gift'],['yes','Yes — personalized details']]})}
      ${p.customize_items==='yes' ? field('Names or initials', 'initials',p.initials,{note:'For gifts supporting engraving or printing.'}) : ''}
      ${p.customize_items==='yes' ? field('Ribbon color','ribbon_color',p.ribbon_color,{options:[['','No preference'],['pink','Pink'],['forest','Forest green'],['cream','Cream'],['white','White']]}) : ''}
      ${p.customize_items==='yes' ? field('Preferred font','font',p.font,{options:[['','No preference'],['serif','Classic serif'],['sans','Clean sans-serif'],['script','Handwritten script']]}) : ''}
      ${p.customize_items==='yes' ? field('Font color','font_color',p.font_color,{options:[['','No preference'],['green','Forest green'],['pink','Pink'],['black','Black'],['gold','Gold']]}) : ''}
      ${field('Preferred delivery date','delivery_date',p.delivery_date,{type:'date',note:'A preference only, not a guaranteed delivery promise.'})}
      ${field('Design notes','notes',p.notes,{full:true,textarea:true,max:1500})}
      ${p.customize_items==='yes'?`<div class="builder-field full"><label for="builder-photo">Optional print photo (JPG, PNG, WebP · max 10 MB)</label><input type="file" accept="image/png,image/jpeg,image/webp" id="builder-photo"><small id="builder-photo-status">${p.photo_url?'Photo uploaded securely.':'For photo-printing gifts only.'}</small></div>`:''}
      <p class="builder-note" style="grid-column:1/-1">Care guide: colors and engraving availability depend on the selected gift. The team will confirm any unsupported request before processing.</p></div>`;
  }
  function extras() {
    return productCards('extra')+`<div class="builder-form" style="margin-top:22px">${field('Favorite brand','favorite_brand',state.personalization.favorite_brand,{full:true,note:'We will contact you before suggesting an alternative if your preferred brand is unavailable.'})}</div>`;
  }
  function cardStep() {
    const c=state.card;
    return productCards('card')+`<div class="builder-form" style="margin-top:22px">${field('Card occasion','occasion',c.occasion,{section:'card',options:[['','Choose occasion'],['birthday','Birthday'],['anniversary','Anniversary'],['graduation','Graduation'],['love','Love'],['thank_you','Thank you'],['congratulations','Congratulations'],['other','Other']]})}
      ${field('Card placement','placement',c.placement,{section:'card',options:[['inside','Inside the box'],['outside','Outside the box']]})}
      ${field('Greeting message','message',c.message,{section:'card',textarea:true,max:1000,full:true})}
      ${field('Add sender name?','add_sender_name',c.add_sender_name,{section:'card',options:[['no','No'],['yes','Yes']]})}
      ${c.add_sender_name==='yes'?field('Sender name','sender_name',c.sender_name,{section:'card',max:100}):''}</div>`;
  }
  function render() {
    renderStepper();renderSummary();
    $('builder-step-label').textContent=`STEP ${state.step+1} OF 5`;
    $('builder-step-title').textContent=labels[state.step];
    $('builder-step-hint').textContent=hints[state.step];
    const content=[()=>productCards('box'),()=>productCards('gift'),personalize,extras,cardStep][state.step]();
    $('builder-content').innerHTML=content;
    $('builder-prev').disabled=state.step===0;
    $('builder-next').textContent=state.step===4?'Add my box to cart →':'Continue →';
    $('builder-next').disabled=loading;
    $('builder-feedback').textContent='';
  }
  // Whole card can be selected without interfering with quantity buttons.
  $('builder-content').addEventListener('click',event=>{
    if (event.target.closest('button, a, input, select, textarea, label')) return;
    const card = event.target.closest('.builder-product[data-card-role]');
    if (!card) return;
    const role=card.dataset.cardRole, id=Number(card.dataset.cardId);
    if (role==='box' || role==='card') {
      const qty=role==='box' ? (Number(state.box)===id?1:0) : Number(state.items.card?.[id] || 0);
      updateSelection(role,id,role==='box'?1:(qty?0:1));
    } else {
      const qty=Number(state.items[role]?.[id] || 0);
      updateSelection(role,id,qty?0:1);
    }
  });
  $('builder-content').addEventListener('keydown',event=>{
    if (!['Enter',' '].includes(event.key) || event.target !== event.target.closest('.builder-product[data-card-role]')) return;
    event.preventDefault();event.target.click();
  });
  $('builder-content').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button) return;
    const {role,id,action}=button.dataset;const qty=Number(state.items[role]?.[id]||0);
    if(action==='toggle') updateSelection(role,Number(id),role==='box'?1:(qty?0:1));
    if(action==='minus') updateSelection(role,Number(id),qty-1);
    if(action==='plus') updateSelection(role,Number(id),qty+1);
  });
  $('builder-content').addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.field && state[el.dataset.section]?.hasOwnProperty(el.dataset.field)){
      state[el.dataset.section][el.dataset.field]=el.value;
      if(el.dataset.field==='customize_items' && el.value==='no') {
        for(const key of ['initials','ribbon_color','font','font_color','photo_url']) state.personalization[key]='';
      }
      if(el.dataset.field==='add_sender_name' && el.value==='no') state.card.sender_name='';
      persist();
      if (['customize_items','add_sender_name'].includes(el.dataset.field)) render();
    }
  });
  $('builder-content').addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    if(event.target.id!=='builder-photo'||!file) return;
    if(file.size>10*1024*1024){msg('Image must be 10 MB or smaller.');return;}
    const button=$('builder-next');button.disabled=true;
    try{
      if (!(await requireAccount('upload a gift photo'))) return;
      const body=new FormData();body.set('photo',file);
      const response=await fetch(api+'/custom-box/upload',{method:'POST',credentials:'same-origin',body});
      const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Upload failed.');
      state.personalization.photo_url=result.data.photo_url;persist();
      $('builder-photo-status').textContent='Photo uploaded securely.';msg('Photo uploaded.','success');
    }catch(err){msg(err.message);}finally{button.disabled=false;}
  });
  $('builder-prev').addEventListener('click',()=>{if(state.step>0){state.step--;persist();render();}});
  $('builder-next').addEventListener('click',async()=>{
    if(!validateThrough(Math.min(5,state.step+1)))return;
    if(state.step<4){state.step++;persist();render();return;}
    const lines=selectedLines();
    if(lines.some(l=>l.role==='card')){
      if(!state.card.occasion){msg('Choose the card occasion.');return;}
      if(!state.card.message.trim()){msg('Please write a greeting message or deselect the card.');return;}
      if(state.card.add_sender_name==='yes'&&!state.card.sender_name.trim()){msg('Enter the sender name or select No.');return;}
    }
    if (!(await requireAccount('create your custom gift box'))) return;
    if(loading)return;loading=true;$('builder-next').disabled=true;
    try{
      const response=await fetch(api+'/custom-box/cart',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({box_product_id:state.box,items:lines,personalization:state.personalization,card:state.card})});
      const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw new Error(result.message||'Unable to save box.');
      localStorage.removeItem(savedKey);window.location.assign('cart.html');
    }catch(err){msg(err.message);}finally{loading=false;$('builder-next').disabled=false;}
  });
  const dialog=$('builder-clear-dialog');
  $('builder-clear').addEventListener('click',()=>dialog.showModal());
  $('builder-clear-cancel').addEventListener('click',()=>dialog.close());
  $('builder-clear-confirm').addEventListener('click',()=>{dialog.close();state=blank();persist();render();});
  async function loadCatalog(){
    try{
      const response=await fetch(api+'/custom-box/catalog',{credentials:'same-origin'});
      const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw new Error(result.message||'Cannot load custom box catalog.');
      catalog=result.data;
      for(const role of ['box','gift','extra','card']){
        catalog[role]=Array.isArray(catalog[role])?catalog[role]:[];
        state.items[role]=state.items[role]||{};
        for(const id of Object.keys(state.items[role])) if(!product(role,id))delete state.items[role][id];
      }
      if(state.box&&!product('box',state.box))state.box=null;
      persist();render();
    }catch(err){$('builder-content').innerHTML=`<p class="builder-note">${esc(err.message)}</p>`;msg(err.message);}
  }
  loadCatalog();
})();
