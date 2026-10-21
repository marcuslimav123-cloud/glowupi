(function(){
  const $=id=>document.getElementById(id);
  const fmt=v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt0=v=>'R$ '+Number(v).toLocaleString('pt-BR',{maximumFractionDigits:0});
  const fmtN=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const r2=v=>Math.round(Number(v)*100)/100;
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- estado ----------
  // Vem do servidor (/api/state). No tablet fica só uma cópia do que é público, pra abrir rápido mesmo sem sinal.
  // Chave Pix, token do Mercado Pago e PIN nunca passam por aqui.
  const CACHE='ajude-nenem-v3-cache',DEVICE='ajude-nenem-device';
  let st={driverName:'',babyName:'',lmp:'',goal:15000,fee:1,total:0,votes:{boy:0,girl:0},mode:'off'};
  const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
  try{Object.assign(st,JSON.parse(lsGet(CACHE))||{});}catch(e){}
  try{localStorage.removeItem('ajude-nenem-v2');localStorage.removeItem('ajude-nenem-v1');}catch(e){}   // versões antigas guardavam a chave Pix no tablet
  const total=()=>st.total;
  const charge=v=>r2(v*(1+st.fee/100));     // a taxa do Pix vai por conta de quem doa
  function renderAmounts(){
    const vals=[...document.querySelectorAll('.amt[data-amt]')].map(b=>{const v=charge(+b.dataset.amt);b.querySelector('.val').innerHTML=`<sup>R$</sup>${fmtN(v)}`;return v;});
    $('ctaHint').textContent=`Pix rapidinho, a partir de ${fmt(Math.min(...vals))}. Leva menos de 1 minuto.`;
  }

  // ---------- gestação real (calendário) ----------
  const DAY=86400000;
  const lmpDate=()=>st.lmp?new Date(st.lmp+'T00:00:00'):null;
  function gestDays(){const l=lmpDate();if(!l)return 0;const now=new Date();now.setHours(0,0,0,0);return Math.max(0,Math.min(294,Math.round((now-l)/DAY)));}
  const gw=()=>Math.min(40,Math.floor(gestDays()/7));
  function gestLabel(){const d=gestDays(),w=Math.floor(d/7),r=d%7;if(!st.lmp)return 'Gestação a configurar';if(d>=280)return w>40?'Passou das 40 semanas':'40 semanas, chegou a hora';return w?`${w} ${w===1?'semana':'semanas'}${r?` e ${r} ${r===1?'dia':'dias'}`:''}`:`${r} ${r===1?'dia':'dias'}`;}
  const dueDate=()=>{const l=lmpDate();return l?new Date(l.getTime()+280*DAY):null;};
  const fmtDate=d=>d.toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
  const daysToBirth=()=>{const d=dueDate();if(!d)return null;const now=new Date();now.setHours(0,0,0,0);return Math.round((d-now)/DAY);};
  const pct=v=>Math.min(100,Math.round(v/st.goal*1000)/10);
  const gender=()=>{const {boy,girl}=st.votes;return boy===girl?'':(boy>girl?'boy':'girl');};

  // ---------- neném ----------
  const STAGES=[[0,'uma sementinha','🌱'],[4,'um feijãozinho','🫘'],[8,'uma ameixa','🍑'],[12,'um limão','🍋'],[16,'um abacate','🥑'],[20,'uma manga','🥭'],[24,'uma berinjela','🍆'],[28,'um coco','🥥'],[32,'um melão','🍈'],[36,'uma melancia','🍉']];
  function stageOf(w){let s=STAGES[0];for(const x of STAGES)if(w>=x[0])s=x;return s;}
  const sizeText=w=>w>=40?'pronto pra nascer':'do tamanho de '+stageOf(w)[1];
  const fruitOf=w=>w>=40?'👶':stageOf(w)[2];
  const scaleOf=w=>0.64+0.46*(w/40);
  function babySvg(w,g){
    const t=w/40,eyesOpen=w>=20,paci=w>=24,hairN=Math.round(t*5);
    const blanket=g==='boy'?'url(#blanket2)':g==='girl'?'url(#blanketGirl)':(w>=20?'url(#blanket2)':'url(#blanket)');
    const acc=g==='girl'
      ?`<g transform="translate(126 56) rotate(18)"><ellipse cx="-9" cy="0" rx="9" ry="6" fill="#e89ab6"/><ellipse cx="9" cy="0" rx="9" ry="6" fill="#e89ab6"/><circle cx="0" cy="0" r="3.5" fill="#c2688a"/></g>`
      :g==='boy'?`<path d="M62 70 q38 -42 76 0" fill="#8db7e8"/><path d="M58 70 h84" stroke="#5a86bf" stroke-width="7" stroke-linecap="round"/><circle cx="100" cy="48" r="5" fill="#5a86bf"/>`:'';
    let hair='';for(let i=0;i<hairN;i++){const x=88+i*6-hairN*3;hair+=`<path d="M${x} 62 q3 -14 10 -8" stroke="#5a3d31" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;}
    const eyes=eyesOpen
      ?`<ellipse cx="87" cy="96" rx="4.5" ry="6" fill="#3a2740"/><ellipse cx="113" cy="96" rx="4.5" ry="6" fill="#3a2740"/><circle cx="85.5" cy="93.5" r="1.6" fill="#fff"/><circle cx="111.5" cy="93.5" r="1.6" fill="#fff"/>`
      :`<path d="M81 97 q6 5 12 0" stroke="#3a2740" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M107 97 q6 5 12 0" stroke="#3a2740" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const mouth=paci
      ?`<ellipse cx="100" cy="113" rx="9" ry="6" fill="#e89ab6"/><circle cx="100" cy="113" r="3.2" fill="#ffe0ea"/><rect x="97" y="106" width="6" height="4" rx="2" fill="#c2688a"/>`
      :`<path d="M94 111 q6 6 12 0" stroke="#3a2740" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return `
    <ellipse cx="100" cy="166" rx="54" ry="9" fill="rgba(120,40,60,.12)"/>
    <path d="M58 118 q-10 50 42 54 q52 -4 42 -54 q-8 -18 -42 -18 q-34 0 -42 18z" fill="${blanket}"/>
    <path d="M70 122 q30 18 60 0" stroke="rgba(255,255,255,.8)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="62" cy="150" r="11" fill="url(#skin)"/><circle cx="138" cy="150" r="11" fill="url(#skin)"/>
    <circle cx="100" cy="90" r="42" fill="url(#skin)"/>
    <circle cx="58" cy="92" r="8" fill="url(#skin)"/><circle cx="142" cy="92" r="8" fill="url(#skin)"/>
    ${g==='boy'?'':hair}${acc}${eyes}
    <circle cx="76" cy="106" r="6" fill="#e89ab6" opacity=".7"/><circle cx="124" cy="106" r="6" fill="#e89ab6" opacity=".7"/>
    ${mouth}
    <path d="M100 40 c-6 -9 -18 -3 -14 6 c3 6 14 12 14 12 s11 -6 14 -12 c4 -9 -8 -15 -14 -6z" fill="#d97a5b" opacity="${0.4+0.6*t}"><animate attributeName="transform" type="scale" values="1;1.16;1;1.1;1" keyTimes="0;.15;.3;.45;1" dur="1.4s" repeatCount="indefinite" additive="sum"/></path>`;
  }

  // contador que sobe suave
  let shown=0,cntRaf=null;
  function countTo(v,ms){
    cancelAnimationFrame(cntRaf);const from=shown,t0=performance.now();
    if(reduce||ms<=0){shown=v;$('raised').textContent=fmt(v);return;}
    (function step(now){const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,3);shown=from+(v-from)*e;$('raised').textContent=fmt(shown);if(k<1)cntRaf=requestAnimationFrame(step);else{shown=v;$('raised').textContent=fmt(v);}})(t0);
  }
  function render(animate){
    const w=gw(),tot=total(),p=Math.min(1,tot/st.goal),due=dueDate(),left=daysToBirth();
    const nasce=due?(left>0?`Nasço em ${fmtDate(due)}.`:left===0?'É hoje!':'Posso chegar a qualquer hora.'):'';
    $('weekLabel').innerHTML=`<b>${gestLabel()}</b><span class="t-support">Estou ${sizeText(w)}. ${nasce}</span>`;
    $('fruit').textContent=fruitOf(w);
    tick();
    countTo(tot,animate?1100:0);
    $('goalLabel').textContent='de '+fmt0(st.goal);
    $('barFill').style.width=(p*100)+'%';
    $('leftLabel').textContent=tot>=st.goal?'Meta batida. Obrigado a cada um que me ajudou.':`${pct(tot).toLocaleString('pt-BR')}% da minha meta. Faltam ${fmt(st.goal-tot)}.`;
    $('eyebrow').textContent=st.babyName?`Oi, eu sou ${st.babyName}`:'Oi, eu sou o neném do papai';
    const pai=st.driverName?`Meu papai é o <b>${esc(st.driverName)}</b>, ele`:'Meu papai';
    $('subLine').innerHTML=`Sou eu, aqui da barriga da mamãe. ${pai} dirige por aplicativo e inventou este tablet pra juntar <b>${fmt0(st.goal)}</b> até eu chegar${due?`, lá por <b>${fmtDate(due)}</b>`:''}. A ideia foi dele, eu só entrei com a fofura.`;
    const svg=$('babySvg');svg.innerHTML=babySvg(w,gender());svg.style.transform=`scale(${scaleOf(w)})`;
    renderPoll();
  }
  // relógio: tempo que falta até o dia do parto, segundo a segundo; o anel esvazia junto
  const pad=n=>String(n).padStart(2,'0');
  function tick(){
    const due=dueDate();const clock=$('clock');
    if(!due){clock.textContent='Configura a gestação pra eu contar os dias';return;}
    const now=new Date(),ms=due-now;
    if(ms<=0){clock.textContent='Chegou a hora. Papai, estou pronto!';$('ringFill').style.strokeDashoffset=735.1;$('ringHand').style.transform='rotate(0deg)';return;}
    const d=Math.floor(ms/DAY),h=Math.floor(ms%DAY/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
    const lead=d>30?'Papai está contando os segundos':d>7?'Falta pouco, papai conta os segundos':'Papai não dorme mais';
    clock.innerHTML=`${lead}: <b>${d} ${d===1?'dia':'dias'}, ${pad(h)}:${pad(m)}:${pad(s)}</b>`;
    const frac=Math.max(0,Math.min(1,ms/(280*DAY)));          // quanto ainda falta das 40 semanas
    $('ringFill').style.strokeDashoffset=735.1*(1-frac);
    $('ringHand').style.transform=`rotate(${frac*360}deg)`;     // ponteiro na ponta do arco, girando com os segundos
  }
  function renderPoll(){
    const {boy,girl}=st.votes,n=boy+girl,g=gender();
    const pb=n?Math.round(boy/n*100):50;
    [['pollBoy','pollGirl'],['pollBoy2','pollGirl2']].forEach(([a,b])=>{$(a).style.width=pb+'%';$(b).style.width=(100-pb)+'%';$(a).style.opacity=$(b).style.opacity=n?1:.35;});
    $('nBoy').textContent=boy;$('nGirl').textContent=girl;
    $('pollHint').textContent=!n?'Faz o Pix e dá seu palpite':g==='boy'?`Menino na frente, ${pb}%`:g==='girl'?`Menina na frente, ${100-pb}%`:'Empate. Me desempata aí';
    document.querySelectorAll('.orb,.avatar').forEach(o=>{o.classList.toggle('boy',g==='boy');o.classList.toggle('girl',g==='girl');});
  }

  // ---------- fundo: brilho fixo e estrelas discretas (um quadro, sem loop) ----------
  function bgfx(){
    const c=$('bgfx'),ctx=c.getContext('2d');
    function draw(){
      const W=c.width=Math.floor(innerWidth/2),H=c.height=Math.floor(innerHeight/2);
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.28,H*.42,0,W*.28,H*.42,Math.max(W,H)*.6);
      g.addColorStop(0,'rgba(242,166,122,.10)');g.addColorStop(1,'rgba(242,166,122,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      let seed=7;const R=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
      for(let i=0;i<70;i++){const a=.08+R()*.22;ctx.fillStyle=`rgba(242,241,238,${a})`;ctx.beginPath();ctx.arc(R()*W,R()*H,.4+R()*.9,0,6.28);ctx.fill();}
    }
    draw();addEventListener('resize',draw);
  }

  // ---------- celebração: papel picado com física, duas cores ----------
  function burst(cx,cy,n){
    if(reduce)return;
    const layer=$('fx'),cols=['#f2a67a','#f2f1ee','#f2a67a','#d97a5b'];
    for(let i=0;i<n;i++){
      const el=document.createElement('i');el.className='p '+(Math.random()<.6?'strip':'round');
      el.style.background=cols[Math.floor(Math.random()*cols.length)];el.style.scale=.7+Math.random()*.8;
      const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.2,v=240+Math.random()*460,ux=Math.cos(a)*v,uy=Math.sin(a)*v;
      const dur=1400+Math.random()*1000,g=850+Math.random()*450,rx=Math.random()*720-360,ry=Math.random()*720-360,rz=Math.random()*540-270,sway=(Math.random()-.5)*110;
      layer.appendChild(el);
      el.animate([
        {transform:`translate(${cx}px,${cy}px) rotateX(0) rotateY(0) rotateZ(0)`,opacity:1,offset:0},
        {transform:`translate(${cx+ux*.55}px,${cy+uy*.55}px) rotateX(${rx*.4}deg) rotateY(${ry*.4}deg) rotateZ(${rz*.4}deg)`,opacity:1,offset:.28,easing:'cubic-bezier(.16,1,.3,1)'},
        {transform:`translate(${cx+ux*.85+sway}px,${cy+uy*.85+g*.25}px) rotateX(${rx*.7}deg) rotateY(${ry*.7}deg) rotateZ(${rz*.7}deg)`,opacity:1,offset:.6,easing:'ease-in'},
        {transform:`translate(${cx+ux+sway*2}px,${cy+uy+g}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,opacity:0,offset:1,easing:'ease-in'}
      ],{duration:dur,fill:'forwards'}).onfinish=()=>el.remove();
    }
  }
  function ripple(el){if(reduce||!el)return;el.animate([{transform:'scale(1)',opacity:.9},{transform:'scale(2.2)',opacity:0}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});}
  function celebrate(){const r=$('babySvg2').getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;burst(cx,cy,90);setTimeout(()=>burst(cx,cy,50),280);}


  // ---------- servidor ----------
  function api(path,opts={}){
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),12000);
    const headers={'Content-Type':'application/json',...(opts.token?{Authorization:'Bearer '+opts.token}:{})};
    return fetch(path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,signal:ctl.signal})
      .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||('Erro '+r.status));e.status=r.status;throw e;}return d;})
      .finally(()=>clearTimeout(t));
  }
  function syncState(animate){
    return api('/api/state').then(d=>{
      const changed=JSON.stringify(d)!==JSON.stringify(st);
      st=d;lsSet(CACHE,JSON.stringify(d));
      if(changed){renderAmounts();render(animate);}
    }).catch(()=>{});
  }

  // ---------- telas ----------
  const screens=['s-pin','s-setup','s-home','s-pick','s-pay'];
  let idle=null;
  function show(id){screens.forEach(s=>$(s).hidden=(s!==id));clearTimeout(idle);if(id==='s-pick'||id==='s-pin'||id==='s-setup')armIdle(id==='s-pick'?60000:180000);scrollTo(0,0);}
  // se o passageiro abriu os valores e largou, volta pro convite sozinho (a configuração também fecha sozinha)
  function armIdle(ms){clearTimeout(idle);idle=setTimeout(goHome,ms||60000);}
  function goHome(){$('otherRow').hidden=true;$('otherAmt').value='';adminToken='';show('s-home');}
  function openPick(){const s=$('babySvgPick');s.innerHTML=babySvg(gw(),gender());show('s-pick');}
  $('helpBtn').onclick=openPick;
  $('hero').onclick=openPick;
  $('pickBack').onclick=goHome;
  ['s-pick','s-pin','s-setup'].forEach(id=>$(id).addEventListener('pointerdown',()=>armIdle(id==='s-pick'?60000:180000)));
  $('otherAmt').addEventListener('input',()=>armIdle());
  let current=0,payload='',poll=null,payRef=null;
  function stopPoll(){clearInterval(poll);poll=null;}
  function renderQr(text,base64){
    const box=$('qrcode');box.innerHTML='';
    if(base64){const img=new Image();img.alt='QR Code Pix';img.src='data:image/png;base64,'+base64;box.appendChild(img);return;}
    try{new QRCode(box,{text,width:256,height:256,correctLevel:QRCode.CorrectLevel.M});}
    catch(e){box.innerHTML='<p>Sem internet pro QR. Usa o código copia e cola abaixo.</p>';}
  }
  function manualMode(note){
    $('qrWrap').classList.remove('waiting');
    $('waitBox').hidden=true;disarm();
    const paired=!!lsGet(DEVICE);
    $('paidBtn').hidden=!paired;
    $('payHint').textContent=note||(paired?'Depois de pagar, toca em “Já fiz o Pix”.':'Obrigado! Assim que o Pix cair, o papai vê.');
  }
  function openPay(amount){
    amount=r2(amount);if(!(amount>0))return;
    amount=charge(amount);current=amount;payRef=null;stopPoll();
    $('feeNote').textContent=st.fee>0?`Já inclui ${fmtN(st.fee).replace(',00','')}% da taxa do Pix, pra sua ajuda chegar inteirinha pra mim.`:'';
    const w=gw(),after=total()+amount;
    $('payAmount').textContent=fmt(amount);
    $('copyText').textContent='';$('qrcode').innerHTML='';payload='';
    const mini=$('babySvgMini');mini.innerHTML=babySvg(w,gender());mini.style.transform=`scale(${scaleOf(w)})`;
    $('peekText').innerHTML=after>=st.goal?`Com esse Pix a minha meta é <b>batida</b>. Já posso vir!`:`Com esse Pix a minha meta vai pra <b>${pct(after).toLocaleString('pt-BR')}%</b>. Faltam ${fmt(st.goal-after)}.`;
    show('s-pay');
    $('paidBtn').hidden=true;$('waitBox').hidden=false;$('waitText').textContent='Gerando o QR Code…';$('qrWrap').classList.remove('waiting');
    $('payHint').textContent='Eu aviso aqui assim que entrar.';
    api('/api/pix',{method:'POST',body:{amount}}).then(d=>{
      if(!d||!d.qr_code)throw new Error('sem QR');
      payload=d.qr_code;$('copyText').textContent=payload;renderQr(payload,d.qr_code_base64);
      if(d.manual){manualMode(d.fallback?'O Pix automático está fora do ar. Paga pelo QR e toca em “Já fiz o Pix”.':'');return;}
      $('waitText').textContent='Esperando seu Pix chegar…';$('qrWrap').classList.add('waiting');
      const id=d.id,t=d.t,started=Date.now();
      poll=setInterval(()=>{
        if(Date.now()-started>20*60*1000){stopPoll();$('qrWrap').classList.remove('waiting');$('waitText').textContent='QR expirou. Volta e escolhe de novo.';return;}
        api(`/api/status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`).then(s=>{if(s&&s.status==='approved'){stopPoll();payRef={id,t};donate(r2(s.amount)||amount);}}).catch(()=>{});
      },3000);
    }).catch(e=>{$('waitText').textContent='Não deu pra gerar o Pix: '+(e.message||'sem conexão');});
  }
  $('amountGrid').addEventListener('click',e=>{const b=e.target.closest('.amt');if(!b||b.id==='otherBtn')return;openPay(b.dataset.amt);});
  $('otherBtn').onclick=()=>{$('otherRow').hidden=false;$('otherAmt').focus();};
  $('otherGo').onclick=()=>openPay(String($('otherAmt').value).replace(',','.'));
  $('otherAmt').addEventListener('keydown',e=>{if(e.key==='Enter')$('otherGo').click();});
  $('backBtn').onclick=()=>{stopPoll();$('otherRow').hidden=true;show('s-pick');};
  $('copyBtn').onclick=()=>{
    const done=()=>{$('copyBtn').textContent='Copiado. Cola no app do banco.';setTimeout(()=>$('copyBtn').textContent='Copiar código Pix',2500);};
    const selectText=()=>{const r=document.createRange();r.selectNodeContents($('copyText'));const s=getSelection();s.removeAllRanges();s.addRange(r);};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(payload).then(done).catch(selectText);}else selectText();
  };

  let armed=false,armTimer=null;
  $('paidBtn').onclick=()=>{
    if(!armed){armed=true;$('paidBtn').textContent='Confirma? Toca de novo';armTimer=setTimeout(disarm,4000);return;}
    disarm();$('paidBtn').disabled=true;
    api('/api/manual',{method:'POST',token:lsGet(DEVICE),body:{amount:current}})
      .then(d=>{payRef=d;donate(current);})
      .catch(e=>{if(e.status===401)lsSet(DEVICE,null);$('payHint').textContent='Não consegui registrar: '+e.message;})
      .finally(()=>{$('paidBtn').disabled=false;});
  };
  function disarm(){armed=false;clearTimeout(armTimer);$('paidBtn').textContent='Já fiz o Pix';}

  const THANKS=['Obrigado!','Senti daqui de dentro','Papai vai ficar feliz','Você é demais'];
  function donate(amount){
    const tBefore=total();
    st.total=r2(st.total+amount);   // o servidor já contou; aqui só adianta a tela até a próxima sincronização
    const w=gw(),tot=total(),done=tot>=st.goal;
    $('thanksTitle').textContent=done?'Meta batida!':THANKS[Math.floor(Math.random()*THANKS.length)];
    $('thanksPlus').textContent='+ '+fmt(amount);
    $('thanksGrow').innerHTML=`${pct(tBefore).toLocaleString('pt-BR')}% → <b>${pct(tot).toLocaleString('pt-BR')}% da minha meta</b>`;
    $('thanksLine').innerHTML=st.lmp?`Estou com <b>${gestLabel()}</b>, ${sizeText(w)}. Sua ajuda já virou um pedacinho do meu enxoval.`:'Sua ajuda vira fralda, consulta e o meu dia de chegar.';
    $('thanksWeek').textContent=done?'Obrigado a cada passageiro que me ajudou a chegar.':`Faltam ${fmt(st.goal-tot)} pro meu dia`;
    const s2=$('babySvg2');s2.innerHTML=babySvg(w,gender());s2.style.setProperty('--s',scaleOf(w));$('fruit2').textContent=fruitOf(w);
    $('vote').hidden=!payRef;$('voteResult').hidden=true;
    $('thanks').classList.add('on');
    setTimeout(celebrate,250);
    render(true);ripple($('ripple'));
    clearTimeout(thanksTimer);thanksTimer=setTimeout(closeThanks,40000);
    setTimeout(()=>syncState(true),2500);
  }
  let thanksTimer=null;
  function closeThanks(){$('thanks').classList.remove('on');goHome();}
  $('thanksClose').onclick=closeThanks;
  function vote(g){
    if(!payRef)return;
    $('vote').hidden=true;
    const before=gender();
    api('/api/vote',{method:'POST',body:{id:payRef.id,t:payRef.t,g}}).then(d=>{
      st.votes=d.votes;lsSet(CACHE,JSON.stringify(st));
      renderPoll();const now=gender();
      const w=gw();const s2=$('babySvg2');s2.innerHTML=babySvg(w,now);
      const {boy,girl}=st.votes,n=boy+girl,pb=Math.round(boy/n*100);
      $('voteText').innerHTML=g==='boy'?`Você e mais <b>${boy-1}</b> acham que sou menino. Placar: <b>${pb}%</b> menino, <b>${100-pb}%</b> menina.`:`Você e mais <b>${girl-1}</b> acham que sou menina. Placar: <b>${100-pb}%</b> menina, <b>${pb}%</b> menino.`;
      if(now&&now!==before)$('voteText').innerHTML+=now==='boy'?' Olha eu de menininho!':' Olha eu de menininha!';
      $('voteResult').hidden=false;
      const r=s2.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,50);
    }).catch(e=>{$('voteText').textContent=e.message;$('voteResult').hidden=false;});
    payRef=null;
    clearTimeout(thanksTimer);thanksTimer=setTimeout(closeThanks,9000);
  }
  $('voteBoy').onclick=()=>vote('boy');$('voteGirl').onclick=()=>vote('girl');

  // ---------- configuração (protegida por PIN, salva no servidor) ----------
  let adminToken='',adminCfg=null;
  const daysSince=lmp=>{if(!lmp)return null;const now=new Date();now.setHours(0,0,0,0);return Math.max(0,Math.round((now-new Date(lmp+'T00:00:00'))/DAY));};
  function openPin(){$('pinInput').value='';$('pinMsg').textContent='';show('s-pin');setTimeout(()=>$('pinInput').focus(),50);}
  $('pinCancel').onclick=goHome;
  $('setupCancel').onclick=goHome;
  $('pinForm').addEventListener('submit',e=>{
    e.preventDefault();$('pinMsg').textContent='';
    api('/api/login',{method:'POST',body:{pin:$('pinInput').value}}).then(d=>{
      adminToken=d.admin;lsSet(DEVICE,d.device);   // pareia este tablet (pode registrar o "Já fiz o Pix")
      return loadSetup();
    }).then(()=>show('s-setup')).catch(err=>{$('pinMsg').textContent=err.message;$('pinInput').value='';});
  });
  function loadSetup(){
    return api('/api/admin/config',{token:adminToken}).then(d=>{
      const c=adminCfg=d.config;
      $('keyType').value=c.keyType;$('pixKey').value=c.pixKey;$('pixName').value=c.name;$('pixCity').value=c.city;
      $('goal').value=c.goal;$('babyName').value=c.babyName;$('driverName').value=c.driverName;
      const gd=daysSince(c.lmp);$('gWeeks').value=gd==null?'':Math.floor(gd/7);$('gDays').value=gd==null?'':gd%7;
      $('base').value=c.base;$('fee').value=c.fee;$('setupMsg').textContent='';$('setupMsg').className='msg';
      $('modeHint').textContent=d.hasMp?'Pix automático pelo Mercado Pago: ligado. Tudo fica salvo no servidor.':'Pix automático desligado (falta o token do Mercado Pago no servidor). Usando a chave Pix abaixo.';
      const l=$('donList');l.innerHTML='';
      if(!d.donations.length)l.innerHTML='<div><span>Nenhuma ainda.</span></div>';
      d.donations.forEach(dn=>{const div=document.createElement('div');const sp=document.createElement('span');
        sp.textContent=`${fmt(dn.amount)} · ${new Date(dn.ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${dn.source==='manual'?'manual':'Mercado Pago'}`;div.appendChild(sp);
        if(dn.source==='manual'){const b=document.createElement('button');b.type='button';b.textContent='remover';
          b.onclick=()=>api('/api/admin/donation?id='+encodeURIComponent(dn.id),{method:'DELETE',token:adminToken}).then(loadSetup).then(()=>syncState(false)).catch(setupErr);div.appendChild(b);}
        l.appendChild(div);});
    });
  }
  function setupErr(e){const m=$('setupMsg');m.className='msg err';m.textContent=e.message;if(e.status===401)setTimeout(openPin,1200);}
  $('setupForm').addEventListener('submit',e=>{
    e.preventDefault();
    const m=$('setupMsg');m.className='msg';
    const pixKey=$('pixKey').value.trim();
    if(pixKey&&(!$('pixName').value.trim()||!$('pixCity').value.trim())){m.className='msg err';m.textContent='Com chave Pix, nome e cidade são obrigatórios (o banco exige).';return;}
    let lmp=adminCfg?adminCfg.lmp:'';
    if($('gWeeks').value!==''){const gwk=Number($('gWeeks').value),gd=Number($('gDays').value)||0;const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(gwk*7+gd));
      lmp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    const cfg={driverName:$('driverName').value.trim(),babyName:$('babyName').value.trim(),lmp,goal:Number($('goal').value)||15000,base:r2($('base').value)||0,fee:r2($('fee').value)||0,
      keyType:$('keyType').value,pixKey,name:$('pixName').value.trim(),city:$('pixCity').value.trim()};
    m.textContent='Salvando…';
    api('/api/admin/config',{method:'PUT',token:adminToken,body:cfg}).then(()=>syncState(false)).then(goHome).catch(setupErr);
  });
  function twoTap(btn,label,action){
    if(btn.dataset.sure){delete btn.dataset.sure;btn.textContent=label;action();return;}
    btn.dataset.sure='1';btn.textContent='Tem certeza? Toca de novo';setTimeout(()=>{delete btn.dataset.sure;btn.textContent=label;},3000);
  }
  $('resetBtn').onclick=()=>twoTap($('resetBtn'),'Zerar doações',()=>api('/api/admin/reset',{method:'POST',token:adminToken}).then(loadSetup).then(()=>syncState(false)).catch(setupErr));
  $('logoutAllBtn').onclick=()=>twoTap($('logoutAllBtn'),'Desconectar todos os aparelhos',()=>api('/api/admin/logout-all',{method:'POST',token:adminToken}).then(()=>{lsSet(DEVICE,null);goHome();}).catch(setupErr));
  let hold=null;const g=$('gearBtn');
  const start=()=>{hold=setTimeout(openPin,1500);};const stop=()=>clearTimeout(hold);
  g.addEventListener('pointerdown',start);g.addEventListener('pointerup',stop);g.addEventListener('pointerleave',stop);g.addEventListener('pointercancel',stop);

  // ---------- início ----------
  bgfx();renderAmounts();render(false);show('s-home');
  syncState(true);
  setInterval(tick,1000);
  setInterval(()=>syncState(false),2*60*1000);                    // pega Pix que caiu pelo webhook e mudanças da configuração
  setInterval(()=>render(false),60*60*1000);
  if(navigator.wakeLock&&navigator.wakeLock.request){const wl=()=>navigator.wakeLock.request('screen').catch(()=>{});wl();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wl();});}
})();
