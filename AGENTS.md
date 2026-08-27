# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Horizontal ScrollView styling rule

Never put `className` (or `style`) directly on a horizontal `ScrollView` — with this project's NativeWind setup it makes descendant text reserve space but paint no glyphs, on both platforms. Put background/border styling on a plain wrapper `View` around the ScrollView; spacing goes in `contentContainerClassName` (that part is safe). See the fixed filter-pill row in `app/(app)/(tabs)/leads.tsx`.
