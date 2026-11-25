# LIFE//100 map asset

The app expects the supplied city map at `assets/apocalyptic_city.glb`.

Source model: Apocalyptic City by ruslans3d on Sketchfab.
https://sketchfab.com/3d-models/apocalyptic-city-a0c8f318ed6f4075a97c2e55b1272495

The supplied binary is kept in the project bundle used for local development. The GitHub connector used for this repo can write UTF-8 files but cannot directly attach the 33 MB GLB binary, so the app includes a procedural fallback if the map asset is absent.
