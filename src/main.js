import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.querySelector('#world');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91b6b0);
scene.fog=new THREE.Fog(0x91b6b0,35,150);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,300);
camera.position.set(8,7,10);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;

scene.add(new THREE.HemisphereLight(0xd8eee7,0x3a443e,2.4));
const sun=new THREE.DirectionalLight(0xfff2d0,3.2);
sun.position.set(-35,45,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;
scene.add(sun);

const city=new THREE.Group();scene.add(city);
const clickable=[];
const clock=new THREE.Clock();
const keys={};
let selected=null,avatar=null,mixer=null,activeAction=null,velocityY=0,onGround=true;

function mat(color,rough=.85){return new THREE.MeshStandardMaterial({color,roughness:rough})}
function box(w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.castShadow=true;m.receiveShadow=true;return m}
function cylinder(r,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat(color));m.castShadow=true;m.receiveShadow=true;return m}

const ground=new THREE.Mesh(new THREE.PlaneGeometry(190,190),mat(0x527765));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;city.add(ground);

function road(x,z,w,d){const r=box(w,.08,d,0x27312e);r.position.set(x,.04,z);city.add(r)}
road(0,0,140,10);road(0,0,10,140);road(0,38,140,8);road(0,-38,140,8);road(38,0,8,140);road(-38,0,8,140);

function tree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);
  const trunk=cylinder(.45,3*s,0x79563d);trunk.position.y=1.5*s;g.add(trunk);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(2.2*s,1),mat(0x2e6650));crown.position.y=4*s;crown.castShadow=true;g.add(crown);
  city.add(g)
}
[[-12,-10],[14,-10],[-13,12],[14,13],[-52,-23],[51,22],[-52,22],[52,-22],[-22,-52],[22,52],[-22,52],[22,-52]].forEach(p=>tree(p[0],p[1],.85));

function building(x,z,w,h,d,color,label,desc){
  const g=new THREE.Group();g.position.set(x,0,z);g.userData={label,desc};
  const body=box(w,h,d,color);body.position.y=h/2;g.add(body);
  const roof=box(w+.5,.35,d+.5,0x24302d);roof.position.y=h+.18;g.add(roof);
  const door=box(Math.min(2,w*.22),2.4,.12,0x16201e);door.position.set(0,1.2,d/2+.07);g.add(door);
  for(let y=2.7;y<h-1;y+=2.6){
    for(let xx=-w/2+1.3;xx<w/2-1;xx+=2.6){
      const win=box(1.15,1.1,.1,0x8bc7c0);win.position.set(xx,y,d/2+.08);g.add(win)
    }
  }
  const sign=box(Math.min(w*.8,8),.85,.18,0xf0d67f);sign.position.set(0,h*.68,d/2+.14);g.add(sign);
  city.add(g);clickable.push(g);return g
}

building(-20,-20,13,8,10,0x7b6655,'Art District','Paint, design, build and show your work.');
building(20,-20,13,11,10,0x526b7b,'Game Zone','Mini games, team challenges and a giant arcade tower.');
building(-20,20,13,10,10,0x6b7c58,'Sports Park','A big open park for races, courts and team play.');
building(20,20,13,12,10,0x6a596f,'Tech Lab','Robotics, coding puzzles and weird little inventions.');
building(-52,0,14,8,12,0x80735d,'Library','A quiet place for quests, stories and knowledge challenges.');
building(52,0,14,9,12,0x7b5c4f,'Food Street','Cute cafés, snack spots and the busiest street in town.');

const plaza=new THREE.Mesh(new THREE.CylinderGeometry(14,14,.25,48),mat(0xc3ad79));plaza.position.y=.12;city.add(plaza);
const fountain=new THREE.Mesh(new THREE.CylinderGeometry(4,4,.7,32),mat(0x6b827f));fountain.position.y=.55;city.add(fountain);
const water=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,.18,32),new THREE.MeshStandardMaterial({color:0x5aa8ad,roughness:.18,metalness:.05}));water.position.y=.95;city.add(water);

function createFallback(){
  const g=new THREE.Group();
  const body=box(1.25,1.7,.85,0x2d6cdf);body.position.y=2;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.72,24,16),mat(0xf0b88c));head.position.y=3.45;head.castShadow=true;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.76,24,12,0,Math.PI*2,0,Math.PI*.45),mat(0x2a211d));hair.position.y=3.72;hair.castShadow=true;g.add(hair);
  [-.35,.35].forEach(x=>{const leg=box(.32,1.25,.38,0x27384a);leg.position.set(x,-.02,0);g.add(leg)});
  [-.82,.82].forEach(x=>{const arm=box(.3,1.35,.35,0xf0b88c);arm.position.set(x,2.02,0);arm.rotation.z=x<0?.12:-.12;g.add(arm)});
  g.position.set(0,0,7);return g
}

avatar=createFallback();scene.add(avatar);

function showToast(text){
  const t=document.querySelector('#toast');t.textContent=text;t.classList.add('show');
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2400)
}

function loadModel(url){
  const loader=new GLTFLoader();
  loader.load(url,gltf=>{
    if(avatar)scene.remove(avatar);
    avatar=gltf.scene;avatar.scale.setScalar(1.35);avatar.position.set(0,0,7);
    avatar.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    scene.add(avatar);
    if(gltf.animations?.length){
      mixer=new THREE.AnimationMixer(avatar);
      const idle=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];
      activeAction=mixer.clipAction(idle);activeAction.play()
    }
    showToast('Character loaded. Welcome to PlayCity.')
  },undefined,()=>{})
}
loadModel('./kids_avatars.glb');

function showDistrict(obj){
  selected=obj;
  document.querySelector('#districtKicker').textContent=obj.userData.label.toUpperCase();
  document.querySelector('#districtTitle').textContent=obj.userData.label;
  document.querySelector('#districtDescription').textContent=obj.userData.desc;
  document.querySelector('#districtPanel').classList.add('visible')
}

const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
addEventListener('pointerdown',e=>{
  pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(clickable,true);
  if(hits.length){
    let o=hits[0].object;
    while(o.parent&&!o.userData.label)o=o.parent;
    if(o.userData.label)showDistrict(o)
  }
});

document.querySelector('#enterDistrict').onclick=()=>{
  if(!selected)return;
  const coins=document.querySelector('#coins');
  coins.textContent=String(Number(coins.textContent)+25);
  showToast('+25 coins · '+selected.userData.label+' activity joined')
};
document.querySelector('#avatarButton').onclick=()=>document.querySelector('#modalBackdrop').classList.add('open');
document.querySelector('#closeModal').onclick=()=>document.querySelector('#modalBackdrop').classList.remove('open');
document.querySelector('#modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')e.currentTarget.classList.remove('open')};
document.querySelector('#characterFile').onchange=e=>{
  const f=e.target.files?.[0];if(!f)return;
  loadModel(URL.createObjectURL(f));document.querySelector('#modalBackdrop').classList.remove('open')
};

addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&onGround){velocityY=8.5;onGround=false}});
addEventListener('keyup',e=>keys[e.code]=false);

let yaw=0,pitch=.34,dragging=false,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{if(e.button===2)return;dragging=true;lastX=e.clientX;lastY=e.clientY});
addEventListener('pointerup',()=>dragging=false);
addEventListener('pointermove',e=>{
  if(!dragging)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
  yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-.05,.75)
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.035);
  if(mixer)mixer.update(dt);
  const move=new THREE.Vector3();
  if(keys.KeyW)move.z-=1;if(keys.KeyS)move.z+=1;if(keys.KeyA)move.x-=1;if(keys.KeyD)move.x+=1;
  if(move.lengthSq()){
    move.normalize();
    const speed=(keys.ShiftLeft||keys.ShiftRight)?9:5.2;
    move.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    avatar.position.addScaledVector(move,speed*dt);
    avatar.rotation.y=Math.atan2(move.x,move.z)
  }
  velocityY-=22*dt;avatar.position.y+=velocityY*dt;
  if(avatar.position.y<=0){avatar.position.y=0;velocityY=0;onGround=true}
  avatar.position.x=THREE.MathUtils.clamp(avatar.position.x,-67,67);
  avatar.position.z=THREE.MathUtils.clamp(avatar.position.z,-67,67);
  const target=avatar.position.clone().add(new THREE.Vector3(0,2.2,0));
  const camOffset=new THREE.Vector3(0,5.2,10.5).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  camera.position.lerp(target.clone().add(camOffset),1-Math.pow(.001,dt));
  camera.lookAt(target);
  renderer.render(scene,camera)
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)
});