# PlayCity

3D digital town prototype built with Three.js.

## Current build
- 3D explorable city
- Third-person character controller
- WASD movement, Shift sprint, Space jump
- Interactive districts: Game Zone, Art District, Sports Park, Tech Lab, Library and Food Street
- Activity join + coins
- GLB character loader
- Built-in 3D fallback character
- Local `.glb` / `.gltf` character upload

## Character asset
The app automatically tries to load `kids_avatars.glb` from the site root. If that asset is not present in the deployment, use the **Character** button to load the supplied GLB locally; the file stays in the browser.

## Run
Serve the repository as a static site. Three.js is loaded from an ESM CDN, so no build step is required.