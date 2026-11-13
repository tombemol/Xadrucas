import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js";

const $ = id => document.getElementById(id);
const choices = [
  {id:"einstein",name:"Albert Einstein",title:"O físico",symbol:"⚛",power:"Relatividade",desc:"Uma vez por partida, ganha 10 segundos no relógio."},
  {id:"turing",name:"Alan Turing",title:"O decifrador",symbol:"⌘",power:"Decodificar",desc:"Revela por 12 segundos todas as casas ameaçadas pelo adversário."},
  {id:"franklin",name:"Benjamin Franklin",title:"O inventor",symbol:"ϟ",power:"Para-raios",desc:"Marca por 12 segundos peças adversárias ameaçadas e indefesas."},
  {id:"capablanca",name:"José Raúl Capablanca",title:"O grande mestre",symbol:"♛",power:"Visão magistral",desc:"Marca por 12 segundos suas peças que estão sob ataque."}
];
const scenes = {
  duelo:{name:"Duelo dos Reis",fen:"4k3/1pp2pp1/2n2n2/8/8/2N2N2/1PP2PP1/4K3 w - - 0 1"},
  torres:{name:"Fortaleza",fen:"r3k2r/1p4p1/2n2n2/8/8/2N2N2/1P4P1/R3K2R w KQkq - 0 1"},
  arcanos:{name:"Conselho Arcano",fen:"3qk3/pp3ppp/2b5/8/8/2B5/PP3PPP/3QK3 w - - 0 1"},
  relampago:{name:"Guerra Relâmpago",fen:"r2qk2r/pp3ppp/2n5/8/8/2N5/PP3PPP/R2QK2R w KQkq - 0 1"}
};
const glyph = {w:{p:"♙",r:"♖",n:"♘",b:"♗",q:"♕",k:"♔"},b:{p:"♟",r:"♜",n:"♞",b:"♝",q:"♛",k:"♚"}};
const opposite = c => c === "w" ? "b" : "w";
const hero = id => choices.find(h => h.id === id) || choices[0];
const fmt = ms => {const t = Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");};
const everySquare = Array.from({length:64},(_,i)=>"abcdefgh"[i%8]+(8-Math.floor(i/8)));
let mode="local", chess=new Chess(scenes.duelo.fen), initialFen=scenes.duelo.fen, scene="duelo", minutes=5;
let status="idle", timeoutWinner=null, players={w:{name:"Claras",hero:"einstein",used:false,rematch:false},b:{name:"Escuras",hero:"turing",used:false,rematch:false}};
let clocks={w:300000,b:300000},lastTick=Date.now(),selected=null,insight=[],insightUntil=0;
let peer=null,conn=null,isHost=false,hostColor="w",mySide="w",roomId="",started=false;
let toastTimer,impactTimer,clockBroadcast=0;
const notify = msg => {const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3200);};
const send = msg => {if(conn?.open)conn.send(msg);};
const pickScene = key => key==="random"?Object.keys(scenes)[Math.floor(Math.random()*4)]:scenes[key]?key:"duelo";
function setupScene(key,mins,flip=false){
 scene=pickScene(key);minutes=Number(mins)||5;initialFen=scenes[scene].fen;chess=new Chess(initialFen);
 clocks={w:minutes*60000,b:minutes*60000};status="playing";timeoutWinner=null;selected=null;insight=[];insightUntil=0;
 for(const p of Object.values(players)){p.used=false;p.rematch=false;}
 if(flip){[players.w,players.b]=[players.b,players.w];hostColor=opposite(hostColor);mySide=hostColor;}
 lastTick=Date.now();render();
}
function tick(){
 const now=Date.now(),delta=Math.min(1000,now-lastTick);lastTick=now;
 if(status==="playing" && (mode==="local"||isHost)){
  const side=chess.turn();clocks[side]=Math.max(0,clocks[side]-delta);
  if(clocks[side]===0){status="finished";timeoutWinner=opposite(side);notify("Tempo esgotado!");if(isHost)broadcast();}
  if(isHost&&now-clockBroadcast>1000){clockBroadcast=now;broadcast();}
 }else if(status==="playing"&&mode==="online"){clocks[chess.turn()]=Math.max(0,clocks[chess.turn()]-delta);}
 renderClocks();
 if(insightUntil && now>insightUntil){insight=[];insightUntil=0;renderBoard();}
}
function resultText(){
 if(status==="waiting")return "Sala criada. Envie o convite e aguarde Lucas.";
 if(status==="idle")return "Escolha os mestres e inicie uma partida.";
 if(timeoutWinner)return "♜ Vitória das "+(timeoutWinner==="w"?"claras":"escuras")+" por tempo!";
 if(chess.isCheckmate())return "♜ Xeque-mate! Vitória das "+(chess.turn()==="w"?"escuras":"claras")+".";
 if(chess.isStalemate())return "Empate por afogamento.";
 if(chess.isThreefoldRepetition())return "Empate por repetição tripla.";
 if(chess.isInsufficientMaterial())return "Empate por material insuficiente.";
 if(chess.isDraw())return "Empate pelas regras do xadrez.";
 return (chess.inCheck()?"⚠ XEQUE! ":"") + "Vez de "+(players[chess.turn()]?.name||"jogador")+".";
}
function updateStatus(){if(status==="playing"&&chess.isGameOver())status="finished";}
function snapshot(){return {kind:"state",scene,minutes,initialFen,moves:chess.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion||"q"})),players,clocks,status,timeoutWinner,hostColor,now:Date.now()};}
function broadcast(){if(isHost)send(snapshot());}
function receiveState(s){
 try{
  const board=new Chess(s.initialFen);
  if(!Array.isArray(s.moves)||s.moves.length>600)throw Error("Histórico inválido");
  for(const m of s.moves)board.move({from:m.from,to:m.to,promotion:m.promotion});
  chess=board;initialFen=s.initialFen;scene=scenes[s.scene]?s.scene:"duelo";minutes=s.minutes;
  players=s.players;clocks={...s.clocks};status=s.status;timeoutWinner=s.timeoutWinner;hostColor=s.hostColor;mySide=opposite(hostColor);
  selected=null;lastTick=Date.now();render();
 }catch(error){notify("Não foi possível sincronizar a partida.");}
}
function useSkill(color){
 if(status!=="playing"||chess.turn()!==color)throw Error("Não é a sua vez.");
 const p=players[color];if(p.used)throw Error("Habilidade já usada.");
 p.used=true;let squares=[];const kind=p.hero,enemy=opposite(color);
 if(kind==="einstein")clocks[color]+=10000;
 else if(kind==="turing")squares=everySquare.filter(s=>chess.isAttacked(s,enemy));
 else if(kind==="franklin")squares=everySquare.filter(s=>{const t=chess.get(s);return t&&t.color===enemy&&chess.isAttacked(s,color)&&!chess.isAttacked(s,enemy);});
 else squares=everySquare.filter(s=>{const t=chess.get(s);return t&&t.color===color&&chess.isAttacked(s,enemy);});
 return squares;
}
function showInsight(squares){insight=squares||[];insightUntil=Date.now()+12000;renderBoard();}
function playMove(color,from,to,promotion="q"){
 if(status!=="playing"||chess.turn()!==color)throw Error("Não é sua vez.");
 const mv=chess.move({from,to,promotion});if(!mv)throw Error("Lance inválido.");
 updateStatus();selected=null;
 if(mv.captured){const impact=$("impact");impact.classList.remove("show");void impact.offsetWidth;impact.classList.add("show");clearTimeout(impactTimer);impactTimer=setTimeout(()=>impact.classList.remove("show"),500);}
 render();return mv;
}
function applyAction(color,msg){
 if(msg.kind==="move"){playMove(color,msg.from,msg.to,msg.promotion);return {ok:true};}
 if(msg.kind==="skill"){const squares=useSkill(color);render();return {ok:true,squares};}
 if(msg.kind==="rematch"){
  if(status!=="finished")throw Error("A partida ainda não acabou.");
  players[color].rematch=true;
  if(players.w.rematch&&players.b.rematch){setupScene(scene,minutes,true);notify("Revanche! Cores invertidas.");}
  render();return {ok:true};
 }
 throw Error("Ação desconhecida.");
}
function action(kind,payload={}){
 if(mode==="online"&&!isHost){send({kind:"action",action:kind,...payload});return;}
 try{const out=applyAction(mode==="local"?chess.turn():mySide,{kind,...payload});
  if(kind==="skill"){showInsight(out.squares);notify(hero(players[mode==="local"?chess.turn():mySide].hero).power+" ativada!");}
  if(isHost)broadcast();
 }catch(e){notify(e.message);}
}
function onlineDisconnect(){
 if(conn){conn.close();conn=null;}if(peer){peer.destroy();peer=null;}
 roomId="";isHost=false;started=false;
}
function connectEvents(connection,asHost){
 conn=connection;
 connection.on("open",()=>{
  $("connection").textContent="Conexão estabelecida";
  if(!asHost)send({kind:"join",name:$("online-name").value.trim().slice(0,20)||"Lucas",hero:$("online-hero").value});
  else notify("Oponente conectado!");
 });
 connection.on("data",data=>{
  if(!data||typeof data!=="object")return;
  if(asHost){
   if(data.kind==="join"){
    if(started)return;
    players[opposite(hostColor)]={name:String(data.name||"Lucas").slice(0,20),hero:hero(data.hero).id,used:false,rematch:false};
    started=true;status="playing";lastTick=Date.now();render();broadcast();notify("O duelo começou!");
   }else if(data.kind==="action"&&started){
    try{const out=applyAction(opposite(hostColor),{...data,kind:data.action});if(data.action==="skill")send({kind:"insight",squares:out.squares});broadcast();}
    catch(e){send({kind:"error",message:e.message});}
   }
  }else{
   if(data.kind==="state")receiveState(data);
   if(data.kind==="insight")showInsight(data.squares);
   if(data.kind==="error")notify(data.message||"Lance recusado.");
  }
 });
 connection.on("close",()=>{notify("A conexão com seu amigo foi encerrada.");status="finished";render();$("connection").textContent="Amigo desconectado";});
 connection.on("error",()=>notify("Problema na conexão P2P."));
}
function makePeer(onOpen){
 if(typeof window.Peer!=="function"){notify("Serviço de multiplayer indisponível. Verifique a conexão.");return;}
 onlineDisconnect();peer=new window.Peer();
 peer.on("open",onOpen);
 peer.on("error",err=>{notify("Não foi possível conectar: "+(err?.type||"erro de rede"));$("connection").textContent="Sem conexão";});
 peer.on("disconnected",()=>{$("connection").textContent="Sinalização desconectada";});
}
$("create-room").addEventListener("click",()=>{
 setMode("online");const chosen=$("online-preset").value,mins=Number($("online-minutes").value);
 makePeer(id=>{
  isHost=true;roomId=id;hostColor=Math.random()<.5?"w":"b";mySide=hostColor;
  players={w:{name:"Aguardando amigo",hero:"turing",used:false,rematch:false},b:{name:"Aguardando amigo",hero:"turing",used:false,rematch:false}};
  players[hostColor]={name:$("online-name").value.trim().slice(0,20)||"Tom",hero:$("online-hero").value,used:false,rematch:false};
  setupScene(chosen,mins);status="waiting";render();
  $("invite-box").hidden=false;$("room-id").textContent=id;
  $("connection").textContent="Sala criada • aguardando amigo";
  peer.on("connection",incoming=>{if(conn&&conn.open){incoming.close();return;}connectEvents(incoming,true);});
  notify("Sala pronta. Copie o convite.");
 });
});
$("join-room").addEventListener("click",()=>{
 const id=$("join-code").value.trim();if(!id){notify("Cole o código ou abra o link do convite.");return;}
 setMode("online");makePeer(()=>{
  isHost=false;roomId=id;mySide="b";status="waiting";render();
  const c=peer.connect(id,{reliable:true});connectEvents(c,false);
  $("connection").textContent="Conectando ao anfitrião...";
 });
});
$("copy-link").addEventListener("click",async()=>{
 const link=new URL(location.href);link.searchParams.set("sala",roomId);
 try{await navigator.clipboard.writeText(link.toString());notify("Convite copiado! Envie ao Lucas.");}
 catch{notify("Copie o endereço: "+link.toString());}
});
function setMode(next){
 mode=next;$("tab-local").classList.toggle("selected",next==="local");$("tab-online").classList.toggle("selected",next==="online");
 $("settings-local").hidden=next!=="local";$("settings-online").hidden=next!=="online";
 selected=null;preview();render();
}
$("tab-local").onclick=()=>setMode("local");
$("tab-online").onclick=()=>setMode("online");
for(const id of ["hero-white","hero-black","online-hero"]){
 $(id).innerHTML=choices.map(h=>'<option value="'+h.id+'">'+h.name+'</option>').join("");
 $(id).onchange=preview;
}
$("hero-black").value="turing";
function preview(){
 const h=hero($(mode==="local"?"hero-white":"online-hero").value);
 $("hero-symbol").textContent=h.symbol;$("hero-title").textContent=h.name;$("hero-skill").textContent=h.power;$("hero-description").textContent=h.desc;
}
$("start-local").addEventListener("click",()=>{
 onlineDisconnect();mode="local";
 players={w:{name:"Claras",hero:$("hero-white").value,used:false,rematch:false},b:{name:"Escuras",hero:$("hero-black").value,used:false,rematch:false}};
 setupScene($("local-preset").value,Number($("local-minutes").value));$("connection").textContent="Duelo local";notify("Arena iniciada. As claras começam!");
});
$("skill").onclick=()=>action("skill");
$("rematch").onclick=()=>{
 if(mode==="local"){setupScene(scene,minutes);notify("Nova partida!");return;}
 action("rematch");if(!isHost)notify("Revanche solicitada. Aguarde seu amigo.");
};
function renderBoard(){
 const board=$("board"),last=chess.history({verbose:true}).at(-1),turn=chess.turn(),perspective=mode==="online"?mySide:"w";
 const ranks=perspective==="w"?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8],files=perspective==="w"?"abcdefgh":"hgfedcba";
 const legal=selected?chess.moves({square:selected,verbose:true}).map(m=>m.to):[];
 const fragment=document.createDocumentFragment();
 for(const rank of ranks)for(const file of files){
  const sq=file+rank,p=chess.get(sq),btn=document.createElement("button");btn.type="button";
  const light=(files.indexOf(file)+ranks.indexOf(rank))%2===0;
  btn.className="sq "+(light?"light":"dark")+(last&&(sq===last.from||sq===last.to)?" last":"")+(sq===selected?" selected":"")+(legal.includes(sq)?" legal":"")+(insight.includes(sq)?" insight":"");
  btn.setAttribute("role","gridcell");btn.setAttribute("aria-label",p?({p:"Peão",r:"Torre",n:"Cavalo",b:"Bispo",q:"Dama",k:"Rei"}[p.type])+" "+(p.color==="w"?"claro":"escuro")+" em "+sq:"Casa "+sq);
  if(p){const span=document.createElement("span");span.className="piece "+p.color;span.textContent=glyph[p.color][p.type];btn.append(span);}
  btn.onclick=()=>clickSquare(sq);fragment.append(btn);
 }
 board.replaceChildren(fragment);
}
function clickSquare(sq){
 if(status!=="playing")return;
 const color=chess.turn();
 if(mode==="online"&&color!==mySide){notify("É a vez do adversário.");return;}
 const p=chess.get(sq),valid=selected?chess.moves({square:selected,verbose:true}).filter(m=>m.to===sq):[];
 if(selected&&valid.length){
  const from=selected;selected=null;let promotion="q";
  if(valid.some(m=>m.flags.includes("p"))){
   const input=window.prompt("Promover peão para: q (dama), r (torre), b (bispo), n (cavalo)","q");
   if(input===null){renderBoard();return;}
   promotion=["q","r","b","n"].includes(input.toLowerCase())?input.toLowerCase():"q";
  }
  action("move",{from,to:sq,promotion});renderBoard();return;
 }
 selected=p?.color===color?sq:null;renderBoard();
}
function renderClocks(){
 const flip=mode==="online"&&mySide==="b",top=flip?"w":"b",bottom=flip?"b":"w";
 for(const [id,color] of [["top",top],["bottom",bottom]]){
  const el=$("time-"+id);el.textContent=fmt(clocks[color]);el.classList.toggle("active",status==="playing"&&chess.turn()===color);el.classList.toggle("low",clocks[color]<15000);
 }
}
function render(){
 const flip=mode==="online"&&mySide==="b",top=flip?"w":"b",bottom=flip?"b":"w";
 for(const [id,color] of [["top",top],["bottom",bottom]]){
  const p=players[color],h=hero(p.hero);$("name-"+id).textContent=p.name;$("hero-"+id).textContent=h.name;
  $("icon-"+id).textContent=h.symbol;$("used-"+id).textContent=p.used?"PODER USADO":"PODER PRONTO";$("used-"+id).classList.toggle("used",p.used);
 }
 $("scenario").textContent=scenes[scene].name;$("status").textContent=resultText();
 const can=status==="playing"&&(mode==="local"||chess.turn()===mySide);
 $("skill").disabled=!can||players[chess.turn()].used;
 $("skill").textContent="✦ "+hero(players[chess.turn()].hero).power;
 $("rematch").hidden=status!=="finished";$("rematch").disabled=mode==="online"&&players[mySide]?.rematch;
 const hist=chess.history(),lines=[];
 for(let i=0;i<hist.length;i+=2)lines.push(String(i/2+1).padStart(2,"0")+".   "+hist[i].padEnd(10," ")+(hist[i+1]||""));
 $("moves").textContent=lines.join("\n")||"Ainda não há lances.";
 renderBoard();renderClocks();
}
const sala=new URLSearchParams(location.search).get("sala");
if(sala){$("join-code").value=sala;setMode("online");$("online-name").value="Lucas";}
else{preview();render();}
setInterval(tick,150);
