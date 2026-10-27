(() => {
  const report=document.querySelector('.report');
  if(!report)return;
  const nav=[...report.querySelectorAll('.report-toc nav a')];
  const targets=nav.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
  const progress=report.querySelector('.reading-progress i');
  let queued=false;
  function update(){
    let current=targets[0];
    for(const t of targets)if(t.getBoundingClientRect().top<Math.min(180,innerHeight*.25))current=t;
    nav.forEach(a=>{const active=a.hash==='#'+current?.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    const max=document.documentElement.scrollHeight-innerHeight;
    if(progress)progress.style.width=(max>0?Math.min(100,Math.max(0,scrollY/max*100)):100)+'%';
    queued=false;
  }
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}}, {passive:true});
  addEventListener('resize',update);update();
  const titles={bimanual:'Astra · 双臂协作',numbers:'Astra · Random number 排列',comparison:'Astra Direct'};
  report.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{
    report.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    report.querySelector('[data-case-title]').textContent=titles[button.dataset.case];
    report.querySelector('.comparison-placeholder').hidden=button.dataset.case!=='comparison';
  }));
  const lightbox=report.querySelector('.figure-lightbox');
  report.querySelector('[data-figure-zoom]')?.addEventListener('click',()=>lightbox.showModal());
  report.querySelector('[data-figure-close]')?.addEventListener('click',()=>lightbox.close());
  lightbox?.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close();});
})();
