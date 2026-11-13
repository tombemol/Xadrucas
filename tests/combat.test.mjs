import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENAS,ARCHETYPES,newFight,stepFight,computerControls} from '../combat.mjs';

test('todas as seis classes têm atributos de luta positivos',()=>{
 assert.equal(Object.keys(ARCHETYPES).length,6);
 for(const [piece,c] of Object.entries(ARCHETYPES)){
  assert.ok(c.hp>0&&c.speed>0&&c.reach>0&&c.light>0&&c.heavy>0,piece);
 }
});
test('a luta começa com as duas peças vivas e posicionadas',()=>{
 const x=newFight({attacker:'w',fromType:'p',toType:'r',whiteAssist:'einstein',blackAssist:'tesla'});
 assert.equal(x.w.hp,ARCHETYPES.p.hp);assert.equal(x.b.hp,ARCHETYPES.r.hp);
 assert.ok(x.w.x<x.b.x);assert.equal(x.over,false);
});
test('um golpe corpo a corpo só acerta ao alcance',()=>{
 const x=newFight({attacker:'w',fromType:'p',toType:'p'});
 stepFight(x,.02,{light:true},{});
 assert.equal(x.b.hp,x.b.maxHp);
 x.w.x=x.b.x-35;x.w.cd=0;stepFight(x,.02,{heavy:true},{});
 assert.ok(x.b.hp<x.b.maxHp);
});
test('Tesla atordoa e causa dano uma única vez por duelo',()=>{
 const x=newFight({attacker:'w',fromType:'p',toType:'p',whiteAssist:'tesla'});
 stepFight(x,.02,{assist:true},{});const hp=x.b.hp;
 assert.ok(hp<x.b.maxHp);assert.ok(x.b.stun>0);assert.equal(x.w.assistUsed,true);
 stepFight(x,.02,{assist:true},{});assert.equal(x.b.hp,hp);
});
test('Einstein empurra o alvo e não causa dano automaticamente',()=>{
 const x=newFight({attacker:'w',fromType:'p',toType:'p',whiteAssist:'einstein'});
 const hp=x.b.hp;stepFight(x,.02,{assist:true},{});
 assert.ok(x.b.push>0);assert.equal(x.b.hp,hp);
});
test('mago cria projétil que percorre a arena',()=>{
 const x=newFight({attacker:'w',fromType:'b',toType:'p',variant:'runes'});
 stepFight(x,.02,{heavy:true},{});assert.equal(x.bolts.length,1);
 const origin=x.bolts[0].x;stepFight(x,.02,{},{});assert.ok(x.bolts[0].x>origin);
});
test('defesa reduz dano recebido',()=>{
 const plain=newFight({attacker:'w',fromType:'p',toType:'p'}),guarded=newFight({attacker:'w',fromType:'p',toType:'p'});
 for(const s of [plain,guarded])s.w.x=s.b.x-30;
 stepFight(plain,.02,{light:true},{});stepFight(guarded,.02,{light:true},{guard:true});
 assert.ok(guarded.b.hp>plain.b.hp);
});
test('a rodada tem vencedor quando o tempo termina',()=>{
 const x=newFight({attacker:'w',fromType:'p',toType:'r'});x.seconds=.01;
 stepFight(x,.03,{},{});assert.equal(x.over,true);assert.equal(x.winner,'w');
});
test('revanche tudo ou nada tem duração menor',()=>{
 const normal=newFight({attacker:'b',fromType:'n',toType:'b'});
 const risk=newFight({attacker:'b',fromType:'n',toType:'b',risk:true});
 assert.ok(risk.seconds<normal.seconds);assert.equal(risk.attacker,'b');
});
test('todos os três modos de arena e comandos da IA estão disponíveis',()=>{
 assert.deepEqual(ARENAS.map(a=>a.id),['brawl','runes','storm']);
 const x=newFight({attacker:'w',fromType:'p',toType:'p'});
 const input=computerControls(x,'b');assert.equal(input.left,true);assert.equal(typeof input.light,'boolean');
});
