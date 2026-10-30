const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];

/* ===== image slots: نجهّز الصور بدون تحميل (التحميل lazy لكل قسم) ===== */
$$('.slot').forEach(s=>{
  const n=s.dataset.img,fl=document.createElement('span');
  fl.className='fl';
  const im=document.createElement('img');
  im.alt=n?n.split('/').pop().replace(/[-_]/g,' ').replace(/\.(jpg|png|jpeg|webp)$/i,''):'DONO gift';
  im.decoding='async';
  if(n) im.dataset.src=n;
  const ph=document.createElement('span');
  ph.className='ph';
  ph.textContent=s.dataset.ph||n||'';
  fl.append(ph,im);
  s.append(fl);
});

/* ===== دوائر الصور تحت في السيكشن الثاني ===== */
(function(){
  const box=$('#brands');
  if(!box) return;
  /* القسم الثاني: فقط brand-1.jpg ... brand-14.jpg */
  const files=Array.from({length:14},(_,i)=>'brand-'+(i+1)+'.jpg');
  /* [left vw, top vh, size vw] */
  const cfg=[[-1,76,7],[5,66,4.6],[11,70,8],[15,82,5.4],[21,76,6],[27,81,6.4],
             [56,76,5.8],[61,82,6.2],[66,74,7.6],[73,80,6],[78,82,6.8],[84,77,5],[88,70,6.4],[94,78,8]];
  cfg.forEach(([l,t,w],i)=>{
    const b=document.createElement('div');
    b.className='bub';
    b.style.cssText=`--l:${l}vw;--t:${t}vh;--w:${w}vw;--d:${i}`;
    const im=document.createElement('img');
    im.alt='';
    im.decoding='async';
    im.dataset.src='assets/img/'+files[i%files.length];
    b.appendChild(im);
    box.appendChild(b);
  });
})();

/* ===== duplicate marquee track ===== */
const tr=$('#track');
if(tr) tr.innerHTML+=tr.innerHTML;

/* ===== typewriter ===== */
function typer(el,words,speed=90){
  if(!el) return;
  let w=0,c=0,del=false;
  (function step(){
    const t=words[w];
    el.textContent=t.slice(0,c);
    if(!del&&c===t.length){del=true;return setTimeout(step,1400)}
    if(del&&c===0){del=false;w=(w+1)%words.length}
    c+=del?-1:1;
    setTimeout(step,del?speed/2:speed);
  })();
}
typer($('#tw'),['birthday','wedding','holiday','baby shower','dream list']);
typer($('#url'),['https://www.yourstore.com/','https://shop.example.com/hoodie','https://www.anywhere.com/wish'],70);

/* ===== tabs ===== */
const subs=[
  'DONO lets you claim friends’ wishes privately, so their gifts stay a surprise.',
  'Explore thoughtful gift boxes, curated hampers, and bundles for every special occasion.',
  'Birthdays, anniversaries, celebrations, and thank-you gifts: find a bundle for every moment.'
];
const tabs=$$('.tabs button');
let ti=0,tm;

function setTab(i){
  ti=i;
  tabs.forEach((b,k)=>b.classList.toggle('act',k===i));
  const s=$('#sub');
  s.style.opacity=0;
  setTimeout(()=>{s.textContent=subs[i];s.style.opacity=1},250);
  const bl=$('.collage .blob');
  bl.style.animation='none';
  void bl.offsetWidth;
  bl.style.animation='';
}
tabs.forEach((b,i)=>b.onclick=()=>{setTab(i);clearInterval(tm);tm=setInterval(()=>setTab((ti+1)%3),5000)});
tm=setInterval(()=>setTab((ti+1)%3),5000);

/* ===== scroll engine ===== */
const scenes=$$('.scene'),bar=$('#bar');
let busy=false;

function tick(){
  busy=false;
  const H=innerHeight;
  let th='dark';
  scenes.forEach(s=>{
    const r=s.getBoundingClientRect();
    s.style.setProperty('--in',(1-Math.min(1,Math.max(0,r.top/H))).toFixed(3));
    s.style.setProperty('--out',0);
    if(r.top<=H*.5)th=s.dataset.theme;
  });
  document.body.dataset.theme=th;
  bar.style.transform='scaleX('+(scrollY/(document.documentElement.scrollHeight-H||1))+')';
}
const req=()=>{if(!busy){busy=true;requestAnimationFrame(tick)}};
addEventListener('scroll',req,{passive:true});
addEventListener('resize',req);
tick();

/* ===== تحميل الصور: طابور (3 صور بنفس الوقت) + الهيرو أولاً =====
   1) الهيرو يتحمّل لحاله أول شي والصفحة تظهر فوراً
   2) كل قسم يتحمّل قبل ما توصله بشوي
   3) بعد ما الهيرو يخلص، الباقي يتحمّل بالخلفية بهدوء */
const queue=[];let active=0;const MAX_PARALLEL=2;

/* ---- تصغير الصور داخل المتصفح (الصور الأصلية كبيرة جداً وبتبطّئ الصفحة) ----
   كل صورة بتتصغّر لحجم عرضها الفعلي تقريباً وبتنحفظ بالـ Cache،
   فأول زيارة بتبني النسخ الصغيرة، وأي زيارة بعدها بتفتح فوراً.
   لو أي خطوة فشلت (مثلاً فتح الملف file://) بيرجع للتحميل العادي. */
const THUMB_CACHE='dono-thumbs-v2';
const origBlobs=new Map();

function targetWidth(im){
  /* نحسب من الضلع الأطول للإطار (الصورة بتغطي الإطار object-fit:cover،
     فلو الإطار طويل بتتكبّر حسب الارتفاع) وبهامش 2x عشان تبقى حادة */
  const host=im.closest('.slot,.bub');
  const side=host?Math.max(host.offsetWidth,host.offsetHeight):0;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const need=(side||500)*dpr*2;
  return Math.min(1600,Math.max(480,Math.ceil(need/160)*160));
}

async function thumbURL(path,width){
  const url=encodeURI(path);
  const key=url+'#w'+width;
  let cache=null;
  try{
    cache=await caches.open(THUMB_CACHE);
    const hit=await cache.match(key);
    if(hit) return URL.createObjectURL(await hit.blob());
  }catch(e){cache=null}

  if(!window.createImageBitmap) throw new Error('no createImageBitmap');
  let p=origBlobs.get(url);
  if(!p){
    p=fetch(url).then(r=>{if(!r.ok) throw new Error('HTTP '+r.status);return r.blob()});
    origBlobs.set(url,p);
  }
  const blob=await p;
  if(blob.size<450*1024) return URL.createObjectURL(blob);   // أصلاً خفيفة: لا نغيّرها

  const bmp=await createImageBitmap(blob,{resizeWidth:width,resizeQuality:'medium'});
  const c=document.createElement('canvas');
  c.width=bmp.width;c.height=bmp.height;
  c.getContext('2d').drawImage(bmp,0,0);
  if(bmp.close) bmp.close();
  const isPng=/\.png$/i.test(path);
  const out=await new Promise(res=>c.toBlob(res,isPng?'image/webp':'image/jpeg',.86));
  if(!out) throw new Error('toBlob failed');
  if(cache){try{await cache.put(key,new Response(out,{headers:{'Content-Type':out.type}}))}catch(e){}}
  return URL.createObjectURL(out);
}

async function loadImg(im){
  let src=encodeURI(im.dataset.src);
  try{src=await thumbURL(im.dataset.src,targetWidth(im))}catch(e){}
  im.src=src;
}

function pump(){
  while(active<MAX_PARALLEL&&queue.length){
    const im=queue.shift();active++;
    const slot=im.closest('.slot');
    const done=()=>{active--;pump()};
    im.onload=()=>{if(slot)slot.classList.add('ok');im.classList.add('in');done()};
    im.onerror=()=>{
      if(!im.dataset.retry&&im.src.startsWith('blob:')){   // النسخة الصغيرة فشلت: جرّب الأصلية
        im.dataset.retry='1';im.src=encodeURI(im.dataset.src);return;
      }
      im.remove();if(slot)slot.classList.add('bad');
      console.warn('صورة مش موجودة:',im.dataset.src);done();
    };
    loadImg(im);
  }
}
function loadScene(sc,first){
  if(sc.dataset.loaded) return;
  sc.dataset.loaded='1';
  $$('img[data-src]',sc).forEach(im=>{im.fetchPriority=first?'high':'low';queue.push(im)});
  pump();
}
/* القسم اللي المستخدم واصله: صوره تتقدم بالطابور */
function boost(sc){
  const mine=queue.filter(im=>sc.contains(im));
  mine.forEach(im=>queue.splice(queue.indexOf(im),1));
  queue.unshift(...mine);
  pump();
}

loadScene(scenes[0],true);

const lazy=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){loadScene(e.target,false);lazy.unobserve(e.target)}
}),{rootMargin:'60% 0px'});
scenes.forEach(s=>lazy.observe(s));

const seen=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){loadScene(e.target,false);boost(e.target)}
}),{threshold:.1});
scenes.forEach(s=>seen.observe(s));

/* بعد ما الهيرو يخلص تحميل (حدث load)، حمّل الباقي بالخلفية */
addEventListener('load',()=>setTimeout(()=>scenes.forEach(s=>loadScene(s,false)),1200));

/* ===== replay entrance animations ===== */
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.intersectionRatio>.4)e.target.classList.add('on');
  else if(e.intersectionRatio<.05)e.target.classList.remove('on');
}),{threshold:[0,.05,.4,.7]});
scenes.forEach(s=>io.observe(s));
setTimeout(()=>scenes[0].classList.add('on'),100);

/* ===== mouse parallax ===== */
addEventListener('pointermove',e=>{
  const r=document.documentElement.style;
  r.setProperty('--mx',(e.clientX/innerWidth-.5)*2);
  r.setProperty('--my',(e.clientY/innerHeight-.5)*2);
});

/* ===== confetti ===== */
function burst(){
  for(let i=0;i<46;i++){
    const s=document.createElement('span');
    s.textContent=['🎉','🎁','✨','💚','⭐'][i%5];
    s.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:-30px;font-size:${18+Math.random()*20}px;z-index:99;pointer-events:none;transition:transform ${2+Math.random()*2}s cubic-bezier(.3,.6,.4,1),opacity 2s ease-in 1.5s`;
    document.body.append(s);
    requestAnimationFrame(()=>{
      s.style.transform=`translate(${(Math.random()-.5)*200}px,${105+Math.random()*10}vh) rotate(${Math.random()*720}deg)`;
      s.style.opacity=0;
    });
    setTimeout(()=>s.remove(),4500);
  }
}
$$('.pillbtn.cta').forEach(b=>b.addEventListener('click',burst));

/* ===== تشخيص: أثقل الصور (بتطلع بالـ Console بعد ما الصفحة تحمل) =====
   افتح F12 ثم Console. أو اكتب imgSizes() بأي وقت بعد ما تنزل للآخر. */
window.imgSizes=function(){
  const rows=performance.getEntriesByType('resource')
    .filter(r=>/\.(jpe?g|png|webp)/i.test(r.name))
    .map(r=>({file:decodeURIComponent(r.name.split('/').pop()),MB:+(r.encodedBodySize/1048576).toFixed(2)}))
    .sort((a,b)=>b.MB-a.MB);
  const total=rows.reduce((t,r)=>t+r.MB,0).toFixed(1);
  console.log('مجموع الصور اللي تحمّلت: '+total+' MB');
  console.table(rows);
};
addEventListener('load',()=>setTimeout(window.imgSizes,10000));