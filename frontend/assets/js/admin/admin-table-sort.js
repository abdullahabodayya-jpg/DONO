/* DONO admin: accessible sorting for fully loaded client-side tables.
   Orders and Coupons manage their own data-level sorting/pagination and are excluded. */
(() => {
  'use strict';
  const comparator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
  const SKIP = /^(actions?|images?|photo|select|checkbox)$/i;
  function keyForCell(cell, header) {
    const raw = (cell?.dataset.sortValue || cell?.textContent || '').trim();
    const low = raw.toLowerCase();
    if (!raw || raw === '—' || /^n\/a$/i.test(raw)) return {type:'empty', value:''};
    const isNumeric = /price|stock|quantity|amount|spent|orders|rating|products|count|discount|total|fee|percent|revenue|id$/i.test(header);
    const cleaned = raw.replace(/\b(?:USD|JOD|orders?|items?|products?)\b/gi, '').replace(/[$€,\s]/g, '');
    if (isNumeric && /^[-+]?\d+(?:\.\d+)?(?:%)?$/.test(cleaned)) return {type:'number',value:Number(cleaned.replace('%',''))};
    if (/date|created|updated|joined|expire|start|end|time/i.test(header)) {
      const time = Date.parse(raw);
      if (!Number.isNaN(time)) return {type:'number',value:time};
    }
    return {type:'text', value:low};
  }
  function init(table) {
    if (table.dataset.donoAutoSort === 'off') return;
    if (table.querySelector('thead .sort-btn, thead .sort-button, thead [data-sort]')) return;
    if (table.dataset.donoSortReady) return;
    const body = table.tBodies[0], heads = Array.from(table.tHead?.rows?.[0]?.cells || []);
    if (!body || !heads.length) return;
    table.dataset.donoSortReady = 'true';
    let active = -1, direction = 1;
    const buttons=[];
    function apply() {
      if (active < 0) return;
      const rows=Array.from(body.rows);
      if (!rows.length || rows.some(row=>row.cells.length!==heads.length || row.querySelector('[colspan]'))) return;
      const header=heads[active].textContent.trim();
      const entries=rows.map((row,index)=>({row,index,info:keyForCell(row.cells[active],header)}));
      entries.sort((a,b)=>{
        if(a.info.type==='empty' || b.info.type==='empty'){
          if(a.info.type!==b.info.type) return a.info.type==='empty'?1:-1;
          return a.index-b.index;
        }
        let diff=(a.info.type==='number'&&b.info.type==='number') ? a.info.value-b.info.value : comparator.compare(String(a.info.value),String(b.info.value));
        return diff*direction || a.index-b.index;
      });
      if (entries.every((v,index)=>v.row===rows[index])) return;
      // Reordering existing row nodes preserves action listeners and image-loading state.
      entries.forEach(e=>body.appendChild(e.row));
    }
    heads.forEach((head,index)=>{
      const name=head.textContent.trim();
      if (!name || SKIP.test(name) || head.querySelector('button,a,input') || head.hasAttribute('colspan')) {buttons.push(null);return;}
      head.setAttribute('aria-sort','none');
      const button=document.createElement('button');button.type='button';button.className='dono-admin-sort-button';
      button.setAttribute('aria-label',`Sort by ${name}`);
      const label=document.createElement('span');label.textContent=name;
      const arrow=document.createElement('span');arrow.className='dono-admin-sort-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↕';
      head.replaceChildren(button);button.append(label,arrow);
      button.addEventListener('click',()=>{
        direction=active===index ? -direction : 1;active=index;
        heads.forEach((h,i)=>{if(buttons[i]) {h.setAttribute('aria-sort',i===active?(direction===1?'ascending':'descending'):'none');buttons[i].lastElementChild.textContent=i===active?(direction===1?'↑':'↓'):'↕';}});
        apply();
      });
      buttons.push(button);
    });
    // Any current client-side filters/search may re-render table rows. Reapply active sorting.
    const observer=new MutationObserver(()=>{ if(active>=0) apply(); });
    observer.observe(body,{childList:true});
  }
  function initialize(){
    document.querySelectorAll('.admin-layout table').forEach(init);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
