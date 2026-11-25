import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const canvas = document.querySelector("#world");
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loadingText");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101719);
scene.fog = new THREE.FogExp2(0x101719, 0.0065);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 26, 34);

const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xbfd6d2, 0x14191a, 2.2));
const sun = new THREE.DirectionalLight(0xffe6bb, 3.3);
sun.position.set(-80, 120, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-120; sun.shadow.camera.right=120;
sun.shadow.camera.top=120; sun.shadow.camera.bottom=-120;
scene.add(sun);

const city = new THREE.Group();
scene.add(city);
let mapRoot = null;

const raycaster = new THREE.Raycaster();
const downRay = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const keys = {};
const citizens = [];
const mixers = [];
let selectedCitizen = null;
let followCitizen = null;
let paused = false;
let simMinutes = 8 * 60;
let day = 1;
let eventTimer = 0;
let cityFloor = 0;
let cityRadius = 90;
let cityScale = 1;
let yaw = 0;
let pitch = 0.45;
let dragging = false;
let lastPointer = {x:0,y:0};

const jobs = [
  ["Software Developer","Work"],["Teacher","Work"],["Doctor","Work"],["Nurse","Work"],
  ["Architect","Work"],["Chef","Work"],["Photographer","Outside"],["Barista","Outside"],
  ["Journalist","Work"],["Electrician","Work"],["Designer","Work"],["Mechanic","Work"],
  ["Musician","Outside"],["Shop Owner","Work"],["Student","Study"],["Fitness Coach","Outside"]
];
const personalities = ["Curious","Quiet","Bold","Social","Focused","Chaotic","Kind","Ambitious","Calm","Restless"];
const firstNames = ["Aarav","Vivaan","Aditya","Arjun","Kabir","Rohan","Yash","Dev","Ishaan","Reyansh","Aanya","Anaya","Kiara","Myra","Riya","Ira","Diya","Meera","Sara","Tara"];
const lastNames = ["Shah","Patel","Mehta","Shukla","Kapoor","Joshi","Rao","Singh","Desai","Verma","Malhotra","Trivedi","Bansal","Mistry"];
const modelURLs = [
  "https://models.vinish.dev/people/casual-man.glb",
  "https://models.vinish.dev/people/casual-woman.glb",
  "https://models.vinish.dev/people/business-man.glb",
  "https://models.vinish.dev/people/business-woman.glb",
  "https://models.vinish.dev/people/construction-worker.glb",
  "https://models.vinish.dev/people/doctor.glb",
  "https://models.vinish.dev/people/runner.glb",
  "https://models.vinish.dev/people/soldier.glb"
];

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return a + Math.random()*(b-a); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function money(n){ return "₹"+Math.round(n).toLocaleString("en-IN"); }
function formatTime(m){ const h=Math.floor(m/60)%24,min=Math.floor(m%60); return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`; }
function setLoading(t){ loadingText.textContent=t; }
function addFeed(message){
  const feed=document.querySelector("#feed"),row=document.createElement("div");
  row.className="feed-item";row.innerHTML=message;feed.prepend(row);
  while(feed.children.length>4)feed.lastElementChild.remove();
}
function worldBounds(group){ const b=new THREE.Box3().setFromObject(group); return {b,size:b.getSize(new THREE.Vector3()),center:b.getCenter(new THREE.Vector3())}; }

function makeFallbackCity(){
  const g=new THREE.Group();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(190,130),new THREE.MeshStandardMaterial({color:0x2b3030,roughness:1}));
  ground.rotation.x=-Math.PI/2;g.add(ground);
  const roadMat=new THREE.MeshStandardMaterial({color:0x141819,roughness:.92});
  for(const [x,z,w,d] of [[0,0,170,9],[0,0,9,120],[0,32,170,7],[0,-32,170,7],[42,0,7,120],[-42,0,7,120]]){
    const r=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),roadMat);r.position.set(x,.04,z);g.add(r);
  }
  for(let i=0;i<26;i++){
    const x=rand(-72,72),z=rand(-50,50); if(Math.abs(x)<10||Math.abs(z)<8)continue;
    const w=rand(5,11),d=rand(5,10),h=rand(5,20);
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:0x3a4444,roughness:.8}));
    b.position.set(x,h/2,z);b.castShadow=true;b.receiveShadow=true;g.add(b);
  }
  city.add(g);mapRoot=g;cityFloor=0;cityRadius=82;return g;
}

async function loadCity(){
  setLoading("Loading your city map…"); const loader=new GLTFLoader();
  try{
    const gltf=await loader.loadAsync("./assets/apocalyptic_city.glb");
    const bounds=worldBounds(gltf.scene),maxXZ=Math.max(bounds.size.x,bounds.size.z);
    cityScale=180/maxXZ;gltf.scene.scale.setScalar(cityScale);
    gltf.scene.position.sub(bounds.center.multiplyScalar(cityScale));
    gltf.scene.position.y-=bounds.min.y*cityScale;
    gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    mapRoot=gltf.scene;city.add(gltf.scene);
    const fitted=worldBounds(gltf.scene);cityFloor=fitted.min.y;cityRadius=Math.max(fitted.size.x,fitted.size.z)*.48;
    return gltf.scene;
  }catch(err){ console.warn("Map GLB missing; using fallback city.",err);setLoading("Map asset not found — building fallback city…");return makeFallbackCity(); }
}
function makeMarker(color=0xe8c46a){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.5,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.2,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.25}));
  beam.position.y=1.1;g.add(beam);return g;
}
function groundPoint(x,z){
  downRay.set(new THREE.Vector3(x,cityFloor+120,z),new THREE.Vector3(0,-1,0));
  const hits=downRay.intersectObject(mapRoot||city,true); if(hits.length)return hits[0].point.clone();
  return new THREE.Vector3(x,cityFloor,z);
}
function randomCityPoint(margin=.08){
  for(let i=0;i<80;i++){const a=rand(0,Math.PI*2),r=Math.sqrt(Math.random())*cityRadius*(1-margin),p=groundPoint(Math.cos(a)*r,Math.sin(a)*r);if(Number.isFinite(p.y))return p;}
  return new THREE.Vector3(0,cityFloor,0);
}
function scheduleFor(c){
  const h=simMinutes/60;
  if(h<8)return ["Home",c.home];
  if(h<9.5)return ["Commute",c.work];
  if(h<17.5)return ["Working",c.work];
  if(h<19)return ["Commute",c.leisure];
  if(h<22)return [Math.random()<.25?"Meeting friends":"Outside",c.leisure];
  return ["Home",c.home];
}
function makeCitizen(i){
  const job=pick(jobs),c={
    id:i+1,name:`${pick(firstNames)} ${pick(lastNames)}`,age:Math.floor(rand(18,61)),job:job[0],personality:pick(personalities),
    money:Math.floor(rand(12000,185000)),energy:Math.floor(rand(55,100)),
    goal:pick(["Buy a car","Open a business","Get promoted","Travel abroad","Learn something new","Find a better home","Start a side project","Make new friends"]),
    friends:[],activity:"Home",home:randomCityPoint(.18),work:randomCityPoint(.22),leisure:randomCityPoint(.15),
    target:null,speed:rand(1.15,2.15),stateClock:rand(0,8),object:null,mixer:null,actions:{},marker:null,wander:Math.random()*Math.PI*2
  };
  c.position=c.home.clone();citizens.push(c);return c;
}
function setupCitizenModel(c,source){
  const model=SkeletonUtils.clone(source.scene);model.scale.setScalar(rand(.94,1.05));model.position.copy(c.position);model.rotation.y=rand(-Math.PI,Math.PI);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  c.object=model;c.mixer=new THREE.AnimationMixer(model);const animations=source.animations||[];
  c.actions.idle=c.mixer.clipAction(animations.find(a=>/idle/i.test(a.name))||animations[0]);
  c.actions.walk=c.mixer.clipAction(animations.find(a=>/walk/i.test(a.name))||animations[0]);
  c.actions.run=c.mixer.clipAction(animations.find(a=>/run/i.test(a.name))||animations[0]);
  c.actions.idle.play();c.active="idle";c.marker=makeMarker();c.marker.position.set(0,2.05,0);c.marker.visible=false;model.add(c.marker);city.add(model);mixers.push(c.mixer);
}
function playAction(c,name){
  if(c.active===name||!c.actions[name])return;const from=c.actions[c.active],to=c.actions[name];to.reset().fadeIn(.2).play();if(from)from.fadeOut(.2);c.active=name;
}
function updateCitizen(c,dt){
  if(!c.object)return;c.stateClock-=dt;
  if(c.stateClock<=0){const [activity,target]=scheduleFor(c);c.activity=activity;c.target=target.clone();c.stateClock=rand(10,24);if(activity==="Working")c.energy=clamp(c.energy-.4,0,100);if(activity==="Home")c.energy=clamp(c.energy+.7,0,100);}
  if(c.target){
    const pos=c.object.position,dir=c.target.clone().sub(pos);dir.y=0;const dist=dir.length();
    if(dist>1.4){dir.normalize();const speed=c.speed*(c.activity==="Commute"?1.35:1);pos.addScaledVector(dir,speed*dt);const floor=groundPoint(pos.x,pos.z);pos.y=THREE.MathUtils.lerp(pos.y,floor.y,.2);c.object.rotation.y=Math.atan2(dir.x,dir.z);playAction(c,c.activity==="Commute"?"run":"walk");}
    else{c.target=null;playAction(c,"idle");}
  }
  c.wander+=dt*(.15+Math.random()*.04);if(c.activity==="Outside"&&!c.target)c.target=c.leisure.clone().add(new THREE.Vector3(Math.sin(c.wander)*4,0,Math.cos(c.wander)*4));
  if(c.marker)c.marker.visible=selectedCitizen===c;
}
function selectCitizen(c){
  selectedCitizen=c;document.querySelector("#citizenPanel").classList.add("active");
  document.querySelector("#citizenName").textContent=c.name;document.querySelector("#citizenRole").textContent=`${c.job} · ${c.personality}`;
  document.querySelector("#citizenAge").textContent=c.age;document.querySelector("#citizenMoney").textContent=money(c.money);document.querySelector("#citizenEnergy").textContent=Math.round(c.energy)+"%";document.querySelector("#citizenFriends").textContent=c.friends.length;
  document.querySelector("#citizenPersonality").textContent=c.personality;document.querySelector("#citizenActivity").textContent=c.activity;document.querySelector("#citizenGoal").textContent=c.goal;
  addFeed(`<span class="feed-name">${c.name}</span> is being watched.`);
}
function closeCitizen(){selectedCitizen=null;followCitizen=null;document.querySelector("#citizenPanel").classList.remove("active");}
function findCitizenHit(){
  raycaster.setFromCamera(pointer,camera);const objects=citizens.filter(c=>c.object).map(c=>c.object),hits=raycaster.intersectObjects(objects,true);if(!hits.length)return null;
  let obj=hits[0].object;while(obj.parent&&!obj.userData.citizen)obj=obj.parent;return obj.userData.citizen||citizens.find(c=>c.object===obj);
}
function attachCitizenIds(){for(const c of citizens)if(c.object)c.object.userData.citizen=c;}
function updateFollow(dt){
  if(!followCitizen?.object)return;const p=followCitizen.object.position.clone(),target=p.clone().add(new THREE.Vector3(0,1.6,0)),offset=new THREE.Vector3(0,3.2,7.2).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  camera.position.lerp(target.clone().add(offset),1-Math.pow(.001,dt));camera.lookAt(target);
}
let observer=new THREE.Vector3(0,cityFloor+15,35);
function updateFreeCamera(dt){
  const dir=new THREE.Vector3();if(keys.KeyW)dir.z-=1;if(keys.KeyS)dir.z+=1;if(keys.KeyA)dir.x-=1;if(keys.KeyD)dir.x+=1;
  if(dir.lengthSq()){dir.normalize();dir.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);const speed=(keys.ShiftLeft||keys.ShiftRight)?28:14;observer.addScaledVector(dir,speed*dt);}
  observer.y=clamp(observer.y,-cityRadius*.05,cityRadius*.75);observer.x=clamp(observer.x,-cityRadius,cityRadius);observer.z=clamp(observer.z,-cityRadius,cityRadius);
  const target=observer.clone(),offset=new THREE.Vector3(0,5,9).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);camera.position.lerp(target.clone().add(offset),1-Math.pow(.001,dt));camera.lookAt(target);
}
function updateClock(dt){
  if(paused)return;simMinutes+=dt*2.5;
  if(simMinutes>=24*60){simMinutes=0;day++;for(const c of citizens)c.money+=Math.floor(rand(100,800));addFeed(`<span class="feed-name">CITY</span> entered day ${String(day).padStart(2,"0")}.`);}
  document.querySelector("#cityTime").textContent=formatTime(simMinutes);document.querySelector("#day").textContent=String(day).padStart(2,"0");
}
function updateStats(){
  let working=0,resting=0,outside=0,meeting=0;for(const c of citizens){if(c.activity==="Working")working++;else if(c.activity==="Home")resting++;else if(c.activity==="Meeting friends")meeting++;else outside++;}
  document.querySelector("#workingCount").textContent=working;document.querySelector("#restingCount").textContent=resting;document.querySelector("#outsideCount").textContent=outside;document.querySelector("#meetingCount").textContent=meeting;document.querySelector("#activityCount").textContent=`${working+outside+meeting} active`;
}
async function loadPeople(){
  setLoading("Loading human models…");const loader=new GLTFLoader(),loaded=[];
  for(let i=0;i<modelURLs.length;i++){try{loaded.push(await loader.loadAsync(modelURLs[i]));setLoading(`Loading human models ${i+1}/${modelURLs.length}…`);}catch(err){console.warn("Could not load",modelURLs[i],err);}}
  if(!loaded.length)throw new Error("No human models could be loaded. Check internet access.");
  for(let i=0;i<citizens.length;i++)setupCitizenModel(citizens[i],loaded[i%loaded.length]);attachCitizenIds();addFeed('<span class="feed-name">CITY</span> 100 citizens entered the simulation.');
}
async function boot(){
  try{await loadCity();for(let i=0;i<100;i++)makeCitizen(i);await loadPeople();loading.remove();addFeed('<span class="feed-name">SYSTEM</span> simulation online.');}
  catch(err){console.error(err);loadingText.textContent="Map loaded, but human models could not be fetched. Refresh with internet access.";}
}
boot();
canvas.addEventListener("pointerdown",e=>{
  pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;const hit=findCitizenHit();
  if(hit){selectCitizen(hit);return;}dragging=true;lastPointer={x:e.clientX,y:e.clientY};
});
addEventListener("pointerup",()=>dragging=false);
addEventListener("pointermove",e=>{if(!dragging||followCitizen)return;const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};yaw-=dx*.004;pitch=clamp(pitch-dy*.003,-.1,.9);});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Escape")closeCitizen();});
addEventListener("keyup",e=>keys[e.code]=false);
document.querySelector("#closeCitizen").onclick=closeCitizen;
document.querySelector("#followBtn").onclick=()=>{if(selectedCitizen){followCitizen=selectedCitizen;addFeed(`<span class="feed-name">CAMERA</span> following ${selectedCitizen.name}.`);}};
document.querySelector("#pauseBtn").onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?"▶":"Ⅱ";e.currentTarget.title=paused?"Resume simulation":"Pause simulation";};
function socialSimulation(dt){
  eventTimer+=dt;if(eventTimer<4)return;eventTimer=0;
  const a=citizens[Math.floor(Math.random()*citizens.length)],b=citizens[Math.floor(Math.random()*citizens.length)];
  if(a===b||!a.object||!b.object)return;
  if(a.object.position.distanceTo(b.object.position)<5){if(!a.friends.includes(b.id))a.friends.push(b.id);if(!b.friends.includes(a.id))b.friends.push(a.id);if(Math.random()<.55)addFeed(`<span class="feed-name">${a.name}</span> met <span class="feed-name">${b.name}</span>.`);}
}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);updateClock(dt);
  if(!paused){for(const c of citizens)updateCitizen(c,dt);for(const m of mixers)m.update(dt);socialSimulation(dt);}
  if(followCitizen)updateFollow(dt);else updateFreeCamera(dt);
  if(selectedCitizen){document.querySelector("#citizenEnergy").textContent=Math.round(selectedCitizen.energy)+"%";document.querySelector("#citizenMoney").textContent=money(selectedCitizen.money);document.querySelector("#citizenFriends").textContent=selectedCitizen.friends.length;document.querySelector("#citizenActivity").textContent=selectedCitizen.activity;}
  updateStats();renderer.render(scene,camera);
}
animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});