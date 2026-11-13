/** Núcleo puro e determinístico da luta 2D. O anfitrião executa stepFight. */
export const ARCHETYPES={
 p:{name:'VANGUARDA',hp:115,speed:240,reach:56,light:12,heavy:23},
 n:{name:'CAVALEIRO',hp:135,speed:225,reach:72,light:14,heavy:27},
 b:{name:'ARCANO',hp:110,speed:210,reach:58,light:12,heavy:22,projectile:true},
 r:{name:'BASTIÃO',hp:175,speed:148,reach:76,light:16,heavy:34},
 q:{name:'IMPERATRIZ',hp:148,speed:225,reach:76,light:16,heavy:27,projectile:true},
 k:{name:'SOBERANO',hp:150,speed:185,reach:70,light:14,heavy:29}
};
export const ARENAS=[
 {id:'brawl',label:'BRIGA DE RUA',detail:'Corpo a corpo sem perdão'},
 {id:'runes',label:'RITUAL ARCANO',detail:'Especiais lançam energia à distância'},
 {id:'storm',label:'TEMPESTADE DE TESLA',detail:'O centro descarrega eletricidade'}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const copy=c=>({left:!!c?.left,right:!!c?.right,jump:!!c?.jump,light:!!c?.light,heavy:!!c?.heavy,guard:!!c?.guard,assist:!!c?.assist});
function makeFighter(color,type,assist,x){const c=ARCHETYPES[type]||ARCHETYPES.p;return {color,type,assist,x,y:0,vy:0,face:color==='w'?1:-1,hp:c.hp,maxHp:c.hp,guard:false,cd:0,stun:0,flash:0,assistUsed:false,attack:0,push:0};}
export function newFight({attacker,fromType,toType,whiteAssist='einstein',blackAssist='tesla',variant='brawl',risk=false}){
 const wType=attacker==='w'?fromType:toType,bType=attacker==='b'?fromType:toType;
 return {attacker,variant,risk,seconds:risk?14:20,elapsed:0,over:false,winner:null,
  w:makeFighter('w',wType,whiteAssist,235),b:makeFighter('b',bType,blackAssist,725),
  bolts:[],sparks:[],subtitle:'DUELO INICIADO',stormTick:0,seq:0};
}
function damage(f,enemy,amount,impact,power=false){
 const real=Math.max(1,Math.round(amount*(enemy.guard?.32:1)));
 enemy.hp=clamp(enemy.hp-real,0,enemy.maxHp);enemy.flash=.19;enemy.stun=power?.22:.08;
 enemy.push=(enemy.x>f.x?1:-1)*(power?400:200);
 impact.push({x:enemy.x,y:enemy.y+70,t:.35,text:String(real),type:power?'heavy':'hit'});
}
function special(f,enemy,s){
 if(f.assistUsed)return;
 f.assistUsed=true;f.flash=.4;
 if(f.assist==='einstein'){
  enemy.push=(enemy.x>f.x?1:-1)*730;enemy.stun=.75;s.subtitle='EINSTEIN • ONDA GRAVITACIONAL';
  s.sparks.push({x:enemy.x,y:90,t:.7,text:'GRAVIDADE',type:'assist'});
 }else if(f.assist==='tesla'){
  damage(f,enemy,17,s.sparks,true);enemy.stun=1;s.subtitle='TESLA • CORRENTE ELÉTRICA';
 }else if(f.assist==='turing'){
  f.hp=clamp(f.hp+22,0,f.maxHp);s.subtitle='TURING • CÓDIGO DE CURA';
  s.sparks.push({x:f.x,y:115,t:.7,text:'+22',type:'assist'});
 }else if(f.assist==='capablanca'){
  f.hp=clamp(f.hp+12,0,f.maxHp);enemy.stun=.6;s.subtitle='CAPABLANCA • CONTRA-ATAQUE';
  s.sparks.push({x:enemy.x,y:110,t:.7,text:'XEQUE',type:'assist'});
 }else{
  damage(f,enemy,15,s.sparks,true);s.subtitle='ADA LOVELACE • COMBO ANALÍTICO';
 }
}
function act(f,enemy,input,dt,s){
 const c=ARCHETYPES[f.type]||ARCHETYPES.p,keys=copy(input);f.cd=Math.max(0,f.cd-dt);f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);
 f.guard=keys.guard&&f.stun===0;
 if(f.stun===0){
  const dx=(keys.right?1:0)-(keys.left?1:0);
  f.x=clamp(f.x+dx*c.speed*dt*(f.guard?.42:1),40,920);if(dx)f.face=dx;
  if(keys.jump&&f.y===0){f.vy=530;}
  if(keys.assist)special(f,enemy,s);
  if(f.cd===0&&!f.guard&&(keys.light||keys.heavy)){
   const heavy=keys.heavy,range=heavy?c.reach+16:c.reach,hit=heavy?c.heavy:c.light;
   f.attack=heavy?2:1;f.cd=heavy?.69:.32;
   const toward=enemy.x>=f.x?1:-1;f.face=toward;
   if(heavy&&(c.projectile||s.variant==='runes')){
    s.bolts.push({x:f.x+f.face*30,y:65+f.y,dir:f.face,side:f.color,t:1.3,damage:hit,kind:f.type==='b'?'magic':'bolt'});
   }else if(Math.abs(f.x-enemy.x)<range&&Math.abs(f.y-enemy.y)<90){damage(f,enemy,hit,s.sparks,heavy);}
  }
 }
 if(f.y>0||f.vy>0){f.y=Math.max(0,f.y+f.vy*dt);f.vy-=1300*dt;if(f.y===0)f.vy=0;}
 f.x=clamp(f.x+f.push*dt,36,924);f.push*=Math.pow(.14,dt*9);
}
export function computerControls(s,color){
 const a=s[color],other=s[color==='w'?'b':'w'];if(!a||!other)return{};
 const d=other.x-a.x,near=Math.abs(d)<(ARCHETYPES[a.type].reach+4);
 return {left:d< -52,right:d>52,jump:s.variant==='storm'&&Math.abs(a.x-480)<95&&Math.floor(s.elapsed*1.7)%2===0,
 light:near&&Math.floor(s.elapsed*4)%2===0,heavy:near&&Math.floor(s.elapsed*3)%3===0,assist:!a.assistUsed&&s.seconds<13,
 guard:near&&Math.floor(s.elapsed*2.5)%5===0};
}
export function stepFight(s,dt,white={},black={}){
 if(!s||s.over)return s;
 dt=clamp(Number(dt)||0,0,.05);s.seconds=Math.max(0,s.seconds-dt);s.elapsed+=dt;
 // Defesas dos dois lados valem no mesmo quadro, independentemente da ordem.
 s.w.guard=!!white.guard&&s.w.stun===0;s.b.guard=!!black.guard&&s.b.stun===0;
 // Ambos agem em um tick; o anfitrião define o resultado, evitando divergência P2P.
 act(s.w,s.b,white,dt,s);act(s.b,s.w,black,dt,s);
 for(const bolt of s.bolts){bolt.x+=bolt.dir*540*dt;bolt.t-=dt;const enemy=s[bolt.side==='w'?'b':'w'];if(Math.abs(bolt.x-enemy.x)<28&&Math.abs(bolt.y-enemy.y-60)<95){damage(s[bolt.side],enemy,bolt.damage,s.sparks,true);bolt.t=0;}}
 s.bolts=s.bolts.filter(x=>x.t>0&&x.x>0&&x.x<960);
 if(s.variant==='storm'&&Math.floor(s.elapsed/3)>s.stormTick){s.stormTick=Math.floor(s.elapsed/3);for(const p of [s.w,s.b])if(Math.abs(p.x-480)<110){p.hp=Math.max(0,p.hp-11);p.flash=.2;s.sparks.push({x:p.x,y:40,t:.45,text:'⚡ 11',type:'assist'});}s.subtitle='O CENTRO ESTÁ ELETRIFICADO!';}
 for(const spark of s.sparks)spark.t-=dt;s.sparks=s.sparks.filter(x=>x.t>0);
 if(s.w.hp<=0||s.b.hp<=0||s.seconds===0){
  s.over=true;
  if(s.w.hp<=0&&s.b.hp<=0)s.winner=s.attacker; // desempate determinístico
  else if(s.w.hp<=0)s.winner='b';else if(s.b.hp<=0)s.winner='w';
  else s.winner=(s.w.hp/s.w.maxHp>=s.b.hp/s.b.maxHp)?'w':'b';
  s.subtitle=s.winner==='w'?'VITÓRIA DAS BRANCAS':'VITÓRIA DAS PRETAS';
 }
 return s;
}
