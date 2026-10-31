(() => {
  const url = new URL('../../backend/public/api/admin/custom-box/catalog', document.baseURI).pathname;
  let products=[];
  const roles=['box','gift','extra','card'];
  const list=document.getElementById('box-catalog-list');
  const search=document.getElementById('box-catalog-search');
  const status=document.getElementById('box-catalog-message');
  function paint(){
    const q=search.value.trim().toLowerCase();list.replaceChildren();
    const subset=products.filter(p=>String(p.id)===q||p.name.toLowerCase().includes(q)).slice(0,120);
    if(!subset.length){list.textContent='No matching products.';return;}
    for(const p of subset){
      const line=document.createElement('div');line.className='builder-admin-line';
      const title=document.createElement('strong');title.textContent=p.name;
      const hint=document.createElement('small');hint.textContent=`#${p.id} · ${Number(p.price).toFixed(2)} USD · Stock ${p.stock_quantity}`;title.append(hint);line.append(title);
      const chosen=String(p.roles||'').split(',');
      for(const role of roles){
        const label=document.createElement('label');
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=chosen.includes(role);checkbox.setAttribute('aria-label',`${role}: ${p.name}`);
        checkbox.onchange=async()=>{
          checkbox.disabled=true;status.textContent='Saving…';
          try{
            const response=await fetch(url,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:Number(p.id),role,enabled:checkbox.checked})});
            const result=await response.json();if(!response.ok||!result.success)throw Error(result.message||'Save failed');
            const arr=new Set(String(p.roles||'').split(',').filter(Boolean));if(checkbox.checked)arr.add(role);else arr.delete(role);p.roles=[...arr].join(',');status.textContent='Saved.';
          }catch(e){checkbox.checked=!checkbox.checked;status.textContent=e.message;}finally{checkbox.disabled=false;}
        };
        label.append(checkbox,document.createTextNode(role.toUpperCase()));line.append(label);
      }
      list.append(line);
    }
  }
  search.oninput=paint;
  fetch(url,{credentials:'same-origin'}).then(async res=>{const json=await res.json();if(!res.ok||!json.success)throw new Error(json.message||'Unable to load catalog');return json.data;}).then(data=>{products=data;status.textContent=`${products.length} products — choose builder roles below.`;paint();}).catch(e=>{status.textContent=e.message;});
})();
