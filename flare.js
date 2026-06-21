/* flare.js — Canvas 2D 版 FLARE 精灵渲染(无 Phaser 依赖)
   复用 FLARE .txt 解析, 用 drawImage 裁帧绘制 8 向多动画精灵。
   美术: FLARE Team / Clint Bellanger, CC-BY-SA 3.0 (见 CREDITS.txt) */
(function(){
const BASE='assets/flare/';
const FACING_TO_DIR={W:0,NW:1,N:2,NE:3,E:4,SE:5,S:6,SW:7};
function angleToDir(ang){ const dirs=['E','SE','S','SW','W','NW','N','NE']; let i=Math.round(ang/(Math.PI/4)); i=((i%8)+8)%8; return FACING_TO_DIR[dirs[i]]; }

function parseAnim(text){
  const anims={}; let cur=null; const imgRefs={}; // imgRefs: animName 或 '_default' → png basename(多图精灵每动画独立png)
  for(let raw of text.split(/\r?\n/)){ const line=raw.trim(); if(!line||line[0]==='#')continue;
    if(line.indexOf('image=')===0){ const v=line.slice(6).trim(); const c=v.indexOf(','); const rel=p=>p.trim().replace(/^images\//,''); // 保留images/后的相对路径(多图在子目录如enemies/wyvern/)
      if(c>=0) imgRefs[v.slice(c+1).trim()]=rel(v.slice(0,c)); else imgRefs._default=rel(v); continue; }
    const sec=line.match(/^\[(.+)\]$/);
    if(sec){ cur={frames:1,duration:500,type:'looped',dirs:[]}; for(let d=0;d<8;d++)cur.dirs.push([]); anims[sec[1]]=cur; continue; }
    if(!cur)continue; const eq=line.indexOf('='); if(eq<0)continue;
    const k=line.slice(0,eq).trim(), v=line.slice(eq+1).trim();
    if(k==='frames')cur.frames=parseInt(v)||1;
    else if(k==='duration'){ const m=/([\d.]+)\s*(ms|s)?/.exec(v); cur.duration=m?(m[2]==='s'?parseFloat(m[1])*1000:parseFloat(m[1])):500; }
    else if(k==='type')cur.type=v;
    else if(k==='frame'){ const p=v.split(',').map(n=>parseInt(n.trim())); const[fi,dir,x,y,w,h,ox,oy]=p; if(dir>=0&&dir<8)cur.dirs[dir][fi]={x,y,w,h,ox,oy}; }
  }
  return {anims, imgRefs};
}
function loadImg(src){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=src; }); }
async function loadText(src){ try{ const r=await fetch(src); return await r.text(); }catch(e){ return ''; } }
async function loadSprite(png,txt){ const text=await loadText(BASE+txt); const {anims,imgRefs}=parseAnim(text);
  const perAnim={}; for(const k in imgRefs) if(k!=='_default') perAnim[k]=imgRefs[k]; const multi=Object.keys(perAnim).length>0;
  if(!multi){ const img=await loadImg(BASE+png); return {img,anims}; } // 单图(向后兼容)
  // 多图: 每动画独立png(flying creature如wyvern), 全部加载
  const files=new Set(Object.values(imgRefs)); const fileImg={};
  await Promise.all([...files].map(async f=>{ fileImg[f]=await loadImg(BASE+f); }));
  const animImg={}; for(const k in perAnim) animImg[k]=fileImg[perAnim[k]];
  const defImg=imgRefs._default?fileImg[imgRefs._default]:(animImg.stance||Object.values(fileImg)[0]);
  return {img:defImg, anims, animImg};
}

function frameIndex(anim,ms){ const n=anim.frames||1; const fdur=anim.duration/n; let i=Math.floor(ms/fdur);
  // play_once 也按循环取(避免攻击/受击帧冻结在最后一帧, 让动作真正动起来)
  if(anim.type==='back_forth'){ const per=Math.max(1,n*2-2); let p=i%per; return p<n?p:per-p; }
  return i%n; }
function draw(ctx,spr,animName,dir,ms,bx,by,scale,flash){
  if(!spr)return false; const anim=spr.anims[animName]||spr.anims.stance; if(!anim)return false;
  const img=(spr.animImg&&(spr.animImg[animName]||spr.animImg.stance))||spr.img; if(!img)return false; // 多图: 每动画独立png
  const fi=frameIndex(anim,ms); let fr=anim.dirs[dir]&&anim.dirs[dir][fi]; if(!fr)fr=anim.dirs[dir]&&anim.dirs[dir][0]; if(!fr)fr=(anim.dirs[6]&&anim.dirs[6][0]); if(!fr)return false;
  ctx.drawImage(img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
  // 受击白闪(命中反馈): 叠加亮化
  if(flash>0){ ctx.save(); ctx.globalAlpha=Math.min(1,flash*5); ctx.globalCompositeOperation='lighter';
    ctx.drawImage(img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
    ctx.drawImage(img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
    ctx.restore(); }
  return true;
}

const enemySprites={}; // kind -> sprite
const ENEMY_MAP={ skeleton:'skeleton', archer:'skeleton_archer', zombie:'zombie', imp:'goblin', brute:'minotaur', boss:'minotaur', mage:'skeleton_mage', antlion:'antlion', fireant:'fire_ant', iceant:'ice_ant',
  fallen:'goblin', shaman:'skeleton_mage', doll:'goblin', maggot:'antlion', leaper:'antlion_small', quill:'hobgoblin',
  succubus:'wyvern', bird:'wyvern',
  scarab:'antlion', gloam:'skeleton_mage', moonlord:'minotaur' }; // 几何怪→FLARE精灵; 新D2怪复用近似精灵
// 分层纸娃娃绘制顺序(先底后顶); longbow 仅佣兵
const AVATAR_ORDER=['default_feet','default_legs','leather_pants','default_chest','leather_chest','leather_boots','default_hands','head_long','longbow'];
const avatar={}; // name -> sprite
let ready=false, avatarReady=false;

async function init(){
  const uniq=[...new Set(Object.values(ENEMY_MAP))];
  await Promise.all(uniq.map(async name=>{ const s=await loadSprite('enemies/'+name+'.png','anim/enemies/'+name+'.txt'); enemySprites[name]=s; for(const k in ENEMY_MAP){ if(ENEMY_MAP[k]===name) enemySprites[k]=s; } })); // 同时按精灵名建索引(超级Boss spriteOverride用精灵名)
  ready=true;
  // 异步加载纸娃娃层(不阻塞怪物)
  await Promise.all(AVATAR_ORDER.map(async n=>{ avatar[n]=await loadSprite('avatar/'+n+'.png','anim/avatar/'+n+'.txt'); }));
  avatarReady=true;
}

// 画分层纸娃娃. withBow=佣兵(弓手), anim=stance/run/swing/shoot
function drawAvatar(ctx,bx,by,ang,anim,ms,scale,withBow,flash){
  if(!avatarReady) return false;
  const dir=angleToDir(ang);
  let drew=false;
  for(const n of AVATAR_ORDER){
    if(n==='longbow' && !withBow) continue;
    const spr=avatar[n]; if(!spr||!spr.img) continue;
    if(draw(ctx,spr,anim,dir,ms,bx,by,scale,flash||0)) drew=true;
  }
  return drew;
}

// 对外: 画一只怪. e=敌人对象, bx/by=世界坐标(已在camera translate内), facingAng=朝向角
function drawEnemy(ctx,e,bx,by){
  const spr=enemySprites[e.spriteOverride||e.kind]; if(!spr||!spr.img)return false; // 超级Boss spriteOverride: 每Boss独立精灵
  const dir=angleToDir(e._fang!=null?e._fang:Math.atan2(player_y()-e.y,player_x()-e.x));
  const anim = e.stun>0?'hit' : (e.moving?'run':'stance');
  // 每型显式缩放(FLARE帧大小差异大: minotaur帧很大)
  const SCALE={skeleton:1.15,archer:1.15,zombie:1.2,imp:1.0,brute:0.62,boss:0.95,mage:0.62,antlion:0.55,fireant:0.5,iceant:0.5,
    fallen:1.0,shaman:0.62,doll:0.85,maggot:0.55,leaper:0.55,quill:0.5,succubus:0.24,bird:0.18,
    scarab:0.55,gloam:0.62,moonlord:0.62};
  let scale=(SCALE[e.kind]||1)*(e.elite?1.18:1);
  if(e.isSuper){ const BSC={wyvern:0.5,minotaur:1.7,skeleton_mage:1.55,hobgoblin:1.15,zombie:2.1}; scale=(BSC[e.spriteOverride]||(SCALE[e.kind]||1)*2.3)*(e.elite?1.1:1); } // 超级Boss: 每精灵配合适大尺寸(req7)
  const ms=(e._ant||0);
  // 接触地面阴影(loop3 veteran: 21怪全悬浮无重量). 飞行怪小+偏移+降透明
  const flying=(e.kind==='succubus'||e.kind==='bird'); const ssc=(e.isSuper?1.6:1)*(SCALE[e.kind]||1)*(e.elite?1.18:1);
  ctx.save(); ctx.fillStyle=flying?'#0000004d':'#00000066'; ctx.beginPath(); ctx.ellipse(bx, by+e.r*(flying?1.0:0.66), Math.max(7,e.r*0.8*Math.min(1.6,ssc)), Math.max(3,e.r*0.3*Math.min(1.6,ssc)), 0,0,TAU); ctx.fill(); ctx.restore();
  // 共用精灵的怪做色调区分(panel4: 魅魔/兀鹫别一张皮); 超级Boss按章节色染成独特魔物
  const TINT={succubus:'hue-rotate(-50deg) saturate(1.4)', bird:'saturate(0.35) brightness(1.15)'};
  let tint=TINT[e.kind];
  if(e.isSuper) tint='saturate(1.5) brightness(1.1) drop-shadow(0 0 12px '+(e.c||'#ff5e3a')+')'; // 超级Boss: 饱和+自发光描边
  if(e.frozen>0) tint='brightness(1.2) saturate(0.5) drop-shadow(0 0 6px #bfe9ff) sepia(0.3) hue-rotate(160deg)'; // 冰冻: 冰蓝僵直
  if(tint){ ctx.save(); ctx.filter=tint; const r=draw(ctx,spr,anim,dir,ms,bx,by+e.r*0.55,scale,e.hitFlash||0); ctx.filter='none'; ctx.restore(); return r; }
  return draw(ctx,spr,anim,dir,ms,bx,by+e.r*0.55,scale,e.hitFlash||0); // by下移到脚底, 传受击白闪
}
const ESCALE={skeleton:1.15,archer:1.15,zombie:1.2,imp:1.0,brute:0.62,boss:0.95,mage:0.62,antlion:0.55,fireant:0.5,iceant:0.5,fallen:1.0,shaman:0.62,doll:0.85,maggot:0.55,leaper:0.55,quill:0.5,succubus:0.24,bird:0.18,scarab:0.55,gloam:0.62,moonlord:0.62};
// 死亡演出(loop3 veteran): 尸体播怪物die帧+坍倒淡出, 不再是灰团
function drawCorpse(ctx,c,prog){
  const spr=enemySprites[c.spriteOverride||c.kind]; if(!spr||!spr.img)return false;
  const hasDie=!!(spr.anims&&(spr.anims.die)); const anim=spr.anims&&(spr.anims.die||spr.anims.stance); if(!anim)return false;
  const dir=angleToDir(c.dir!=null?c.dir:6);
  let scale=(ESCALE[c.kind]||1)*(c.elite?1.18:1); if(c.isSuper){ const BSC={wyvern:0.5,minotaur:1.7,skeleton_mage:1.55,hobgoblin:1.15,zombie:2.1}; scale=BSC[c.spriteOverride]||(ESCALE[c.kind]||1)*2.3; }
  const ms=hasDie?(prog*(anim.duration||500)*0.98):0; // die: prog内播完一遍; 无die帧→stance静帧+淡出坍倒
  ctx.save(); ctx.globalAlpha=Math.max(0,(1-prog))*0.95;
  ctx.translate(c.x,c.y+c.r*0.55); ctx.scale(1,1-prog*(hasDie?0.15:0.45)); ctx.translate(-c.x,-(c.y+c.r*0.55)); // 坍倒压扁
  const ok=draw(ctx,spr,hasDie?'die':'stance',dir,ms,c.x,c.y+c.r*0.55,scale,0);
  ctx.globalAlpha=1; ctx.restore(); return ok;
}
// 玩家访问器(主脚本注入)
let player_x=()=>0, player_y=()=>0;
window.Flare={ init, drawEnemy, drawCorpse, drawAvatar, ready:()=>ready, avatarReady:()=>avatarReady, _setPlayer:(fx,fy)=>{player_x=fx;player_y=fy;}, draw, loadSprite };
})();
