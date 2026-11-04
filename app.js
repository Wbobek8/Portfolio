(() => {
  'use strict';
  const data=window.PORTFOLIO;if(!data)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=p=>p.split('.').reduce((o,k)=>o?.[k],data),pad=n=>String(n).padStart(2,'0');
  const category=id=>data.categories.find(c=>c.id===id),visible=()=>data.projects.filter(p=>p.visible!==false);
  const word=n=>n===1?'realizacja':n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14)?'realizacje':'realizacji';
  const hero=$('#hero-video'),dialog=$('#project-dialog'),stage=$('#player-stage');
  let current=null,index=0,lastTrigger=null,paused=false,available=false,inView=true;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),toggle=$('.video-toggle');

  $$('[data-bind]').forEach(el=>{const v=get(el.dataset.bind);if(v!==undefined)el.textContent=el.classList.contains('end-dot')?String(v).replace(/\.$/,''):v;});
  $$('[data-email]').forEach(el=>{el.textContent=data.site.email;el.href='mailto:'+data.site.email;});
  $$('[data-phone]').forEach(el=>{el.textContent=data.site.phone;el.href='tel:'+data.site.phone.replace(/[^+\d]/g,'');});
  if($('#year'))$('#year').textContent=new Date().getFullYear();
  const siteMedia=data.site.media||{};
  if(siteMedia.portrait)$$('.about-image').forEach(img=>img.src=siteMedia.portrait);
  if(hero){
    if(siteMedia.heroVideo)hero.dataset.src=siteMedia.heroVideo;
    if(siteMedia.heroPoster){hero.poster=siteMedia.heroPoster;const background=$('.hero-background');if(background)background.style.backgroundImage='url('+JSON.stringify(siteMedia.heroPoster)+')';}
  }


  let activeCategory='all',selectedProject=null,selectedVersion=0;
  const categoryItems=id=>visible().filter(p=>p.category===id).sort((a,b)=>Number(!!b.featured)-Number(!!a.featured));
  function rememberCategory(id,project,replace=false){
    try{const url=new URL(location.href);url.searchParams.delete('projekt');if(id==='all')url.searchParams.delete('kategoria');else url.searchParams.set('kategoria',id);if(project)url.searchParams.set('projekt',project);history[replace?'replaceState':'pushState']({},'',url);}catch{}
  }
  function stopCategoryPlayer(){const player=$('#category-player');if(!player)return;player.querySelector('video')?.pause();player.replaceChildren();}
  function renderCategory(id='all',projectId){
    if(!$('#category-cards'))return;
    stopCategoryPlayer();activeCategory=id;selectedProject=null;
    const overview=id==='all'||!category(id);$('#category-overview').hidden=!overview;$('#category-detail').hidden=overview;
    if(overview){
      $('#category-cards').innerHTML=data.categories.map((c,i)=>{const count=categoryItems(c.id).length;return `<a class="category-card" href="projekty.html?kategoria=${encodeURIComponent(c.id)}" data-category="${esc(c.id)}"><img src="${esc(c.cover||categoryItems(c.id)[0]?.videos[0]?.poster||'')}" alt="" width="900" height="320"><div class="category-card-copy"><p class="category-number">${pad(i+1)} <span>│</span></p><h2>${esc(c.label)}</h2><p>${esc(c.description||'')}</p></div><span class="category-card-arrow" aria-hidden="true">↗</span><span class="sr-only">${count} ${word(count)}</span></a>`;}).join('');
      return;
    }
    const c=category(id),items=categoryItems(id);
    $('#breadcrumb-category').textContent=c.label;$('#category-title').textContent=c.label;$('#category-description').textContent=c.description||'';
    $('#category-nav').innerHTML=data.categories.filter(x=>x.id!==id).map(x=>`<a href="projekty.html?kategoria=${encodeURIComponent(x.id)}" data-category="${esc(x.id)}">${esc(x.label)}</a>`).join('');
    $('#category-films').innerHTML=items.map(p=>{const v=p.videos[0];return `<button type="button" class="film-choice project-open" data-open="${esc(p.id)}" aria-pressed="false"><img src="${esc(v.poster)}" alt="" loading="lazy" width="700" height="240"><span class="film-choice-copy"><span class="film-arrow" aria-hidden="true">▶</span><span><strong>${esc(p.title)}</strong><small>${esc(p.type||p.client||'Projekt autorski')}</small></span></span>${v.duration?`<span class="film-duration">${esc(v.duration)}</span>`:''}</button>`;}).join('');
    $('#empty-projects').hidden=items.length>0;$('.selected-project').hidden=!items.length;
    if(items.length)selectProject(items.some(p=>p.id===projectId)?projectId:items[0].id);
  }
  function selectProject(id,updateUrl=false){
    const p=categoryItems(activeCategory).find(p=>p.id===id);if(!p)return;
    selectedProject=p;
    $('#selected-title').textContent=p.title;$('#selected-type').textContent=p.type||category(p.category)?.label||'';
    $('#selected-description').textContent=p.description||p.summary||'';
    $('#selected-goal').textContent=p.goal||'';$('#selected-goal-wrap').hidden=!p.goal;
    $('#selected-roles').innerHTML=(p.roles||[]).map(r=>'<li>'+esc(r)+'</li>').join('');
    $('#selected-client').textContent=p.client||'';$('#selected-client-wrap').hidden=!p.client;
    $$('.film-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.open===id)));
    $('#category-versions').hidden=p.videos.length<2;
    $('#category-versions').innerHTML=p.videos.map((v,i)=>`<button type="button" data-gallery-version="${i}" aria-pressed="${i===0}">${esc(v.title||'Wersja '+(i+1))}</button>`).join('');
    showCategoryVideo(0);
    if(updateUrl)rememberCategory(activeCategory,id,true);
  }
  function showCategoryVideo(i){
    const v=selectedProject?.videos[i];if(!v)return;selectedVersion=i;stopCategoryPlayer();
    const player=$('#category-player');player.classList.toggle('portrait',v.ratio==='9/16');
    if(v.src){
      const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.poster=v.poster||'';video.src=v.src;video.setAttribute('aria-label',v.title||selectedProject.title);player.append(video);
    }else{
      const cover=document.createElement('button');cover.type='button';cover.className='external-cover';cover.dataset.loadExternal='true';cover.setAttribute('aria-label','Odtwórz '+(v.title||selectedProject.title));cover.innerHTML=`<img src="${esc(v.poster)}" alt=""><span class="play-circle" aria-hidden="true">▶</span><span class="external-prompt">Odtwórz film</span>`;player.append(cover);
    }
    $('#category-current-film').textContent=v.title+(v.duration?' · '+v.duration:'');$('#category-source').href=v.external||v.src||embed(v);
    $$('[data-gallery-version]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.galleryVersion)===i)));
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-category]');if(link){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();renderCategory(link.dataset.category);rememberCategory(link.dataset.category);if(link.dataset.category!=='all')$('#category-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
    const version=e.target.closest('[data-gallery-version]');if(version)showCategoryVideo(Number(version.dataset.galleryVersion));
    const cover=e.target.closest('[data-load-external]');if(cover&&selectedProject){const v=selectedProject.videos[selectedVersion],frame=document.createElement('iframe');frame.title=v.title+' — odtwarzacz';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.src=embed(v);$('#category-player').replaceChildren(frame);}
  });
  window.addEventListener('popstate',()=>{const params=new URLSearchParams(location.search);renderCategory(params.get('kategoria')||'all',params.get('projekt'));});

  const embed=v=>v.embed||'https://www-ccv.adobe.io/v1/player/ccv/'+encodeURIComponent(v.id)+'/embed?bgcolor=%23070707&api_key=BehancePro2View';
  function showVideo(i){
    if(!current||i<0||i>=current.videos.length)return;index=i;const v=current.videos[i];
    stage.querySelector('video')?.pause();stage.replaceChildren();stage.classList.toggle('portrait',v.ratio==='9/16');
    const p=document.createElement(v.src?'video':'iframe');
    if(v.src){p.controls=true;p.playsInline=true;p.preload='metadata';p.src=v.src;p.poster=v.poster||'';p.setAttribute('aria-label',v.title);}
    else{p.src=embed(v);p.title=v.title+' — odtwarzacz';p.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';p.allowFullscreen=true;p.referrerPolicy='strict-origin-when-cross-origin';}
    stage.append(p);$('#current-film').textContent=current.videos.length>1?pad(i+1)+' / '+pad(current.videos.length)+' — '+v.title:v.title+(v.duration?' · '+v.duration:'');
    $('#previous-film').disabled=i===0;$('#next-film').disabled=i===current.videos.length-1;$('#previous-film').parentElement.hidden=current.videos.length<2;
    $('#source-link').href=v.external||v.src||embed(v);$$('.playlist-button').forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));
  }
  function open(id,trigger){
    const p=id==='about'?data.about:visible().find(p=>p.id===id);if(!p?.videos?.length)return;
    current=p;lastTrigger=trigger||null;$('#dialog-eyebrow').textContent=id==='about'?'O MNIE / WIDEO CV':'PORTFOLIO / PROJEKT';
    $('#dialog-category').textContent=category(p.category)?.label||'Wideo CV';$('#dialog-title').textContent=p.title;$('#dialog-client').textContent=p.client||(id==='about'?data.site.name:'Projekt autorski');
    $('#dialog-description').textContent=p.description;$('#dialog-goal').textContent=p.goal||'Przedstawić mnie i mój sposób pracy z obrazem.';
    $('#dialog-roles').innerHTML=(p.roles||(p.role||'').split(' · ')).map(r=>'<li>'+esc(r)+'</li>').join('');
    $('#playlist-section').hidden=p.videos.length<2;$('#playlist-count').textContent=pad(p.videos.length);
    $('#playlist').innerHTML=p.videos.map((v,i)=>`<button class="playlist-button" type="button" data-video="${i}" aria-pressed="false"><img src="${esc(v.poster)}" alt="" width="64" height="44"><span>${esc(v.title)}<small>${esc(v.duration||'')}</small></span></button>`).join('');
    showVideo(0);dialog.showModal();dialog.scrollTop=0;hero?.pause();$('.dialog-close').focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b){if($('#category-detail')&&!$('#category-detail').hidden&&b.classList.contains('film-choice'))selectProject(b.dataset.open,true);else open(b.dataset.open,b);}const v=e.target.closest('[data-video]');if(v)showVideo(Number(v.dataset.video));});
  $('.dialog-close')?.addEventListener('click',()=>dialog.close());$('#previous-film')?.addEventListener('click',()=>showVideo(index-1));$('#next-film')?.addEventListener('click',()=>showVideo(index+1));
  let outside=false;
  dialog?.addEventListener('pointerdown',e=>{const r=dialog.getBoundingClientRect();outside=e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;});
  dialog?.addEventListener('click',e=>{if(outside&&e.target===dialog)dialog.close();outside=false;});
  dialog?.addEventListener('close',()=>{stage.querySelector('video')?.pause();stage.replaceChildren();current=null;if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});playHero();});
  const menu=$('.menu-toggle'),nav=$('#mobile-nav');
  function closeMenu(){menu?.setAttribute('aria-expanded','false');if(nav)nav.hidden=true;}
  menu?.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));nav.hidden=expanded;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});matchMedia('(min-width: 901px)').addEventListener('change',closeMenu);
  function updateToggle(){if(!toggle)return;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Włącz film w tle':'Wstrzymaj film w tle');$('.video-toggle-label').textContent=paused?'Włącz tło':'Wstrzymaj tło';$('.pause-icon').textContent=paused?'▶':'Ⅱ';}
  function playHero(){if(!hero)return;if(!available||paused||motion.matches||!inView||document.hidden||dialog?.open){hero.pause();return;}hero.play().catch(()=>{paused=true;updateToggle();});}
  function startHero(){if(!hero||motion.matches||navigator.connection?.saveData)return;if(!available){hero.src=hero.dataset.src;hero.muted=true;available=true;}toggle.hidden=false;playHero();}
  toggle?.addEventListener('click',()=>{paused=!paused;updateToggle();playHero();});hero?.addEventListener('error',()=>{available=false;toggle.hidden=true;});
  motion.addEventListener('change',()=>{if(toggle)toggle.hidden=motion.matches;if(!motion.matches)startHero();playHero();});document.addEventListener('visibilitychange',playHero);
  if(hero&&'IntersectionObserver'in window)new IntersectionObserver(es=>{inView=es[0].isIntersecting;playHero();},{threshold:.05}).observe($('.hero'));
  let timer;function toast(s){const t=$('#toast');if(!t)return;t.textContent=s;t.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('visible'),3500);}
  $$('.copy-email').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.site.email);toast('Adres e-mail skopiowany.');}catch{toast('Mój adres: '+data.site.email);}}));
  const params=new URLSearchParams(location.search),c=params.get('kategoria');if($('#category-cards'))renderCategory(data.categories.some(x=>x.id===c)?c:'all',params.get('projekt'));startHero();if(params.get('projekt')&&!$('#category-cards'))open(params.get('projekt')); 
})();
