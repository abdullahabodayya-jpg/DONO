const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];

/* brand circles (S2) */
(function(){
  const el=$('#brands');
  const cfg=[[-1,76,7],[5,66,4.6],[11,70,8],[15,82,5.4],[21,76,6],[27,81,6.4],[56,76,5.8],[61,82,6.2],[66,74,7.6],[73,80,6],[78,82,6.8],[84,77,5],[88,70,6.4],[94,78,8]];
  cfg.forEach(([l,t,w],i)=>{
    const b=document.createElement('b');
    b.className='slot circ';
    b.dataset.img='brand-'+(i+1)+'.jpg';
    b.dataset.ph='logo';
    b.style.cssText=`--l:${l}vw;--t:${t}vh;--w:${w}vw;--bg:var(--g4);--d:${i%6};--k:${(i%3-1)*8};--sp:${-30-i*6}`;
    el.appendChild(b);
  });
})();

/* Soft falling circles on scene 2 */
(function(){
  const scene=$('.s2');
  const colors=['#55e06f','#cce1ff','#ffc4f8','#fff8b6','#ffffff'];
  for(let i=0;i<34;i++){
    const c=document.createElement('i');
    c.className='rain';
    c.style.cssText=`left:${(i*37)%100}%;--rain-color:${colors[i%colors.length]};--dur:${5+(i%8)*.8}s;--delay:${-(i%11)*.9}s;--drift:${(i%2?1:-1)*(8+(i%5)*9)}px;width:${7+(i%5)*3}px`;
    scene.appendChild(c);
  }
})();

/* image slots: تم الربط بمجلد image بناءً على محرر النصوص لديك */
$$('.slot').forEach(s=>{
  const n=s.dataset.img,fl=document.createElement('span');
  fl.className='fl';
  const im=new Image();
  im.alt=s.dataset.img ? s.dataset.img.replace(/[-_]/g,' ').replace(/\.(jpg|png|jpeg|webp)$/i,'') : 'Wishly gift inspiration';
  im.onload=()=>s.classList.add('ok');
  im.onerror=()=>im.remove();
  im.src='image/'+n; // مسار المجلد تم تعديله إلى image/
  const ph=document.createElement('span');
  ph.className='ph';
  ph.textContent=s.dataset.ph||n;
  fl.append(ph,im);
  s.append(fl);
});

/* duplicate marquee track */
const tr=$('#track');
tr.innerHTML+=tr.innerHTML;
$$('#track .slot.flow').forEach(s=>{if(!s.firstChild){}});

/* typewriter */
function typer(el,words,speed=90){
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

/* tabs */
const subs=['Wishly lets you claim friends’ wishes privately, so their gifts stay a surprise.','Explore thoughtful gift boxes, curated hampers, and bundles for every special occasion.','Birthdays, anniversaries, celebrations, and thank-you gifts: find a bundle for every moment.'];
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

/* scroll engine */
const scenes=$$('.scene'),bar=$('#bar');
let busy=false;

function tick(){
  busy=false;
  const H=innerHeight;
  let th='dark';
  scenes.forEach((s)=>{
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

/* replay entrance animations */
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.intersectionRatio>.4)e.target.classList.add('on');
  else if(e.intersectionRatio<.05)e.target.classList.remove('on');
}),{threshold:[0,.05,.4,.7]});

scenes.forEach(s=>io.observe(s));
setTimeout(()=>scenes[0].classList.add('on'),100);

/* mouse parallax */
addEventListener('pointermove',e=>{
  const r=document.documentElement.style;
  r.setProperty('--mx',(e.clientX/innerWidth-.5)*2);
  r.setProperty('--my',(e.clientY/innerHeight-.5)*2);
});

/* confetti */
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