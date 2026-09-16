/**
 * Enough Web Mercator to draw a map out of square pictures.
 *
 * WHY THERE IS NO MAP LIBRARY HERE. The phone could have a native map for
 * nothing - Apple Maps on iOS, the Google Maps SDK on Android - but the web
 * dashboard cannot use that library at all, and the obvious web replacement is
 * the Google Maps JavaScript API, which bills per map load. This file is the
 * third option: the same raster tiles every web map is made of, positioned by
 * hand. No package, no API key, no account, no per-load charge.
 *
 * Pure, so `npm run verify:capture-location` can check the projection against
 * known coordinates without a browser. The component that renders it is
 * components/dash/CaptureMap.tsx.
 */

/** Every raster tile scheme in common use serves 256px squares. */
export const TILE_SIZE = 256;

/**
 * Web Mercator stops here.
 *
 * The projection stretches towards the poles and diverges at 90 degrees, so
 * every slippy map in the world truncates at this latitude - it is what makes
 * the world a square. A fix further north than this is northern Greenland and
 * gets clamped rather than sent to infinity.
 */
export const MAX_LATITUDE = 85.05112878;

export type WorldPoint = {
  /** 0 at the antimeridian going east, 1 back at it. */
  x: number;
  /** 0 at the top of the map, 1 at the bottom. */
  y: number;
};

/**
 * Longitude and latitude to a point on the unit square.
 *
 * Kept zoom-free on purpose: a bounding box and a centre are the same points
 * whatever zoom they are eventually drawn at, so the zoom is chosen afterwards
 * rather than threaded through every calculation.
 */
export function toWorld(latitude: number, longitude: number): WorldPoint {
  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const rad = (lat * Math.PI) / 180;
  return {
    x: (longitude + 180) / 360,
    /*
     * Clamped, not merely computed.
     *
     * MAX_LATITUDE is the value at which this expression is defined to be 0,
     * and in doubles it comes out at -6e-12 instead - dust, except that a
     * marker at -6e-12 floors to row -1 rather than row 0. The unit square IS
     * the range of this projection, so saying so here is the definition rather
     * than a fudge.
     */
    y: Math.max(0, Math.min(1, (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2)),
  };
}

export type MapView = {
  zoom: number;
  /** World pixel of the viewport's top-left corner, at `zoom`. */
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type FitOptions = {
  width: number;
  height: number;
  /** Pixels kept clear at every edge so a dot on the boundary is not cut in half. */
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Used when every point is in the same spot and there is no span to fit. */
  singlePointZoom?: number;
};

/**
 * The zoom and origin that put every point on screen at once.
 *
 * A single point - one trade show, one stall, which is the ordinary case for a
 * new account - has no span to fit, so it takes `singlePointZoom` instead of
 * the infinity the arithmetic would otherwise produce.
 */
export function fitToPoints(points: WorldPoint[], opts: FitOptions): MapView {
  const {
    width,
    height,
    padding = 28,
    minZoom = 1,
    maxZoom = 16,
    singlePointZoom = 14,
  } = opts;

  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  let zoom: number;
  if (spanX <= 0 && spanY <= 0) {
    zoom = singlePointZoom;
  } else {
    // How many times the world must double before the span fills the viewport.
    const fitX = spanX > 0 ? Math.log2(usableWidth / (TILE_SIZE * spanX)) : Infinity;
    const fitY = spanY > 0 ? Math.log2(usableHeight / (TILE_SIZE * spanY)) : Infinity;
    zoom = Math.floor(Math.min(fitX, fitY));
  }
  zoom = Math.max(minZoom, Math.min(maxZoom, zoom));

  const scale = TILE_SIZE * 2 ** zoom;
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  return {
    zoom,
    originX: centreX * scale - width / 2,
    originY: centreY * scale - height / 2,
    width,
    height,
  };
}

/** Where a point lands inside the viewport, in CSS pixels from its top-left. */
export function project(point: WorldPoint, view: MapView): { left: number; top: number } {
  const scale = TILE_SIZE * 2 ** view.zoom;
  return {
    left: point.x * scale - view.originX,
    top: point.y * scale - view.originY,
  };
}

export type Tile = { x: number; y: number; z: number; left: number; top: number };

/**
 * Every tile the viewport touches, already positioned.
 *
 * `x` wraps rather than clamps, because the map does: at low zoom a viewport
 * wider than the world asks for tile -1, and the tile it wants is the last one.
 * `y` does not wrap - there is nothing above the north pole - so rows outside
 * the world are dropped and the map simply ends, which is what every slippy map
 * does at the top of the screen.
 */
export function tilesFor(view: MapView): Tile[] {
  const count = 2 ** view.zoom;
  const firstCol = Math.floor(view.originX / TILE_SIZE);
  const lastCol = Math.floor((view.originX + view.width) / TILE_SIZE);
  const firstRow = Math.floor(view.originY / TILE_SIZE);
  const lastRow = Math.floor((view.originY + view.height) / TILE_SIZE);

  const tiles: Tile[] = [];
  for (let col = firstCol; col <= lastCol; col++) {
    for (let row = firstRow; row <= lastRow; row++) {
      if (row < 0 || row >= count) continue;
      tiles.push({
        x: ((col % count) + count) % count,
        y: row,
        z: view.zoom,
        left: col * TILE_SIZE - view.originX,
        top: row * TILE_SIZE - view.originY,
      });
    }
  }
  return tiles;
}

/**
 * Where the pictures come from.
 *
 * OpenStreetMap's own tiles: free, no key, no account, no per-load charge, and
 * the attribution the licence asks for is rendered under the map by
 * CaptureMap.tsx. Their usage policy asks that this stay light use, which a
 * dashboard panel drawing about a dozen tiles when somebody opens it is.
 *
 * If that ever needs to change - heavier traffic, or a preference for not
 * depending on a volunteer-run service - it is this one function. Any
 * {z}/{x}/{y} raster provider drops straight in, Google's included, and nothing
 * else in this feature moves.
 */
export function tileUrl(tile: Tile): string {
  return `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
}
