/* DONO Product Details: product discovery and purchase actions only.
   Gift preferences and wrapping are configured once in Cart. */
import {mountProductReviews} from '../components/product-reviews.js';
import {requireAccount} from '../components/auth-cta.js';
import {getWishlistIds, toggleWishlist, paintWishlistButton} from '../components/wishlist-state.js';
const apiRoot=new URL('../../../../backend/public/api',import.meta.url).pathname;
const params=new URLSearchParams(location.search);
const productId=Number(params.get('id'));
const target=document.getElementById('product-content');
const reviewsTarget=document.getElementById('product-reviews');
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imageSource(path){
 if(!path)return 'assets/img/gift-box.jpg';
 if(/^(https?:|data:|blob:)/i.test(path))return path;
 if(path.startsWith('/uploads/'))return new URL('../../../../backend/public'+path,import.meta.url).href;
 if(path.startsWith('uploads/'))return new URL('../../../../backend/public/'+path,import.meta.url).href;
 return path;
}
async function api(path,options={}){
 const response=await fetch(apiRoot+path,{credentials:'same-origin',...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.success!==true){const error=new Error(data.message||'Request failed.');error.status=response.status;throw error;}
 return data.data;
}
function notify(message,kind='info'){window.DonoUI?.toast(message,kind);}
async function start(){
 if(!Number.isInteger(productId)||productId<=0){target.textContent='Select a gift from Explore to see its details.';return;}
 try {
  const [data,photos]=await Promise.all([api('/products/'+productId),api('/products/'+productId+'/images')]);
  const item=data.product;
  if(!item)throw Error('Product not found.');
  const images=(Array.isArray(photos)?photos:[]).map(p=>imageSource(p.image_url));
  if(!images.length)images.push(imageSource(item.image_url));
  const available=Number(item.stock_quantity)>0 && Number(item.is_active)===1;
  const maxQty=Math.max(1,Number(item.stock_quantity)||1);
  target.innerHTML=`<div class="product-layout dono-product-layout">
    <div class="product-gallery"><div class="main-image-wrapper"><img class="main-product-image" id="main-product-image" src="${safe(images[0])}" alt="${safe(item.name)}"></div>
      <div class="thumbnail-list">${images.map((url,i)=>`<button type="button" class="thumbnail ${i?'':'active'}" data-src="${safe(url)}" aria-label="View photo ${i+1}"><img src="${safe(url)}" alt=""></button>`).join('')}</div></div>
    <div class="product-info"><p class="product-category">${safe(item.category?.name||'The DONO Collection')}</p><h1 class="product-title">${safe(item.name)}</h1>
      <p class="product-description">${safe(item.description||'A thoughtful gift for someone special.')}</p><div class="product-price">${money(item.price)}</div>
      <p class="stock-status ${available?'':'out-of-stock'}">${available?`${maxQty} available`:'Currently unavailable'}</p>
      <div class="option-group"><h3 class="option-title">Quantity</h3><div class="quantity-control"><button id="decrease-quantity" type="button" aria-label="Decrease quantity">−</button><span id="quantity-value" class="quantity-value">1</span><button id="increase-quantity" type="button" aria-label="Increase quantity">+</button></div></div>
      <div class="action-buttons"><button id="add-to-cart" class="primary-button" type="button" ${available?'':'disabled'}>Add to Cart</button><button id="buy-now" class="buy-now-button" type="button" ${available?'':'disabled'}>Add & Go to Cart</button></div>
      <div class="dono-review-navigation"><button class="wishlist-button" id="wishlist-button" type="button" aria-pressed="false" data-product-name="${safe(item.name)}">♡ Add to Wishlist</button><button id="go-to-reviews" type="button">★ Read Customer Reviews</button></div>
      <p class="dono-cart-options-note">Gift recipient, message and wrapping options are selected in your Cart before checkout.</p>
      <a href="cart.html" class="dono-cart-link">View Gift Bag →</a></div></div>`;
  let qty=1;
  const amount=target.querySelector('#quantity-value');
  target.querySelector('#decrease-quantity').addEventListener('click',()=>{qty=Math.max(1,qty-1);amount.textContent=qty;});
  target.querySelector('#increase-quantity').addEventListener('click',()=>{qty=Math.min(maxQty,qty+1);amount.textContent=qty;});
  target.querySelectorAll('.thumbnail').forEach(button=>button.addEventListener('click',()=>{
   target.querySelector('#main-product-image').src=button.dataset.src;
   target.querySelectorAll('.thumbnail').forEach(el=>el.classList.remove('active'));button.classList.add('active');
  }));
  async function add(goToCart=false){
   if(!await requireAccount('add a gift to your bag'))return;
   const button=target.querySelector(goToCart?'#buy-now':'#add-to-cart');button.disabled=true;
   try {await api('/cart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:productId,quantity:qty})});
    notify('Added to your gift bag. Personalize your order in Cart.','success');
    if(goToCart)location.assign('cart.html');
    else {const go=await window.DonoUI?.modal?.({title:'Added to your gift bag',message:'Your gift is saved. Add wrapping and a card in Cart.',confirmText:'Go to Cart',cancelText:'Continue Shopping'});if(go)location.assign('cart.html');}
   }catch(error){if(error.status===401)await requireAccount('add a gift');else notify(error.message,'error');}finally{button.disabled=!available;}
  }
  target.querySelector('#add-to-cart').addEventListener('click',()=>add(false));
  target.querySelector('#buy-now').addEventListener('click',()=>add(true));
  const wishlistButton=target.querySelector('#wishlist-button');
  getWishlistIds().then(ids => paintWishlistButton(wishlistButton, ids.has(productId), true))
    .catch(error => console.warn('Wishlist state unavailable:', error.message));
  wishlistButton.addEventListener('click',async event=>{
   if(!await requireAccount('save your favorites'))return;
   const button=event.currentTarget;button.disabled=true;
   try {
    const saved=await toggleWishlist(productId);
    paintWishlistButton(button,saved,true);
    notify(saved?'Saved to your wishlist.':'Removed from your wishlist.','success');
   }catch(error){notify(error.message,'error');}finally{button.disabled=false;}
  });
  target.querySelector('#go-to-reviews').addEventListener('click',()=>reviewsTarget?.scrollIntoView({behavior:'smooth',block:'start'}));
  if(reviewsTarget)await mountProductReviews(reviewsTarget,productId);
 }catch(error){console.error('Product detail error',error);target.innerHTML=`<div class="loading-message"><h2>Could not load this gift</h2><p>${safe(error.message)}</p><a class="dono-new-cta" href="products.html">Explore Gifts</a></div>`;}
}
start();
