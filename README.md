# LIFE//100

A 3D autonomous-city simulation built around the supplied apocalyptic city map.

## Simulation
- 100 citizens with names, ages, jobs, personalities, money, energy, health, happiness and goals
- Daily routines: home, commute, work, leisure and social time
- Friendships, gossip, partners and social encounters
- Economy with salaries, spending and city wealth
- Job changes and purchases
- Cars moving through the city
- Police patrols, crime reports and arrests
- Births and deaths
- Weekly simulated elections
- Random disasters: blackout, heatwave, storm and market crash
- Pause plus 1x / 4x / 12x simulation speed
- Click a citizen to inspect them and follow them with the camera
- WASD + Shift camera controls

## Map
The project expects the supplied map at `assets/apocalyptic_city.glb`. If the GLB is unavailable, a local fallback city is generated automatically.

## Run
```bash
python -m http.server 5173
```

Open `http://localhost:5173`.

## Character note
The current build uses a lightweight built-in 3D human crowd so Vercel does not get stuck when external GLB hosts fail or block browser requests. This guarantees that all 100 simulated citizens appear and the simulation starts immediately.
