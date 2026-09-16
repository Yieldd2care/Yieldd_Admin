# Web dashboard home - redesign preview

Mockups only. Nothing here is wired into the app; `app/(dash)/index.tsx` is untouched.

| File | What it is |
|---|---|
| `DashHomeLight.jpg` | Preview A, light canvas (1512x1200 at 2x) |
| `DashHomeNavy.jpg` | Preview B, navy canvas |
| `dash-home.css` | Shared stylesheet. Geometry is identical in both themes; only `:root` and `[data-theme="navy"]` differ |
| `_body.html` | Shared markup fragment |
| `DashHome*.html` | Standalone generated pages - open either in a browser |
| `build.mjs` | Rebuilds the HTML, measures the DOM, renders and converts to JPG |

Rebuild with `node build.mjs` (needs Chrome; uses `jimp-compact` from `node_modules`).
Inter is embedded from `@expo-google-fonts/inter`, so the render needs no network.

Data on the mockups is illustrative, not live.
