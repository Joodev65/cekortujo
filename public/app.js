const $=id=>document.getElementById(id);
const ic=(n,c='')=>`<svg class="ic ${c}"><use href="#${/^(s\d|i-)/.test(n)?n:'i-'+n}"/></svg>`;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const mj=el=>{try{window.renderMathInElement&&renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}],throwOnError:false})}catch(e){}};

const DEF={nick:'',xp:0,ans:0,ok:0,runs:0,hist:[],mute:false};
let P=(()=>{try{return Object.assign({},DEF,JSON.parse(localStorage.getItem('jaquiz')||'{}'))}catch(e){return{...DEF}}})();
const save=()=>{try{localStorage.setItem('jaquiz',JSON.stringify(P))}catch(e){}};

let AC;
function tone(f,d=.12,t='sine',v=.15,at=0){
  if(P.mute)return;
  try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(),g=AC.createGain(),s=AC.currentTime+at;
  o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(.001,s+d);
  o.connect(g);g.connect(AC.destination);o.start(s);o.stop(s+d)}catch(e){}
}
const SFX={
  click:()=>tone(520,.07,'square',.05),
  type:()=>tone(1100+Math.random()*300,.025,'square',.025),
  ok:()=>{tone(660,.12,'triangle');tone(880,.2,'triangle',.15,.1)},
  bad:()=>{tone(220,.25,'sawtooth',.09);tone(165,.3,'sawtooth',.09,.12)},
  tick:()=>tone(900,.05,'square',.05),
  start:()=>[392,523,659].forEach((f,i)=>tone(f,.15,'triangle',.15,i*.1)),
  win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.22,'triangle',.15,i*.12)),
  low:()=>[330,262,196].forEach((f,i)=>tone(f,.25,'triangle',.12,i*.15))
};
document.addEventListener('click',e=>{if(e.target.closest('.mc,.seg button,.icb,.av,.nav button,.sug button'))SFX.click()});

function show(id){document.querySelectorAll('.screen').forEach(e=>e.classList.remove('on'));$(id).classList.add('on');scrollTo(0,0)}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(!b)return;
  const g=b.dataset.go;
  if(g==='dash'){stopTimer();dash()}else if(g==='chat'){openChat()}else openSetup(g);
});

async function welcome(){
  show('s-welcome');$('nickbox').classList.remove('on');
  const tw=$('tw');tw.innerHTML='<div class="l0"></div><div class="l1"></div><div class="l2"></div>';
  const caret=document.createElement('span');caret.className='caret';
  const lines=['Hello, Welcome To','JAQuiz','Made By Jose'];
  for(let i=0;i<3;i++){
    const el=tw.children[i];el.appendChild(caret);
    for(const ch of lines[i]){caret.before(ch);if(ch!==' ')SFX.type();await new Promise(r=>setTimeout(r,i===1?110:55))}
    await new Promise(r=>setTimeout(r,260));
  }
  $('nickbox').classList.add('on');$('nick').value=P.nick||'';$('nick').focus();
}
$('nickbox').onsubmit=e=>{
  e.preventDefault();const n=$('nick').value.trim();
  if(n.length<2){const r=$('nerr');r.textContent='Nickname minimal 2 karakter.';r.style.display='block';return}
  P.nick=n;save();SFX.start();dash();
};

const lvOf=xp=>Math.floor(xp/300)+1;
function sndIcon(){$('snd').innerHTML=ic(P.mute?'mute':'spk')}
function dash(){
  show('s-dash');
  $('av').textContent=P.nick[0].toUpperCase();$('dn').textContent=P.nick;
  const l=lvOf(P.xp),cur=P.xp-(l-1)*300;
  $('lvl').textContent='Level '+l;$('xpt').textContent=cur+' / 300 XP';
  $('xpb').style.width='0';setTimeout(()=>$('xpb').style.width=(cur/300*100)+'%',60);
  $('c1').textContent=P.ans;$('c2').textContent=(P.ans?Math.round(P.ok/P.ans*100):0)+'%';$('c3').textContent=P.runs;
  $('hist').innerHTML=P.hist.length?P.hist.map(h=>`<div class="hrow"><span class="dot" style="background:${h.c}"></span><span>${esc(h.s)} · ${h.m==='quiz'?'Quiz':'Latihan'}</span><em>${h.sc}</em></div>`).join(''):'<div class="hint">Belum ada sesi. Pilih misi di atas untuk mulai.</div>';
  sndIcon();
}
$('av').onclick=()=>{if(confirm('Ganti nickname?'))welcome()};
$('snd').onclick=()=>{P.mute=!P.mute;save();sndIcon();SFX.click()};

let M='quiz';
const cfg={subj:'eng',lvl:'sulit',count:10,time:15,sel:'p0'};
const LV=[['mudah','Mudah'],['sedang','Sedang'],['sulit','Sulit'],['olimpiade','Olimpiade']];
function seg(el,items,key,fmt,after){
  el.innerHTML='';
  items.forEach(it=>{const v=Array.isArray(it)?it[0]:it,b=document.createElement('button');b.type='button';b.innerHTML=Array.isArray(it)?it[1]:fmt(it);
    if(cfg[key]===v)b.classList.add('sel');
    b.onclick=()=>{cfg[key]=v;[...el.children].forEach(c=>c.classList.remove('sel'));b.classList.add('sel');after&&after()};el.appendChild(b)});
}
function openSetup(mode){
  M=mode;$('sh').textContent=mode==='quiz'?'Setting Quiz':'Setting Latihan';
  $('serr').style.display='none';
  if(mode==='quiz'&&!cfg.time)cfg.time=15;
  seg($('sg-sj'),Object.entries(SUBJECTS).map(([k,s])=>[k,ic(s.icon)+s.name]),'subj',null,()=>{cfg.sel='p0';buildSel();document.documentElement.style.setProperty('--sub',SUBJECTS[cfg.subj].color)});
  seg($('sg-lv'),LV,'lvl');
  seg($('sg-ct'),[5,10,15,20],'count',n=>n+' soal');
  const times=[5,10,15,20,30,45,60].map(n=>[n,n+' mnt']);if(mode==='practice')times.push([0,'Tanpa batas']);
  seg($('sg-tm'),times,'time');
  document.documentElement.style.setProperty('--sub',SUBJECTS[cfg.subj].color);
  buildSel();show('s-setup');
}
function buildSel(){
  const s=SUBJECTS[cfg.subj];
  $('sel').innerHTML=`<optgroup label="Paket materi">${s.packs.map((p,i)=>`<option value="p${i}">${esc(p.n)} (${p.t.length} materi)</option>`).join('')}<option value="all">Acak semua materi (${s.all.length})</option></optgroup><optgroup label="Satu materi saja">${s.all.map((t,i)=>`<option value="t${i}">${esc(t)}</option>`).join('')}</optgroup>`;
  $('sel').value=cfg.sel;
  $('selh').textContent=cfg.subj==='eng'?'Soal dan opsi dalam Bahasa Inggris.':'Soal memuat data dan rumus yang dibutuhkan. Tersedia kertas coret.';
}
$('sel').onchange=e=>cfg.sel=e.target.value;
function topics(){
  const s=SUBJECTS[cfg.subj],v=cfg.sel;
  const pool=v==='all'?s.all:v[0]==='p'?s.packs[+v.slice(1)].t:[s.all[+v.slice(1)]];
  return shuffle(pool).slice(0,Math.min(pool.length,cfg.count));
}

let S=null,timer=null;
const OPT=['s0','s1','s2','s3'];
function stopTimer(){clearInterval(timer);timer=null}
$('go').onclick=start;
async function start(){
  $('serr').style.display='none';
  const sj=SUBJECTS[cfg.subj];
  $('lt').textContent=`AI lagi menyiapkan soal ${sj.name}…`;show('s-load');SFX.start();
  try{
    const r=await fetch('/api/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:cfg.subj,level:cfg.lvl,count:cfg.count,topics:topics(),mode:M})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.questions)throw new Error(d.error||'Gagal memuat soal.');
    S={active:true,mode:M,subj:cfg.subj,qs:d.questions,ans:[],i:0,total:cfg.time*60,left:cfg.time*60,lvl:cfg.lvl};
    clearPad();render();show('s-exam');runTimer();
  }catch(e){show('s-setup');const x=$('serr');x.textContent=e.message;x.style.display='block'}
}
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function drawTimer(){
  const t=$('tm');
  if(!S.total){t.className='tm';t.innerHTML=ic('clock')+'Santai';return}
  const C=113.1,low=S.left<=30;
  t.className='tm'+(low?' low':'');
  t.innerHTML=`<svg class="r" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-S.left/S.total)}"/></svg>${mmss(S.left)}`;
}
function runTimer(){
  stopTimer();drawTimer();if(!S.total)return;
  timer=setInterval(()=>{S.left--;if(S.left<=10&&S.left>0)SFX.tick();if(S.left===30)SFX.low();drawTimer();if(S.left<=0){stopTimer();finish(true)}},1000);
}
function render(){
  const q=S.qs[S.i],sj=SUBJECTS[S.subj],a=S.ans[S.i],prac=S.mode==='practice',locked=prac&&a!=null,n=S.qs.length;
  $('pg').textContent=`Soal ${S.i+1} / ${n}`;
  $('pbi').style.width=(S.ans.filter(x=>x!=null).length/n*100)+'%';
  $('nav').innerHTML=S.qs.map((_,k)=>{const x=S.ans[k];let c=k===S.i?'cur':x==null?'':prac?(x===S.qs[k].answer?'ok':'no'):'dn';return `<button class="${c}" data-n="${k}">${k+1}</button>`}).join('');
  $('nav').onclick=e=>{const b=e.target.closest('[data-n]');if(b){S.i=+b.dataset.n;clearPad();render()}};
  $('qtag').innerHTML=ic(sj.icon)+esc(q.topic||sj.name);
  const fm=$('qfm'),fq=prac&&q.formula;fm.hidden=!fq;fm.innerHTML=fq?ic('i-bolt')+'<span>Rumus: '+esc(q.formula)+'</span>':'';
  const ps=$('qps');ps.hidden=!q.passage;ps.textContent=q.passage||'';
  $('qt').textContent=q.question;
  $('opts').innerHTML=q.options.map((o,k)=>{
    let c='opt o'+k;if(locked)c+=k===q.answer?' right':k===a?' wrong':' dim';else if(a===k)c+=' sel';
    return `<button class="${c}" data-k="${k}" ${locked?'disabled':''}><svg class="ic" style="fill:#fff;stroke:none"><use href="#${OPT[k]}"/></svg><span>${esc(o)}</span></button>`}).join('');
  $('opts').onclick=e=>{const b=e.target.closest('[data-k]');if(b)pick(+b.dataset.k)};
  $('fbw').innerHTML=locked?`<div class="fb ${a===q.answer?'ok':'no'}"><h3>${a===q.answer?'Benar!':'Belum tepat'}</h3><p>${a===q.answer?'':'Jawaban benar: '+esc(q.options[q.answer])+'\n'}${esc(q.explanation)}</p>${a===q.answer?'':`<button class="btn blu askb" data-ask="${S.i}" style="margin-top:12px;font-size:1rem">${ic('chat')}Tanya Joo</button>`}</div>`:'';
  $('padb').hidden=!sj.calc;
  ['qfm','qps','qt','opts','fbw'].forEach(i=>mj($(i)));
  $('prev').style.visibility=S.i?'visible':'hidden';
  const last=S.i===n-1;
  $('nx').innerHTML=last?ic('flag')+'Selesai':'Lanjut'+ic('next');
  $('nx').classList.toggle('yel',last);
}
function pick(k){
  const q=S.qs[S.i];
  if(S.mode==='practice'){if(S.ans[S.i]!=null)return;S.ans[S.i]=k;k===q.answer?SFX.ok():SFX.bad();render();$('fbw').scrollIntoView({behavior:'smooth',block:'nearest'})}
  else{S.ans[S.i]=S.ans[S.i]===k?null:k;SFX.click();render()}
}
$('prev').onclick=()=>{if(S.i){S.i--;clearPad();render()}};
$('nx').onclick=()=>{
  if(S.i<S.qs.length-1){S.i++;clearPad();render();return}
  const miss=S.qs.length-S.ans.filter(x=>x!=null).length;
  if(!miss||confirm(`Masih ada ${miss} soal belum dijawab. Selesaikan sekarang?`))finish(false);
};
$('ex').onclick=()=>{if(confirm('Keluar dari sesi? Progres tidak disimpan.')){stopTimer();S.active=false;dash()}};

function finish(timeUp){
  stopTimer();S.active=false;const n=S.qs.length,sj=SUBJECTS[S.subj];
  const ok=S.qs.filter((q,k)=>S.ans[k]===q.answer).length,answered=S.ans.filter(x=>x!=null).length;
  const pct=Math.round(ok/n*100),prac=S.mode==='practice';
  const xp=ok*(prac?8:12)+(ok===n?50:0),oldL=lvOf(P.xp);
  P.xp+=xp;P.ans+=answered;P.ok+=ok;P.runs++;
  P.hist=[{s:sj.name,m:S.mode,sc:pct,c:sj.color},...P.hist].slice(0,6);save();
  $('rt').textContent=(timeUp?'Waktu habis, ':'Selesai, ')+P.nick;
  $('rs').textContent=pct;
  $('rm').textContent=(pct>=80?'Luar biasa, level juara!':pct>=50?'Lumayan, tinggal diasah lagi.':'Tenang, salah itu bagian dari belajar.')+(lvOf(P.xp)>oldL?` Naik ke Level ${lvOf(P.xp)}!`:'');
  $('r1').textContent=ok;$('r2').textContent=n-ok;$('r3').textContent='+'+xp;
  $('rc').style.strokeDashoffset=326.7;setTimeout(()=>$('rc').style.strokeDashoffset=326.7*(1-pct/100),80);
  $('rev').innerHTML='<h3 style="text-align:left;margin:6px 0">Rekap jawaban</h3>'+S.qs.map((q,k)=>{
    const a=S.ans[k],g=a===q.answer;
    return `<details><summary><span class="${g?'g':'b'}">${ic(g?'check':'x')}</span><span>${k+1}. ${esc(q.question)}</span></summary>${prac&&q.formula?`<p><b>Rumus:</b> ${esc(q.formula)}</p>`:''}<p><b>Jawabanmu:</b> ${a==null?'(kosong)':esc(q.options[a])}</p><p><b>Jawaban benar:</b> ${esc(q.options[q.answer])}</p>${prac?`<p>${esc(q.explanation)}</p>`:''}${g?'':`<button class="btn blu askb" data-ask="${k}" style="margin-top:10px;font-size:1rem">${ic('chat')}Tanya Joo</button>`}</details>`}).join('');
  show('s-res');mj($('rev'));SFX.win();
}
$('again').onclick=()=>{M=S.mode;start()};

const pad=$('pad'),cv=$('cv'),cx=cv.getContext('2d');
let tool='pen',col='#1d1240',drawing=false,sized=false;
function sizePad(){const d=devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;cv.width=w*d;cv.height=h*d;cx.setTransform(d,0,0,d,0,0);cx.lineCap=cx.lineJoin='round';sized=true}
function clearPad(){if(sized)cx.clearRect(0,0,cv.width,cv.height)}
$('padb').onclick=()=>{pad.classList.add('on');if(!sized)sizePad()};
$('t-x').onclick=()=>pad.classList.remove('on');
$('t-cl').onclick=clearPad;
$('t-pen').onclick=()=>{tool='pen';$('t-pen').classList.add('sel');$('t-er').classList.remove('sel')};
$('t-er').onclick=()=>{tool='er';$('t-er').classList.add('sel');$('t-pen').classList.remove('sel')};
document.querySelectorAll('.cl').forEach(b=>b.onclick=()=>{col=b.dataset.c;$('t-pen').click()});
const pos=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
cv.addEventListener('pointerdown',e=>{drawing=true;cv.setPointerCapture(e.pointerId);const[x,y]=pos(e);
  cx.globalCompositeOperation=tool==='er'?'destination-out':'source-over';cx.strokeStyle=col;cx.lineWidth=tool==='er'?26:3;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+.01,y);cx.stroke()});
cv.addEventListener('pointermove',e=>{if(!drawing)return;const[x,y]=pos(e);cx.lineTo(x,y);cx.stroke();cx.beginPath();cx.moveTo(x,y)});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>drawing=false));
addEventListener('resize',()=>{if(pad.classList.contains('on')&&!drawing)sizePad()});

function md(src){
  src=src.replace(/\\\[([\s\S]*?)\\\]/g,(m,x)=>'\n$$'+x.trim().replace(/\s*\n\s*/g,' ')+'$$\n')
    .replace(/\\\(([\s\S]*?)\\\)/g,(m,x)=>'$'+x.trim()+'$')
    .replace(/\$\$([\s\S]*?)\$\$/g,(m,x)=>'\n$$'+x.trim().replace(/\s*\n\s*/g,' ')+'$$\n');
  const inl=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>');
  const L=src.split('\n'),out=[],li=/^\s*([-*]|\d+[.)])\s+/,cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  let i=0;
  while(i<L.length){
    const l=L[i];
    if(/^```/.test(l)){const c=[];i++;while(i<L.length&&!/^```/.test(L[i]))c.push(L[i++]);i++;out.push('<pre><code>'+esc(c.join('\n'))+'</code></pre>');continue}
    if(/^#{1,4}\s/.test(l)){const n=l.match(/^#+/)[0].length+1;out.push(`<h${n}>${inl(l.replace(/^#+\s*/,''))}</h${n}>`);i++;continue}
    if(li.test(l)){const o=/^\s*\d/.test(l),it=[];while(i<L.length&&li.test(L[i]))it.push('<li>'+inl(L[i++].replace(li,''))+'</li>');out.push(o?`<ol>${it.join('')}</ol>`:`<ul>${it.join('')}</ul>`);continue}
    if(/^\|/.test(l)&&/^\|?[\s:|-]+\|?\s*$/.test(L[i+1]||'')&&/-/.test(L[i+1]||'')){
      const h=cells(l);i+=2;const rows=[];while(i<L.length&&/^\|/.test(L[i]))rows.push(cells(L[i++]));
      out.push(`<div class="tw2"><table><thead><tr>${h.map(x=>'<th>'+inl(x)+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(x=>'<td>'+inl(x)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`);continue}
    if(l.includes('\t')&&L[i+1]&&L[i+1].includes('\t')){const rows=[];while(i<L.length&&L[i].includes('\t'))rows.push(L[i++].split('\t').map(x=>x.trim()));
      out.push(`<div class="tw2"><table><thead><tr>${rows[0].map(x=>'<th>'+inl(x)+'</th>').join('')}</tr></thead><tbody>${rows.slice(1).map(r=>'<tr>'+r.map(x=>'<td>'+inl(x)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`);continue}
    if(/^>\s?/.test(l)){const q=[];while(i<L.length&&/^>\s?/.test(L[i]))q.push(inl(L[i++].replace(/^>\s?/,'')));out.push('<blockquote>'+q.join('<br>')+'</blockquote>');continue}
    if(/^\s*(---+|\*\*\*+)\s*$/.test(l)){out.push('<hr>');i++;continue}
    if(!l.trim()){i++;continue}
    const p=[];while(i<L.length&&L[i].trim()&&!/^(#{1,4}\s|```|>|\|)/.test(L[i])&&!li.test(L[i]))p.push(inl(L[i++]));
    if(!p.length){p.push(inl(L[i++]))}
    out.push('<p>'+p.join('<br>')+'</p>');
  }
  return out.join('');
}
const chat=[];let busy=false;
const SUG=['Buatkan catatan materi Hukum Newton lengkap','Jelaskan Passive Voice dengan contoh dan tabel','Kasih trik menghafal rumus Matematika SMP','Buat catatan kecil Inverted Conditional','Jelaskan perbedaan Gerund dan Participial Phrase'];
function openChat(){
  show('s-chat');
  if(!$('msgs').children.length)addMsg('a',md('Halo **'+esc(P.nick)+'**, aku **Joo AI**. Aku bisa membantu memberikan materi, menjelaskan materi dan kebutuhan belajar lainnya, Mau belajar apa hari ini?'),true);
  $('sug').innerHTML=chat.length?'':SUG.map(s=>`<button type="button">${esc(s)}</button>`).join('');
}
$('sug').onclick=e=>{const b=e.target.closest('button');if(b)sendChat(b.textContent)};
function addMsg(r,t,html){const d=document.createElement('div');d.className='m '+r;html?d.innerHTML=t:d.textContent=t;$('msgs').appendChild(d);$('msgs').scrollTop=1e9;return d}
$('cf').onsubmit=e=>{e.preventDefault();const t=$('ci').value;$('ci').value='';sendChat(t)};
async function sendChat(text){
  text=text.trim();if(!text||busy)return;busy=true;$('sug').innerHTML='';
  addMsg('u',text);chat.push({role:'user',content:text});
  const b=addMsg('a','<span class="dots"><i></i><i></i><i></i></span>',true);
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:chat})});
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Joo sedang bermasalah.')}
    const rd=r.body.getReader(),dec=new TextDecoder();let t='';
    while(true){const{done,value}=await rd.read();if(done)break;t+=dec.decode(value,{stream:true});b.innerHTML=md(t);$('msgs').scrollTop=1e9}
    chat.push({role:'assistant',content:t});mj(b);SFX.ok();
  }catch(e){b.textContent=e.message;chat.pop()}
  busy=false;
}

$('cb').onclick=()=>{if(S&&S.active){show('s-exam');runTimer()}else dash()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-ask]');if(b&&S)askJoo(S.qs[+b.dataset.ask],S.ans[+b.dataset.ask])});
function askJoo(q,a){
  stopTimer();openChat();const L='ABCD';
  sendChat(`Tolong bantu aku memahami soal ini.\n\n${q.passage?'Teks:\n'+q.passage+'\n\n':''}Soal: ${q.question}\n${q.options.map((o,i)=>L[i]+'. '+o).join('\n')}\n\nJawabanku: ${a==null?'(belum menjawab)':L[a]+'. '+q.options[a]}\nJawaban benar: ${L[q.answer]}. ${q.options[q.answer]}\n\nTulis semua rumus dengan LaTeX memakai tanda $...$ (inline) dan $$...$$ (satu baris), jangan pakai \\( \\) atau \\[ \\]. Jelaskan langkah demi langkah cara mengerjakannya, kenapa jawabanku keliru, rumus atau konsep kuncinya, dan satu tips agar tidak salah lagi.`);
}

P.nick?dash():welcome();
