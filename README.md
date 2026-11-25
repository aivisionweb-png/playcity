# LIFE//100

A browser-based 3D population simulation: 100 human citizens living in one city.

## Included
- `assets/apocalyptic_city.glb` — supplied city map
- 100 simulated citizens
- Real rigged human GLB models with Idle / Walk / Run clips
- Daily schedules: home, commute, work, outside, meetings
- Citizen profiles: age, job, money, energy, personality, goals, friends
- Live city statistics and event feed
- Click a human to inspect them
- Follow a human with the camera
- WASD + Shift free camera
- Pause/resume simulation
- Three.js, no build step

## Run locally
Serve this folder over HTTP, for example:
```bash
python -m http.server 5173
```
Then open `http://localhost:5173`.

## Human model credits
The 8 human models are from vinish.dev and are released under CC BY 4.0. Keep this credit:
> "Human character models by vinish.dev (https://vinish.dev/free-3d-models/people/), CC BY 4.0"

## Map
The city map is the GLB supplied for this project. Keep it at:
`assets/apocalyptic_city.glb`
