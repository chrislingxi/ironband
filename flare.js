/* flare.js — Canvas 2D 版 FLARE 精灵渲染(无 Phaser 依赖)
   复用 FLARE .txt 解析, 用 drawImage 裁帧绘制 8 向多动画精灵。
   美术: FLARE Team / Clint Bellanger, CC-BY-SA 3.0 (见 CREDITS.txt) */
(function(){
const BASE='assets/flare/';
const FACING_TO_DIR={W:0,NW:1,N:2,NE:3,E:4,SE:5,S:6,SW:7};
function angleToDir(ang){ const dirs=['E','SE','S','SW','W','NW','N','NE']; let i=Math.round(ang/(Math.PI/4)); i=((i%8)+8)%8; return FACING_TO_DIR[dirs[i]]; }

function parseAnim(text){
  const anims={}; let cur=null;
  for(let raw of text.split(/\r?\n/)){ const line=raw.trim(); if(!line||line[0]==='#')continue;
    const sec=line.match(/^\[(.+)\]$/);
    if(sec){ cur={frames:1,duration:500,type:'looped',dirs:[]}; for(let d=0;d<8;d++)cur.dirs.push([]); anims[sec[1]]=cur; continue; }
    if(!cur)continue; const eq=line.indexOf('='); if(eq<0)continue;
    const k=line.slice(0,eq).trim(), v=line.slice(eq+1).trim();
    if(k==='frames')cur.frames=parseInt(v)||1;
    else if(k==='duration'){ const m=/([\d.]+)\s*(ms|s)?/.exec(v); cur.duration=m?(m[2]==='s'?parseFloat(m[1])*1000:parseFloat(m[1])):500; }
    else if(k==='type')cur.type=v;
    else if(k==='frame'){ const p=v.split(',').map(n=>parseInt(n.trim())); const[fi,dir,x,y,w,h,ox,oy]=p; if(dir>=0&&dir<8)cur.dirs[dir][fi]={x,y,w,h,ox,oy}; }
  }
  return anims;
}
function loadImg(src){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=src; }); }
async function loadText(src){ try{ const r=await fetch(src); return await r.text(); }catch(e){ return ''; } }
async function loadSprite(png,txt){ const[img,text]=await Promise.all([loadImg(BASE+png),loadText(BASE+txt)]); return {img,anims:parseAnim(text)}; }

function frameIndex(anim,ms){ const n=anim.frames||1; const fdur=anim.duration/n; let i=Math.floor(ms/fdur);
  // play_once 也按循环取(避免攻击/受击帧冻结在最后一帧, 让动作真正动起来)
  if(anim.type==='back_forth'){ const per=Math.max(1,n*2-2); let p=i%per; return p<n?p:per-p; }
  return i%n; }
function draw(ctx,spr,animName,dir,ms,bx,by,scale,flash){
  if(!spr||!spr.img)return false; const anim=spr.anims[animName]||spr.anims.stance; if(!anim)return false;
  const fi=frameIndex(anim,ms); let fr=anim.dirs[dir]&&anim.dirs[dir][fi]; if(!fr)fr=anim.dirs[dir]&&anim.dirs[dir][0]; if(!fr)fr=(anim.dirs[6]&&anim.dirs[6][0]); if(!fr)return false;
  ctx.drawImage(spr.img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
  // 受击白闪(命中反馈): 叠加亮化
  if(flash>0){ ctx.save(); ctx.globalAlpha=Math.min(1,flash*5); ctx.globalCompositeOperation='lighter';
    ctx.drawImage(spr.img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
    ctx.drawImage(spr.img,fr.x,fr.y,fr.w,fr.h, bx-fr.ox*scale, by-fr.oy*scale, fr.w*scale, fr.h*scale);
    ctx.restore(); }
  return true;
}

const enemySprites={}; // kind -> sprite
const ENEMY_MAP={ skeleton:'skeleton', archer:'skeleton_archer', zombie:'zombie', imp:'goblin', brute:'minotaur', boss:'minotaur', mage:'skeleton_mage', antlion:'antlion', fireant:'fire_ant', iceant:'ice_ant',
  fallen:'goblin', shaman:'skeleton_mage', doll:'goblin', maggot:'antlion', leaper:'antlion_small', quill:'hobgoblin' }; // 几何怪→FLARE精灵(消除像素vs几何割裂); succubus/bird无兼容飞行精灵保持几何
// 分层纸娃娃绘制顺序(先底后顶); longbow 仅佣兵
const AVATAR_ORDER=['default_feet','default_legs','leather_pants','default_chest','leather_chest','leather_boots','default_hands','head_long','longbow'];
const avatar={}; // name -> sprite
let ready=false, avatarReady=false;

async function init(){
  const uniq=[...new Set(Object.values(ENEMY_MAP))];
  await Promise.all(uniq.map(async name=>{ const s=await loadSprite('enemies/'+name+'.png','anim/enemies/'+name+'.txt'); for(const k in ENEMY_MAP){ if(ENEMY_MAP[k]===name) enemySprites[k]=s; } }));
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
  const spr=enemySprites[e.kind]; if(!spr||!spr.img)return false;
  const dir=angleToDir(e._fang!=null?e._fang:Math.atan2(player_y()-e.y,player_x()-e.x));
  const anim = e.stun>0?'hit' : (e.moving?'run':'stance');
  // 每型显式缩放(FLARE帧大小差异大: minotaur帧很大)
  const SCALE={skeleton:1.15,archer:1.15,zombie:1.2,imp:1.0,brute:0.62,boss:0.95,mage:0.62,antlion:0.55,fireant:0.5,iceant:0.5,
    fallen:1.0,shaman:0.62,doll:0.85,maggot:0.55,leaper:0.55,quill:0.5};
  const scale=(SCALE[e.kind]||1)*(e.elite?1.18:1);
  const ms=(e._ant||0);
  return draw(ctx,spr,anim,dir,ms,bx,by+e.r*0.55,scale,e.hitFlash||0); // by下移到脚底, 传受击白闪
}
// 玩家访问器(主脚本注入)
let player_x=()=>0, player_y=()=>0;
window.Flare={ init, drawEnemy, drawAvatar, ready:()=>ready, avatarReady:()=>avatarReady, _setPlayer:(fx,fy)=>{player_x=fx;player_y=fy;}, draw, loadSprite };
})();
