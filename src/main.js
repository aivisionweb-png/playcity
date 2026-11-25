import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const $=s=>document.querySelector(s), canvas=$("#world"), loading=$("#loading"), loadingText=$("#loadingText");
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x17201f); scene.fog=new THREE.FogExp2(0x17201f,.0038);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1000); camera.position.set(0,28,42);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.45;
scene.add(new THREE.HemisphereLight(0xd7e4df,0x28302f,3.2));
const sun=new THREE.DirectionalLight(0xffedcf,4.2); sun.position.set(-70,120,55); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); scene.add(sun);
const fill=new THREE.DirectionalLight(0x9bd9cf,1.3); fill.position.set(90,40,-70); scene.add(fill);

const city=new THREE.Group(); scene.add(city); let mapRoot=null,cityFloor=0,cityRadius=86;
const ray=new THREE.Raycaster(),downRay=new THREE.Raycaster(),pointer=new THREE.Vector2(),clock=new THREE.Clock();
const keys={},citizens=[],cars=[],police=[],mixers=[];
let selected=null,follow=null,paused=false,speedMult=1,simMinutes=8*60,day=1,eventTimer=0,economyTimer=0,disasterCooldown=3,nextIndex=-1;
let observer=new THREE.Vector3(0,14,34),yaw=0,dragging=false,lastPointer={x:0,y:0};

const maleFirst=["Aarav","Vivaan","Aditya","Arjun","Kabir","Rohan","Yash","Dev","Ishaan","Reyansh","Kunal","Neel","Dhruv","Om","Krish","Veer","Ritvik","Ayaan","Manav","Rudra"];
const femaleFirst=["Aanya","Anaya","Kiara","Myra","Riya","Ira","Diya","Meera","Sara","Tara","Nisha","Mahi","Aditi","Mira","Avni","Siya","Navya","Ishita","Anvi","Kavya"];
const last=["Shah","Patel","Mehta","Shukla","Kapoor","Joshi","Rao","Singh","Desai","Verma","Malhotra","Trivedi","Bansal","Mistry"];
const jobs=["Software Developer","Teacher","Doctor","Nurse","Architect","Chef","Photographer","Barista","Journalist","Electrician","Designer","Mechanic","Musician","Shop Owner","Student","Fitness Coach","Police Officer","Delivery Rider","Accountant","Engineer"];
const traits=["Curious","Quiet","Bold","Social","Focused","Chaotic","Kind","Ambitious","Calm","Restless","Optimistic","Competitive"];
const goals=["Buy a car","Open a business","Get promoted","Travel abroad","Learn something new","Find a better home","Start a side project","Make new friends","Save ₹1 lakh","Become mayor"];
const skins=[0xc88d68,0xb97850,0xe0a27d,0x9b603f,0xd49a78,0xf0b28b];
const shirts=[0x24384a,0x6b4a36,0x3b5f55,0x5a365a,0x3f3f46,0x8b4c3c,0x36536f,0x6b6b35];
const hairColors=[0x171514,0x3a2418,0x4a3425,0x6a4328,0x101112];
const carsColors=[0x1d2730,0x7a3e32,0x315c5b,0x777052,0x33466b,0x5a5a5a];
const workZones={
 "Software Developer":[-31,-28],"Teacher":[31,30],"Doctor":[-31,30],"Nurse":[-31,30],"Architect":[0,0],
 "Chef":[31,-28],"Photographer":[32,30],"Barista":[31,-28],"Journalist":[0,0],"Electrician":[-30,-28],
 "Designer":[0,0],"Mechanic":[-30,-28],"Musician":[32,30],"Shop Owner":[31,-28],"Student":[31,30],
 "Fitness Coach":[32,30],"Police Officer":[-31,30],"Delivery Rider":[31,-28],"Accountant":[-31,-28],"Engineer":[-31,-28]
};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),money=n=>"₹"+Math.round(n).toLocaleString("en-IN");
const fmt=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(Math.floor(m%60)).padStart(2,"0");
const feed=m=>{const f=$("#feed"),r=document.createElement("div");r.className="feed-item";r.innerHTML=m;f.prepend(r);while(f.children.length>6)f.lastElementChild.remove()};

function bounds(g){const b=new THREE.Box3().setFromObject(g);return{min:b.min.clone(),size:b.getSize(new THREE.Vector3()),center:b.getCenter(new THREE.Vector3())}}
function ground(x,z){downRay.set(new THREE.Vector3(x,cityFloor+150,z),new THREE.Vector3(0,-1,0));const h=downRay.intersectObject(mapRoot||city,true)[0];return h?h.point.clone():new THREE.Vector3(x,cityFloor,z)}
function randomPoint(m=.1){for(let i=0;i<50;i++){const a=rand(0,Math.PI*2),r=Math.sqrt(Math.random())*cityRadius*(1-m),p=ground(Math.cos(a)*r,Math.sin(a)*r);if(Number.isFinite(p.y))return p}return new THREE.Vector3(0,cityFloor,0)}

function fallbackCity(){
 const g=new THREE.Group(),floor=new THREE.Mesh(new THREE.PlaneGeometry(210,150),new THREE.MeshStandardMaterial({color:0x4a504e,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
 const road=new THREE.MeshStandardMaterial({color:0x1b2021,roughness:.92});
 [[0,0,190,10],[0,0,10,140],[0,38,190,8],[0,-38,190,8],[50,0,8,140],[-50,0,8,140]].forEach(v=>{const r=new THREE.Mesh(new THREE.BoxGeometry(v[2],.08,v[3]),road);r.position.set(v[0],.04,v[1]);g.add(r)});
 for(let i=0;i<36;i++){let x=rand(-82,82),z=rand(-58,58);if(Math.abs(x)<12||Math.abs(z)<10)continue;let w=rand(6,13),d=rand(6,12),h=rand(5,25),b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:pick([0x53605d,0x5b625f,0x465450,0x6a6257]),roughness:.84}));b.position.set(x,h/2,z);b.castShadow=true;g.add(b)}
 city.add(g);mapRoot=g;cityFloor=0;cityRadius=88
}
async function loadCity(){
 loadingText.textContent="Loading city map…";
 try{const g=await new GLTFLoader().loadAsync("./assets/apocalyptic_city.glb"),b=bounds(g.scene),scale=180/Math.max(b.size.x,b.size.z);g.scene.scale.setScalar(scale);g.scene.position.sub(b.center.multiplyScalar(scale));g.scene.position.y-=b.min.y*scale;g.scene.traverse(o=>{if(o.isMesh)o.receiveShadow=true});city.add(g.scene);mapRoot=g.scene;const f=bounds(g.scene);cityFloor=f.min.y;cityRadius=Math.max(f.size.x,f.size.z)*.48}
 catch(e){console.warn(e);loadingText.textContent="Local city renderer online…";fallbackCity()}
}

function landmark(x,z,name,color){
 const g=new THREE.Group();g.position.copy(ground(x,z));
 const base=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.8,.45,24),new THREE.MeshStandardMaterial({color:0x222a29}));base.position.y=.25;g.add(base);
 const tower=new THREE.Mesh(new THREE.BoxGeometry(2.4,5.5,2.4),new THREE.MeshStandardMaterial({color:0x46504c,emissive:color,emissiveIntensity:.04}));tower.position.y=3;g.add(tower);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.8,.08,8,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6}));ring.rotation.x=Math.PI/2;ring.position.y=.5;g.add(ring);city.add(g)
}
function infrastructure(){[[-30,-28,0xe8c46a],[31,-28,0x72d7c7],[-31,30,0x79a9ff],[32,30,0xc8b37b],[0,0,0xe8c46a]].forEach(v=>landmark(v[0],v[1],"",v[2]))}

function human(c){
 const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:skins[c.id%skins.length],roughness:.82});
 const shirt=new THREE.MeshStandardMaterial({color:shirts[c.id%shirts.length],roughness:.72});
 const pants=new THREE.MeshStandardMaterial({color:c.gender==="female"?0x343a46:0x202731,roughness:.85});
 const shoe=new THREE.MeshStandardMaterial({color:0x121517,roughness:.9});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(c.gender==="female"?.22:.25,c.gender==="female"?.50:.62,6,10),shirt);torso.position.y=1.02;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.235,16,12),skin);head.position.y=1.78;head.castShadow=true;g.add(head);
 if(c.gender==="female"){const hair=new THREE.Mesh(new THREE.SphereGeometry(.255,16,12),new THREE.MeshStandardMaterial({color:hairColors[c.id%hairColors.length]}));hair.scale.set(1,1.12,.92);hair.position.set(0,1.86,-.035);hair.castShadow=true;g.add(hair);const pony=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),hair.material);pony.position.set(0,.03,-.23);pony.position.y=1.75;g.add(pony)}
 else {const hair=new THREE.Mesh(new THREE.SphereGeometry(.24,16,8),new THREE.MeshStandardMaterial({color:hairColors[c.id%hairColors.length]}));hair.scale.set(1,.48,.95);hair.position.set(0,1.95,-.02);g.add(hair)}
 const legGap=c.gender==="female"?.09:.11;for(const x of [-legGap,legGap]){const l=new THREE.Mesh(new THREE.CapsuleGeometry(.072,.56,5,8),pants);l.position.set(x,.46,0);l.castShadow=true;g.add(l);const sh=new THREE.Mesh(new THREE.BoxGeometry(.23,.09,.38),shoe);sh.position.set(x,.11,.05);g.add(sh)}
 for(const x of [-.34,.34]){const a=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.48,5,8),shirt);a.position.set(x,1.08,0);a.rotation.z=x<0?.18:-.18;a.castShadow=true;g.add(a)}
 if(c.job==="Doctor"||c.job==="Nurse"){const coat=new THREE.Mesh(new THREE.BoxGeometry(.48,.68,.30),new THREE.MeshStandardMaterial({color:0xf1f2ed,roughness:.8}));coat.position.set(0,1.04,.04);g.add(coat);const cross=new THREE.Mesh(new THREE.BoxGeometry(.08,.25,.02),new THREE.MeshBasicMaterial({color:0xd44b45}));cross.position.set(0,1.18,.205);g.add(cross)}
 if(c.job==="Chef"){const hat=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.16,16),new THREE.MeshStandardMaterial({color:0xf0eee8}));hat.position.y=2.08;g.add(hat)}
 if(c.job==="Construction Worker"){const hat=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.12,16),new THREE.MeshStandardMaterial({color:0xf0bd45}));hat.position.y=2.03;g.add(hat)}
 if(c.job==="Police Officer"){const badge=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.025),new THREE.MeshBasicMaterial({color:0xe8c46a}));badge.position.set(.08,1.25,.205);g.add(badge)}
 if(c.job==="Delivery Rider"){const box=new THREE.Mesh(new THREE.BoxGeometry(.36,.35,.3),new THREE.MeshStandardMaterial({color:0xd97732}));box.position.set(0,1.05,-.25);g.add(box)}
 if(c.job==="Musician"){const guitar=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),new THREE.MeshStandardMaterial({color:0x8c5730}));g.add(guitar);guitar.position.set(.28,.92,.08)}
 if(c.job==="Student"){const bag=new THREE.Mesh(new THREE.BoxGeometry(.36,.45,.16),new THREE.MeshStandardMaterial({color:0x3d6172}));bag.position.set(0,1.05,-.22);g.add(bag)}
 if(c.job==="Mechanic"){const tool=new THREE.Mesh(new THREE.BoxGeometry(.08,.42,.08),new THREE.MeshStandardMaterial({color:0x9ca3a0,metalness:.7}));tool.position.set(.38,.92,.04);tool.rotation.z=-.3;g.add(tool)}
 const ring=new THREE.Mesh(new THREE.RingGeometry(.34,.43,20),new THREE.MeshBasicMaterial({color:0xe8c46a,transparent:true,opacity:.72,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.visible=false;g.add(ring);c.ring=ring;g.userData.citizen=c;return g
}
function workPoint(job){const z=workZones[job]||[0,0];return ground(z[0]+rand(-7,7),z[1]+rand(-7,7))}
function makeCitizen(i){
 const gender=Math.random()<.5?"male":"female",age=Math.floor(rand(18,66));
 let job=pick(jobs);if(age<23)job=Math.random()<.65?"Student":pick(["Barista","Delivery Rider","Designer","Photographer","Fitness Coach"]);
 const c={id:i+1,gender,name:pick(gender==="male"?maleFirst:femaleFirst)+" "+pick(last),age,job,personality:pick(traits),money:Math.floor(rand(12000,185000)),energy:rand(55,100),health:rand(70,100),happiness:rand(45,90),goal:pick(goals),friends:[],partner:null,children:0,alive:true,criminal:false,home:randomPoint(.2),work:workPoint(job),leisure:randomPoint(.16),target:null,activity:"Home",state:rand(1,8),speed:rand(1.2,2.2),object:null};
 c.object=human(c);c.object.position.copy(c.home);c.object.scale.setScalar(rand(.94,1.05));city.add(c.object);citizens.push(c)
}
function schedule(c){const h=simMinutes/60;if(h<7.5)return["Home",c.home];if(h<9)return["Commute",c.work];if(h<17)return["Working",c.work];if(h<19)return["Commute",c.leisure];if(h<22)return[Math.random()<.52?"Meeting friends":"Outside",c.leisure];return["Home",c.home]}
function move(c,dt){
 if(!c.alive)return;
 c.state-=dt;
 if(c.state<=0){const s=schedule(c);c.activity=s[0];c.target=s[1].clone();c.state=rand(9,18)}
 if(!c.target)return;
 const p=c.object.position,d=c.target.clone().sub(p);d.y=0;
 if(d.length()<1.35){c.target=null;if(c.activity==="Working")c.energy=clamp(c.energy+3,0,100);return}
 d.normalize();const pace=c.activity==="Commute"?1.65:c.activity==="Working"?.55:c.activity==="Meeting friends"?1.05:1;
 p.addScaledVector(d,c.speed*pace*dt);p.y=THREE.MathUtils.lerp(p.y,ground(p.x,p.z).y,.35);c.object.rotation.y=Math.atan2(d.x,d.z);
 const bob=c.activity==="Working"?Math.sin(performance.now()*.012+c.id)*.012:Math.sin(performance.now()*.018+c.id)*.025;c.object.position.y+=bob;
 c.energy=clamp(c.energy-(c.activity==="Working"?.012:.03)*c.speed*dt,8,100)
}

function car(){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(2.2,.55,3.7),new THREE.MeshStandardMaterial({color:pick(carsColors),metalness:.15,roughness:.7}));body.position.y=.55;g.add(body);
 const cab=new THREE.Mesh(new THREE.BoxGeometry(1.7,.5,1.7),new THREE.MeshStandardMaterial({color:0x273436,transparent:true,opacity:.9}));cab.position.y=.95;g.add(cab);return g
}
function makeCars(){for(let i=0;i<16;i++){const o=car(),axis=i%2?"x":"z",dir=i%2?1:-1;o.position.set(axis==="x"?rand(-42,42):rand(-55,55),.1,axis==="z"?rand(-42,42):rand(-55,55));city.add(o);cars.push({o,axis,dir,s:rand(4,8)})}}
function updateCars(dt){for(const c of cars){if(c.axis==="x"){c.o.position.x+=c.s*c.dir*dt;if(Math.abs(c.o.position.x)>88)c.dir*=-1;c.o.rotation.y=c.dir>0?Math.PI/2:-Math.PI/2}else{c.o.position.z+=c.s*c.dir*dt;if(Math.abs(c.o.position.z)>68)c.dir*=-1;c.o.rotation.y=c.dir>0?0:Math.PI}}}

function makePolice(){for(let i=0;i<4;i++){const c={id:100+i,gender:i%2?"female":"male",job:"Police Officer"};const o=human(c);o.scale.setScalar(.98);o.position.copy(randomPoint(.2));city.add(o);police.push({o,target:null,s:2.8})}}
function updatePolice(dt){for(const p of police){if(!p.target||!p.target.alive)p.target=pick(citizens.filter(c=>c.alive));if(!p.target)continue;const d=p.target.object.position.clone().sub(p.o.position);d.y=0;if(d.length()>2.5){d.normalize();p.o.position.addScaledVector(d,p.s*dt);p.o.rotation.y=Math.atan2(d.x,d.z)}else if(p.target.criminal){p.target.criminal=false;p.target.happiness=clamp(p.target.happiness-10,0,100);feed("<span class='feed-name'>POLICE</span> caught "+p.target.name+".");p.target=null}}}

function social(dt){eventTimer+=dt;if(eventTimer<3)return;eventTimer=0;const a=pick(citizens.filter(c=>c.alive)),b=pick(citizens.filter(c=>c.alive));if(!a||!b||a===b)return;if(a.object.position.distanceTo(b.object.position)<4.5){if(!a.friends.includes(b.id)){a.friends.push(b.id);b.friends.push(a.id);a.happiness=clamp(a.happiness+2,0,100);b.happiness=clamp(b.happiness+2,0,100);feed("<span class='feed-name'>"+a.name+"</span> met "+b.name+"." )}else if(Math.random()<.3)feed("<span class='feed-name'>GOSSIP</span> "+a.name+" heard something about "+b.name+".")}if(Math.random()<.018){a.criminal=true;feed("<span class='feed-name'>POLICE</span> report filed near "+a.name+".")}}
function economy(dt){economyTimer+=dt;if(economyTimer<5)return;economyTimer=0;citizens.filter(c=>c.alive).forEach(c=>{if(c.activity==="Working")c.money+=Math.random()*45*speedMult;if(Math.random()<.22)c.money-=rand(20,180);c.energy=clamp(c.energy+(c.activity==="Home"?1.2:-.2),0,100);c.happiness=clamp(c.happiness+rand(-.6,.5),0,100)})}

function birth(){const p=pick(citizens.filter(c=>c.alive&&c.partner));if(p){p.children++;feed("<span class='feed-name'>BIRTH</span> A new child joined "+p.name+"'s family.")}}
function death(){const a=citizens.filter(c=>c.alive&&c.age>45);const c=pick(a);if(c&&Math.random()<.32){c.alive=false;c.object.visible=false;feed("<span class='feed-name'>LIFE</span> "+c.name+" died. The city remembers them.")}}
function election(){const a=citizens.filter(c=>c.alive).sort((x,y)=>y.happiness-x.happiness).slice(0,5),w=pick(a);if(w)feed("<span class='feed-name'>ELECTION</span> "+w.name+" became Mayor with "+Math.round(w.happiness)+"% approval.")}
function disaster(){disasterCooldown=5;const t=pick(["BLACKOUT","HEATWAVE","STORM","MARKET CRASH"]);citizens.filter(c=>c.alive).forEach(c=>{c.energy=clamp(c.energy-rand(3,14),0,100);if(t==="MARKET CRASH")c.money*=rand(.84,.96)});feed("<span class='feed-name'>DISASTER</span> "+t+" hit the city.")}
function newDay(){day++;simMinutes=0;citizens.filter(c=>c.alive).forEach(c=>{c.money+=rand(300,1800);c.energy=clamp(c.energy+20,0,100);if(Math.random()<.025){const old=c.job;c.job=pick(jobs);feed("<span class='feed-name'>JOB CHANGE</span> "+c.name+" left "+old+" for "+c.job+".")}if(Math.random()<.05&&c.money>30000)c.money-=rand(3000,12000)});if(day%3===0)birth();if(day%4===0)death();if(day%7===0)election();if(disasterCooldown<=0&&Math.random()<.32)disaster();disasterCooldown--;feed("<span class='feed-name'>CITY</span> Day "+String(day).padStart(2,"0")+" begins.")}

function selectCitizen(c){selected=c;$("#citizenPanel").classList.add("active");$("#citizenName").textContent=c.name;$("#citizenRole").textContent=c.job+" · "+c.personality;$("#citizenAge").textContent=c.age;$("#citizenMoney").textContent=money(c.money);$("#citizenEnergy").textContent=Math.round(c.energy)+"%";$("#citizenFriends").textContent=c.friends.length;$("#citizenPersonality").textContent=c.personality;$("#citizenActivity").textContent=c.alive?c.activity:"Deceased";$("#citizenGoal").textContent=c.goal;$("#citizenExtra").textContent="Health "+Math.round(c.health)+"% · Happiness "+Math.round(c.happiness)+"% · Children "+c.children;citizens.forEach(x=>{if(x.ring)x.ring.visible=x===c});feed("<span class='feed-name'>"+c.name+"</span> is being watched.")}
function closeCitizen(){if(selected?.ring)selected.ring.visible=false;selected=null;follow=null;$("#citizenPanel").classList.remove("active")}
function nextCitizen(){const alive=citizens.filter(c=>c.alive);if(!alive.length)return;nextIndex=(nextIndex+1)%alive.length;const c=alive[nextIndex];selectCitizen(c);follow=c;feed("<span class='feed-name'>NEXT CITIZEN</span> Now following "+c.name+".")}
function hitCitizen(){ray.setFromCamera(pointer,camera);const h=ray.intersectObjects(citizens.filter(c=>c.alive).map(c=>c.object),true);if(!h.length)return null;let o=h[0].object;while(o){if(o.userData&&o.userData.citizen)return o.userData.citizen;o=o.parent}return null}
function updateCamera(dt){if(follow?.alive){const p=follow.object.position.clone(),t=p.clone().add(new THREE.Vector3(0,1.5,0)),o=new THREE.Vector3(0,3.4,7.6).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);camera.position.lerp(t.clone().add(o),1-Math.pow(.001,dt));camera.lookAt(t);return}const d=new THREE.Vector3();if(keys.KeyW)d.z--;if(keys.KeyS)d.z++;if(keys.KeyA)d.x--;if(keys.KeyD)d.x++;if(d.lengthSq()){d.normalize();d.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);observer.addScaledVector(d,(keys.ShiftLeft||keys.ShiftRight?30:15)*dt)}observer.x=clamp(observer.x,-cityRadius,cityRadius);observer.z=clamp(observer.z,-cityRadius,cityRadius);const o=new THREE.Vector3(0,5,10).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);camera.position.lerp(observer.clone().add(o),1-Math.pow(.001,dt));camera.lookAt(observer)}
function updateClock(dt){if(paused)return;simMinutes+=dt*2.7*speedMult;if(simMinutes>=1440)newDay();$("#cityTime").textContent=fmt(simMinutes);$("#day").textContent=String(day).padStart(2,"0")}
function stats(){let w=0,r=0,o=0,m=0,alive=0,wealth=0;citizens.forEach(c=>{if(!c.alive)return;alive++;wealth+=c.money;if(c.activity==="Working")w++;else if(c.activity==="Home")r++;else if(c.activity==="Meeting friends")m++;else o++});$("#population").textContent=alive;$("#workingCount").textContent=w;$("#restingCount").textContent=r;$("#outsideCount").textContent=o;$("#meetingCount").textContent=m;$("#activityCount").textContent=(w+o+m)+" active";$("#economyCount").textContent=money(wealth);$("#crimeCount").textContent=citizens.filter(c=>c.alive&&c.criminal).length}

async function boot(){try{await loadCity();infrastructure();for(let i=0;i<100;i++)makeCitizen(i);makeCars();makePolice();loading.remove();feed("<span class='feed-name'>SYSTEM</span> 100 citizens entered the simulation.");feed("<span class='feed-name'>CITY</span> economy, police, cars and social systems online.")}catch(e){console.error(e);loadingText.textContent="Simulation failed to start."}}
boot();

canvas.addEventListener("pointerdown",e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;const h=hitCitizen();if(h){selectCitizen(h);return}dragging=true;lastPointer={x:e.clientX,y:e.clientY}});
addEventListener("pointerup",()=>dragging=false);addEventListener("pointermove",e=>{if(!dragging||follow)return;yaw-=(e.clientX-lastPointer.x)*.004;lastPointer={x:e.clientX,y:e.clientY}});
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Escape")closeCitizen();if(e.code==="KeyN"&&!e.repeat){e.preventDefault();nextCitizen()}});addEventListener("keyup",e=>keys[e.code]=false);
$("#closeCitizen").onclick=closeCitizen;$("#followBtn").onclick=()=>{if(selected){follow=selected;feed("<span class='feed-name'>CAMERA</span> following "+selected.name+".")}};
$("#pauseBtn").onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?"▶":"Ⅱ"};
document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{speedMult=Number(b.dataset.speed);document.querySelectorAll("[data-speed]").forEach(x=>x.classList.toggle("active",x===b))});

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04)*speedMult;updateClock(dt);if(!paused){citizens.forEach(c=>move(c,dt));updateCars(dt);updatePolice(dt);social(dt);economy(dt)}if(selected&&selected.alive){$("#citizenEnergy").textContent=Math.round(selected.energy)+"%";$("#citizenMoney").textContent=money(selected.money);$("#citizenFriends").textContent=selected.friends.length;$("#citizenActivity").textContent=selected.activity;$("#citizenExtra").textContent="Health "+Math.round(selected.health)+"% · Happiness "+Math.round(selected.happiness)+"% · Children "+selected.children}stats();updateCamera(dt);renderer.render(scene,camera)}
animate();addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
