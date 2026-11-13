import {Chess} from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js';
import {ARCHETYPES, ARENAS, newFight, stepFight, computerControls} from './combat.mjs';
const $=id=>document.getElementById(id);
const O=c=>c==='w'?'b':'w';
const symbols={w:{p:'♙',n:'♘',b:'♗',r:'♖',q:'♕',k:'♔'},b:{p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'}};
const names={p:'Peão',n:'Cavalo',b:'Bispo',r:'Torre',q:'Dama',k:'Rei'};
const masters={einstein:{name:'Albert Einstein',icon:'⚛',effect:'Gravidade: empurra e atordoa o inimigo.'},tesla:{name:'Nikola Tesla',icon:'ϟ',effect:'Choque elétrico: causa dano e paralisa.'},turing:{name:'Alan Turing',icon:'⌘',effect:'Algoritmo de cura: recupera vida.'},capablanca:{name:'José Raúl Capablanca',icon:'♛',effect:'Contra-ataque: cura e confunde.'},ada:{name:'Ada Lovelace',icon:'✺',effect:'Combo analítico: ataque extra.'}};
const presets={duelo:{name:'Duelo dos Reis',fen:'4k3/1pp2pp1/2n2n2/8/8/2N2N2/1PP2PP1/4K3 w - - 0 1'},torres:{name:'Fortaleza',fen:'r3k2r/1p4p1/2n2n2/8/8/2N2N2/1P4P1/R3K2R w KQkq - 0 1'},arcanos:{name:'Conselho Arcano',fen:'3qk3/pp3ppp/2b5/8/8/2B5/PP3PPP/3QK3 w - - 0 1'},relampago:{name:'Guerra Relâmpago',fen:'r2qk2r/pp3ppp/2n5/8/8/2N5/PP3PPP/R2QK2R w KQkq - 0 1'}};
const keys={};const touch={};const keysWhite={a:'left',d:'right',w:'jump',f:'light',g:'heavy',h:'assist',s:'guard'};
const keysBlack={arrowleft:'left',arrowright:'right',arrowup:'jump',j:'light',k:'heavy',l:'assist',arrowdown:'guard'};
const secondsText=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
let mode='local',game=new Chess(presets.duelo.fen),scene='duelo',minutes=5,phase='idle';
let players={w:{name:'Brancas',master:'einstein'},b:{name:'Pretas',master:'tesla'}};
let clocks={w:300000,b:300000},choice=null,events=[],combat=null,pending=null,encounters=0,localTurn=0;
let peer=null,conn=null,host=false,mySide='w',roomId='',guestControls={},lastSync=0,lastInput=0,lastDraw=0,lastRender=0,aiAt=0;
let progress;try{progress=JSON.parse(localStorage.getItem('xadrucas-campaign-v1'))||{wins:0,xp:0};}catch{progress={wins:0,xp:0};}
let toastTimer,endedWinner=null;
const showToast=(msg)=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);};
function log(text){events.unshift(text);events=events.slice(0,24);$('log').textContent=events.join('\n')||'O próximo capítulo ainda não começou.';}
const chooseScene=id=>id==='random'?Object.keys(presets)[Math.floor(Math.random()*4)]:presets[id]?id:'duelo';
const canPlay=()=>phase==='board';
function saveProgress(){try{localStorage.setItem('xadrucas-campaign-v1',JSON.stringify(progress));}catch{}renderProgress();}
function renderProgress(){const stage=Math.min(3,progress.wins);$('campaign-title').textContent=stage>=3?'CAMPANHA CONCLUÍDA':`CAPÍTULO ${stage+1} DE 3`; $('campaign-desc').textContent=stage>=3?'O trono é seu! Rejogue para aperfeiçoar a estratégia.':'Enfrente a guarda da arena e conquiste os três capítulos.';$('campaign-progress').textContent=`${progress.wins} vitórias • ${progress.xp} XP • Visual ${progress.wins>=3?'Lendário':progress.wins>=1?'Bronze':'Inicial'}`;}
function setTab(next){mode=next;for(const m of ['local','online','campaign']){$(`mode-${m}`).classList.toggle('active',m===next);$(`${m==='local'?'local-fields':m==='online'?'online-fields':'campaign-fields'}`).hidden=m!==next;}previewMaster();renderProgress();render();}
function previewMaster(){const id=$(mode==='online'?'master-online':mode==='campaign'?'master-campaign':'master-white').value||'einstein';const m=masters[id]||masters.einstein;$('master-icon').textContent=m.icon;$('master-name').textContent=m.name;$('master-effect').textContent=m.effect;}
for(const id of ['master-white','master-black','master-online','master-campaign']){$(id).innerHTML=Object.entries(masters).map(([key,m])=>`<option value="${key}">${m.name}</option>`).join('');$(id).addEventListener('change',previewMaster);}
$('master-black').value='tesla';$('master-online').value='einstein';$('master-campaign').value='einstein';
$('mode-local').onclick=()=>setTab('local');$('mode-online').onclick=()=>setTab('online');$('mode-campaign').onclick=()=>setTab('campaign');
function start(id,mins){
 scene=chooseScene(id);minutes=Number(mins)||5;game=new Chess(presets[scene].fen);clocks={w:minutes*60000,b:minutes*60000};choice=null;combat=null;pending=null;encounters=0;endedWinner=null;events=[];phase='board';
 $('overlay').hidden=true;log(`⚔ Arena ${presets[scene].name} iniciada.`);render();sync();
}
$('start-local').onclick=()=>{closeNet();mode='local';players={w:{name:'Brancas',master:$('master-white').value},b:{name:'Pretas',master:$('master-black').value}};start($('scene-local').value,$('minutes-local').value);$('net').textContent='Duelo local';showToast('Duelo local iniciado. Os dois podem usar o mesmo teclado.');};
$('start-campaign').onclick=()=>{closeNet();mode='campaign';players={w:{name:'Herói',master:$('master-campaign').value},b:{name:`Guardião ${Math.min(3,progress.wins+1)}`,master:['tesla','turing','capablanca'][Math.min(2,progress.wins)]}};start(['duelo','arcanos','torres'][Math.min(2,progress.wins)],5);$('net').textContent='Campanha contra IA';showToast('Campanha iniciada! As brancas são suas.');};
$('reset-progress').onclick=()=>{progress={wins:0,xp:0};saveProgress();showToast('Progresso da campanha reiniciado.');};
function finish(reason,winner=null){
 if(phase==='finished')return;phase='finished';endedWinner=winner;
 const name=winner?players[winner].name:'Ninguém';log(`🏆 ${reason} ${winner?`Vitória: ${name}.`:'Empate.'}`);
 if(mode==='campaign'&&winner==='w'){progress.wins=Math.min(3,progress.wins+1);progress.xp+=100;saveProgress();showToast('Vitória! +100 XP e um passo na campanha.');}
 $('overlay').hidden=true;render();sync();
}
function checkEnd(){if(phase!=='board')return;
 if(game.isCheckmate()){finish('Xeque-mate!',O(game.turn()));return;}
 if(game.isDraw()||game.isStalemate()||game.isThreefoldRepetition()){finish('Partida empatada.');return;}
 const pieces=game.board().flat().filter(Boolean);
 for(const c of ['w','b'])if(!pieces.some(p=>p.color===c&&p.type!=='k')){finish('Exército eliminado!',O(c));return;}
}
function passTurn(color){
 // Variante Xadrucas: perder uma captura consome uma ação, sem alterar a casa defendida.
 const fen=game.fen().split(' ');fen[1]=O(color);fen[3]='-';fen[4]=String((Number(fen[4])||0)+1);if(color==='b')fen[5]=String((Number(fen[5])||1)+1);
 game.load(fen.join(' '));
}
function doMove(color,from,to,promotion='q'){
 if(!canPlay()||game.turn()!==color)throw Error('Não é sua vez.');
 const legal=game.moves({square:from,verbose:true}).find(m=>m.to===to&&(!m.promotion||m.promotion===promotion));
 if(!legal)throw Error('Jogada inválida.');
 if(legal.captured||legal.flags.includes('e')){
  const defending=game.get(to);const targetType=defending?.type||'p';
  pending={from,to,promotion,attacker:color,defender:O(color),fromType:game.get(from).type,toType:targetType,risk:false};
  encounters+=1;beginFight();
 }else{
  game.move({from,to,promotion});log(`${color==='w'?'◻':'◼'} ${from} → ${to}`);choice=null;checkEnd();render();
 }
 sync();
}
function beginFight(){
 const p=pending;combat=newFight({attacker:p.attacker,fromType:p.fromType,toType:p.toType,whiteAssist:players.w.master,blackAssist:players.b.master,variant:ARENAS[(encounters-1)%ARENAS.length].id,risk:p.risk});
 phase='fight';choice=null;$('overlay').hidden=false;$('decision').hidden=true;
 log(`⚔ ${p.from} × ${p.to}: ${ARENAS[(encounters-1)%ARENAS.length].label}${p.risk?' • TUDO OU NADA':''}`);
 render();sync();
}
function fightEnded(){
 if(phase!=='fight'||!combat?.over||!pending)return;
 const winner=combat.winner,p=pending;
 if(winner===p.attacker){
  game.move({from:p.from,to:p.to,promotion:p.promotion});log(`💥 ${players[winner].name} venceu e capturou ${p.to}!`);
  pending=null;combat=null;phase='board';$('overlay').hidden=true;checkEnd();
 }else if(!p.risk){
  phase='decision';log(`🛡 ${players[winner].name} defendeu ${p.to}. O atacante decide.`);
  if(mode==='campaign'&&p.attacker==='b'){aiAt=performance.now()+850;}
 }else{
  // Tudo ou nada perdido: a peça que iniciou a captura desaparece.
  if(p.fromType==='k'){pending=null;combat=null;finish('O rei caiu no tudo ou nada!',p.defender);return;}
  game.remove(p.from);
  const f=game.fen().split(' ');f[1]=p.defender;f[2]='-';f[3]='-';f[4]=String((Number(f[4])||0)+1);if(p.attacker==='b')f[5]=String((Number(f[5])||1)+1);
  game.load(f.join(' '));log(`☠ ${players[p.attacker].name} apostou tudo e perdeu a peça ${p.from}!`);
  pending=null;combat=null;phase='board';$('overlay').hidden=true;checkEnd();
 }
 render();sync();
}
function decide(color,allIn){
 if(phase!=='decision'||!pending||color!==pending.attacker)throw Error('Só o atacante decide.');
 if(allIn){pending.risk=true;beginFight();return;}
 passTurn(color);log(`↩ ${players[color].name} recuou e preservou sua peça. Turno perdido.`);
 pending=null;combat=null;phase='board';$('overlay').hidden=true;checkEnd();render();sync();
}
function perform(color,msg){
 if(msg.action==='move')return doMove(color,msg.from,msg.to,msg.promotion||'q');
 if(msg.action==='retreat')return decide(color,false);
 if(msg.action==='allin')return decide(color,true);
 if(msg.action==='restart'){
  if(mode==='online'&&color!=='w')throw Error('O anfitrião reinicia o duelo.');
  return start(scene,minutes);
 }
 throw Error('Ação inválida.');
}
function request(action,info={}){
 const side=mode==='online'?mySide:mode==='campaign'?'w':(phase==='decision'?pending?.attacker:game.turn());
 if(mode==='online'&&!host){if(!conn?.open){showToast('Sem conexão com o anfitrião.');return;}conn.send({kind:'action',action,...info});return;}
 try{perform(side,{action,...info});}catch(e){showToast(e.message||'Não foi possível jogar.');}
}
$('retreat').onclick=()=>request('retreat');$('all-in').onclick=()=>request('allin');
$('new-game').onclick=()=>{if(phase==='idle'||phase==='waiting')return showToast('Escolha um modo e inicie a partida.');if(mode==='online'&&!host)return showToast('Peça ao anfitrião para reiniciar.');request('restart');};
$('help').onclick=()=>$('how').showModal();$('close-how').onclick=()=>$('how').close();
function renderBoard(){
 const board=$('board'),perspective=mode==='online'&&mySide==='b'?'b':'w',ranks=perspective==='w'?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8],files=perspective==='w'?'abcdefgh':'hgfedcba';
 const legal=choice?game.moves({square:choice,verbose:true}):[],frag=document.createDocumentFragment();
 for(const r of ranks)for(const f of files){const sq=f+r,p=game.get(sq),isLight=(files.indexOf(f)+ranks.indexOf(r))%2===0,b=document.createElement('button');b.type='button';b.className=`sq ${isLight?'light':'dark'}${choice===sq?' chosen':''}${legal.some(m=>m.to===sq)?' legal':''}${legal.some(m=>m.to===sq&&m.captured)?' capture':''}`;
  b.setAttribute('role','gridcell');b.setAttribute('aria-label',p?`${names[p.type]} ${p.color==='w'?'branco':'preto'} em ${sq}`:`Casa ${sq}`);
  if(p){const e=document.createElement('span');e.className=`piece ${p.color}${mode==='campaign'&&p.color==='w'&&progress.wins?(progress.wins>=3?' campaign-legendary':' campaign-bronze'):''}`;e.textContent=symbols[p.color][p.type];b.append(e);}b.onclick=()=>tapSquare(sq);frag.append(b);
 }board.replaceChildren(frag);
}
function tapSquare(sq){
 if(phase!=='board')return;
 const turn=game.turn();if(mode==='campaign'&&turn==='b')return showToast('O guardião está pensando.');if(mode==='online'&&turn!==mySide)return showToast('É a vez do adversário.');
 const p=game.get(sq),legal=choice?game.moves({square:choice,verbose:true}).filter(m=>m.to===sq):[];
 if(choice&&legal.length){const from=choice;choice=null;let promotion='q';if(legal.some(m=>m.promotion)){
  const ask=window.prompt('Promoção: q = dama, r = torre, b = bispo, n = cavalo','q');if(ask===null){renderBoard();return;}promotion=['q','r','b','n'].includes(ask?.toLowerCase())?ask.toLowerCase():'q';
 }request('move',{from,to:sq,promotion});return;}
 choice=p?.color===turn?sq:null;renderBoard();
}
function render(){
 const top=mode==='online'&&mySide==='b'?'w':'b',bottom=O(top);
 for(const [position,color] of [['black',top],['white',bottom]]){
  const p=players[color];$(`name-${position}`).textContent=p.name;$(`assist-${position}`).textContent=masters[p.master]?.name||'Assistência';
  const clock=$(`clock-${position}`);clock.textContent=secondsText(clocks[color]);clock.classList.toggle('active',phase==='board'&&game.turn()===color);clock.classList.toggle('danger',clocks[color]<15000);
  $(`line-${position}`).querySelector('.player-icon').textContent=color==='w'?'♔':'♚';
 }
 $('stage').textContent=presets[scene]?.name||'Arena';
 if(phase==='idle')$('message').textContent='Escolha um modo e inicie um duelo.';
 else if(phase==='waiting')$('message').textContent='Sala aberta! Compartilhe o link e aguarde o segundo jogador.';
 else if(phase==='board')$('message').textContent=`${game.isCheck()?'⚠ XEQUE! ':''}Vez de ${players[game.turn()].name}. Ao capturar, a luta começa.`;
 else if(phase==='fight')$('message').textContent='⚔ CAPTURA CONTESTADA: vença a luta para decidir a captura!';
 else if(phase==='decision')$('message').textContent='O atacante perdeu. É hora de recuar ou apostar a peça.';
 else $('message').textContent=endedWinner?`🏆 Vitória de ${players[endedWinner].name}!`:'Partida encerrada.';
 renderBoard();
 const show=phase==='fight'||phase==='decision';$('overlay').hidden=!show;
 if(show&&combat){$('combat-label').textContent=pending?.risk?'SEGUNDA CHANCE • TUDO OU NADA':'CAPTURA CONTESTADA';$('combat-title').textContent=ARENAS.find(a=>a.id===combat.variant)?.label||'DUELO';
  $('combat-timer').textContent=Math.ceil(combat.seconds);$('hp-white').style.width=`${100*combat.w.hp/combat.w.maxHp}%`;$('hp-black').style.width=`${100*combat.b.hp/combat.b.maxHp}%`;
  $('health-white-label').textContent=`BRANCAS • ${ARCHETYPES[combat.w.type].name}`;$('health-black-label').textContent=`PRETAS • ${ARCHETYPES[combat.b.type].name}`;
  $('combat-status').textContent=combat.subtitle;$('decision').hidden=phase!=='decision';const attackerAllowed=mode==='local'||(mode==='campaign'&&pending.attacker==='w')||(mode==='online'&&mySide===pending.attacker);
  $('retreat').disabled=!attackerAllowed;$('all-in').disabled=!attackerAllowed;
 }
}
function closeNet(){if(conn){conn.close();conn=null;}if(peer){peer.destroy();peer=null;}host=false;roomId='';guestControls={};}
function sync(){if(mode==='online'&&host&&conn?.open)conn.send({kind:'state',scene,minutes,fen:game.fen(),clocks,phase,players,pending,combat,encounters,events,endedWinner});}
function receive(s){
 try{if(!presets[s.scene]||typeof s.fen!=='string'||!['idle','waiting','board','fight','decision','finished'].includes(s.phase))return;
  game=new Chess(s.fen);scene=s.scene;minutes=Number(s.minutes)||5;clocks=s.clocks;phase=s.phase;players=s.players;pending=s.pending;combat=s.combat;encounters=s.encounters;events=s.events||[];endedWinner=s.endedWinner;choice=null;$('log').textContent=events.join('\n');render();
 }catch{showToast('O estado recebido não pôde ser carregado.');}
}
function attachConnection(c,asHost){conn=c;
 c.on('open',()=>{if(asHost){$('net').textContent='Amigo conectado';showToast('Lucas conectado!');}else{c.send({kind:'hello',name:$('player-name').value.trim().slice(0,20)||'Convidado',master:$('master-online').value});$('net').textContent='Conectado ao anfitrião';}});
 c.on('data',m=>{
  if(!m||typeof m!=='object')return;
  if(asHost){if(m.kind==='hello'&&phase==='waiting'){players.b={name:String(m.name||'Lucas').slice(0,20),master:masters[m.master]?m.master:'tesla'};phase='board';log('🎮 Oponente conectado. Duelo iniciado!');render();sync();}
   else if(m.kind==='action'&&phase!=='waiting'){try{perform('b',m);sync();}catch(e){c.send({kind:'error',text:e.message});}}
   else if(m.kind==='controls'&&typeof m.input==='object'){guestControls=Object.fromEntries(['left','right','jump','light','heavy','assist','guard'].map(k=>[k,!!m.input[k]]));}
  }else if(m.kind==='state')receive(m);else if(m.kind==='error')showToast(m.text||'Ação rejeitada.');
 });
 c.on('close',()=>{showToast('Conexão P2P encerrada.');$('net').textContent='Desconectado';if(phase!=='finished'){phase='finished';render();}});
 c.on('error',()=>showToast('Conexão P2P falhou.'));
}
function openPeer(onOpen){if(typeof window.Peer!=='function')return showToast('PeerJS indisponível. Verifique sua conexão.');closeNet();peer=new window.Peer();peer.on('open',onOpen);peer.on('error',e=>showToast(`Problema na conexão: ${e?.type||'desconhecido'}`));}
$('create-room').onclick=()=>{mode='online';players={w:{name:$('player-name').value.trim().slice(0,20)||'Anfitrião',master:$('master-online').value},b:{name:'Aguardando Lucas',master:'tesla'}};
 openPeer(id=>{host=true;mySide='w';roomId=id;start($('scene-online').value,5);phase='waiting';render();$('net').textContent='Aguardando amigo';$('invite').hidden=false;$('room-label').textContent=id;
 peer.on('connection',c=>{if(conn?.open){c.close();return;}attachConnection(c,true);});showToast('Sala criada! Copie o convite.');});};
$('join-room').onclick=()=>{const code=$('room-code').value.trim();if(!code)return showToast('Cole o código da sala.');mode='online';openPeer(()=>{host=false;mySide='b';roomId=code;phase='waiting';render();$('net').textContent='Conectando...';attachConnection(peer.connect(code,{reliable:true}),false);});};
$('copy-invite').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('sala',roomId);try{await navigator.clipboard.writeText(url.toString());showToast('Link copiado!');}catch{showToast(`Envie: ${url}`);}};
function inputsFor(color){
 const map=color==='w'?keysWhite:keysBlack,inputs={};
 if(mode==='online'&&color==='b'&&host)return guestControls;
 if(mode==='campaign'&&color==='b')return computerControls(combat,'b');
 if(mode==='online'&&!host)return {};
 for(const [key,action] of Object.entries(map))inputs[action]=!!keys[key];
 if((mode==='online'&&color==='w')||(mode==='campaign'&&color==='w')||(mode==='local'&&color==='w'))for(const [action,value] of Object.entries(touch))if(value)inputs[action]=true;
 return inputs;
}
function myInputs(){const obj={};for(const [key,action] of Object.entries(keysWhite))obj[action]=!!keys[key];for(const [k,v] of Object.entries(touch))if(v)obj[k]=true;return obj;}
const controlKeys=new Set([...Object.keys(keysWhite),...Object.keys(keysBlack)]);
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!controlKeys.has(k)||e.target.matches('input,select,textarea'))return;if(phase==='fight'){e.preventDefault();keys[k]=true;}});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(controlKeys.has(k))keys[k]=false;});
window.addEventListener('blur',()=>{for(const k of Object.keys(keys))keys[k]=false;for(const k of Object.keys(touch))touch[k]=false;guestControls={};});
for(const b of document.querySelectorAll('[data-touch]')){
 const action=b.dataset.touch;
 const pressed=e=>{e.preventDefault();if(phase==='fight'){touch[action]=true;b.classList.add('pressed');}};
 const released=e=>{e.preventDefault();touch[action]=false;b.classList.remove('pressed');};
 b.addEventListener('pointerdown',pressed);for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,released);
}
function runAI(now){
 if(mode!=='campaign'||now<aiAt)return;
 if(phase==='decision'&&pending?.attacker==='b'){
  try{decide('b',Math.random()<.4);}catch{}aiAt=now+450;return;
 }
 if(phase!=='board'||game.turn()!=='b')return;
 aiAt=now+1100;
 const moves=game.moves({verbose:true});if(!moves.length){checkEnd();return;}
 const captures=moves.filter(m=>m.captured||m.flags?.includes('e'));const pool=captures.length&&Math.random()<.74?captures:moves;const m=pool[Math.floor(Math.random()*pool.length)];
 try{doMove('b',m.from,m.to,m.promotion||'q');}catch{}
}
function drawArena(now){
 if($('overlay').hidden||!combat)return;const canvas=$('fight'),c=canvas.getContext('2d');if(!c)return;const w=960,h=450;
 const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,combat.variant==='storm'?'#28375c':combat.variant==='runes'?'#32183d':'#283455');bg.addColorStop(1,'#101422');c.fillStyle=bg;c.fillRect(0,0,w,h);
 const shift=(now*.007)%80;c.strokeStyle='#b5c5ff12';c.lineWidth=1;for(let x=-80;x<1040;x+=80){c.beginPath();c.moveTo(x-shift,0);c.lineTo(x-shift+80,360);c.stroke();}
 c.fillStyle='#1a2539';for(let x=25;x<960;x+=118){c.fillRect(x,150+Math.sin(x)*14,30,200);c.fillRect(x-16,145+Math.sin(x)*14,62,16);}
 c.fillStyle='#2d3c51';c.fillRect(0,342,960,108);c.fillStyle='#486477';c.fillRect(0,342,960,6);
 for(let x=0;x<960;x+=65){c.fillStyle=x%130?'#2b3a4e':'#26384d';c.fillRect(x,363,55,75);}
 if(combat.variant==='storm'){c.fillStyle='#a2e5ff2b';c.fillRect(390,0,180,342);c.strokeStyle='#84dfff';c.lineWidth=3;for(let i=0;i<4;i++){const t=(now*.003+i*23)%150;c.beginPath();c.moveTo(410+i*37,0);c.lineTo(390+i*32+t*.22,90);c.lineTo(420+i*20,190);c.stroke();}}
 if(combat.variant==='runes'){c.strokeStyle='#e498e755';c.lineWidth=4;for(let i=0;i<4;i++){c.beginPath();c.arc(480,194,40+i*34,0,Math.PI*2);c.stroke();}}
 drawFighter(c,combat.w,now);drawFighter(c,combat.b,now);
 for(const bolt of combat.bolts){c.fillStyle=bolt.side==='w'?'#8af2ff':'#ff9bb2';c.shadowBlur=25;c.shadowColor=c.fillStyle;c.beginPath();c.arc(bolt.x,345-bolt.y,17,0,Math.PI*2);c.fill();c.shadowBlur=0;}
 for(const spark of combat.sparks){c.font='bold 21px monospace';c.textAlign='center';c.fillStyle=spark.type==='assist'?'#e0e884':'#fff';c.fillText(spark.text||'✦',spark.x,315-spark.y-(.4-spark.t)*50);}
 if(combat.over){c.fillStyle='#060b1ab9';c.fillRect(0,160,w,90);c.fillStyle='#f5d588';c.font='bold 46px system-ui';c.textAlign='center';c.fillText(combat.winner==='w'?'BRANCAS VENCEM!':'PRETAS VENCEM!',480,224);}
}
function drawFighter(c,f,now){
 const cx=f.x,ground=345-f.y,a=ARCHETYPES[f.type],color=f.color==='w'?'#a7f3ff':'#ff8ea9',dark=f.color==='w'?'#2b6d8f':'#813152';
 c.save();c.translate(cx,ground);c.scale(f.face,1);if(f.flash>0){c.shadowBlur=28;c.shadowColor='#fff';}
 c.fillStyle='#0006';c.beginPath();c.ellipse(0,0,42,11,0,0,Math.PI*2);c.fill();
 if(f.guard){c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.ellipse(0,-87,42,74,0,0,Math.PI*2);c.stroke();}
 c.fillStyle=dark;c.fillRect(-23,-56,19,52);c.fillRect(5,-56,19,52);
 c.fillStyle=color;c.fillRect(-28,-131,56,79);c.fillStyle=dark;c.fillRect(-36,-125,15,65);c.fillRect(22,-125,15,65);
 c.fillStyle=color;c.beginPath();c.arc(0,-156,27,0,Math.PI*2);c.fill();
 c.fillStyle=dark;c.fillRect(6,-162,14,6);
 if(f.type==='r'){c.fillStyle=dark;c.fillRect(-42,-138,32,27);c.fillRect(12,-138,32,27);c.fillStyle=color;c.fillRect(-27,-197,54,15);}
 if(f.type==='b'){c.fillStyle=dark;c.beginPath();c.moveTo(-29,-177);c.lineTo(0,-232);c.lineTo(29,-177);c.fill();c.strokeStyle=color;c.lineWidth=6;c.beginPath();c.moveTo(44,-93);c.lineTo(44,-211);c.stroke();}
 if(f.type==='n'){c.fillStyle=color;c.beginPath();c.moveTo(-25,-176);c.lineTo(-33,-222);c.lineTo(5,-189);c.lineTo(33,-224);c.lineTo(25,-172);c.fill();}
 if(f.type==='q'||f.type==='k'){c.fillStyle='#f4d581';c.beginPath();c.moveTo(-24,-183);c.lineTo(-19,-222);c.lineTo(-4,-193);c.lineTo(7,-231);c.lineTo(21,-193);c.lineTo(28,-223);c.lineTo(26,-183);c.fill();}
 if(f.type==='p'){c.fillStyle=dark;c.fillRect(-20,-192,40,10);}
 if(f.attack&&f.cd>.09){c.fillStyle='#f4d981';c.fillRect(24,-121,54,18);c.strokeStyle='#fff8';c.lineWidth=3;c.beginPath();c.arc(77,-111,17,0,Math.PI*2);c.stroke();}
 if(f.assistUsed){c.fillStyle='#f5d07f';c.fillRect(-27,-64,54,7);}
 if(f.stun>0){c.fillStyle='#f8ff8e';c.font='bold 22px monospace';c.fillText('✦',-12,-249+Math.sin(now/90)*8);}
 c.restore();
}
function frame(now){
 const dt=Math.min(.05,Math.max(0,(now-lastDraw)/1000||.016));lastDraw=now;
 if(mode==='online'&&!host&&conn?.open&&phase==='fight'&&now-lastInput>60){lastInput=now;conn.send({kind:'controls',input:myInputs()});}
 if(phase==='fight'&&(mode!=='online'||host)){
  stepFight(combat,dt,inputsFor('w'),inputsFor('b'));
  if(combat.over)fightEnded();
 }
 if(phase==='board'&&(mode!=='online'||host)){
  const side=game.turn();clocks[side]=Math.max(0,clocks[side]-dt*1000);
  if(clocks[side]===0)finish('Tempo esgotado!',O(side));
 }
 if(mode==='campaign')runAI(now);
 if(mode==='online'&&host&&now-lastSync>110&&(phase==='fight'||phase==='board'||phase==='decision')){lastSync=now;sync();}
 if(now-lastRender>90){lastRender=now;if(phase==='fight'||phase==='decision'||phase==='board')render();}
 drawArena(now);requestAnimationFrame(frame);
}
const invited=new URLSearchParams(location.search).get('sala');if(invited){setTab('online');$('room-code').value=invited;showToast('Convite encontrado. Clique em ENTRAR NA SALA.');}else{setTab('local');}
renderProgress();render();requestAnimationFrame(frame);
