import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Typography } from '../ui/Typography';
import { Empty } from './primitives';
import { captureLocationLine, isUsableFix } from '../../lib/captureLocation';
import { fitToPoints, project, tileUrl, tilesFor, toWorld, TILE_SIZE } from '../../lib/mapTiles';

/**
 * Where the leads on this dashboard were captured - PENDING.md 43.
 *
 * WHAT THIS MAP IS FOR, decided 2026-09-15: seeing captures across events and
 * cities. It is deliberately not a per-event map - at one trade show every lead
 * is captured in the same hall, so a single event is one cloud of dots on your
 * own stall and answers nothing. Across a season of shows, and across the field
 * visits between them, it answers where the pipeline actually comes from.
 *
 * WHY IT IS DRAWN BY HAND. The phone gets a native map for nothing; the web
 * dashboard cannot use that library at all, and the usual web substitute bills
 * per map load. So the tiles are positioned directly - see lib/mapTiles.ts. No
 * package, no key, no bill.
 *
 * WHAT IT SHOWS is whatever rows the viewer is allowed to see, which for an
 * admin is the organisation and for a rep is their own captures. That is RLS
 * doing its job rather than a limitation, but it does mean the count under the
 * map is "leads you can see", never "leads there are".
 */

/** Height of the map itself. The panel grows past it for the place list. */
const MAP_HEIGHT = 300;

/**
 * How close two captures have to be to count as the same place.
 *
 * Three decimals is about 110 metres, which is roughly one exhibition hall and
 * comfortably inside the accuracy the captures are taken at. Anything tighter
 * scatters one stall across a dozen dots as the fix drifts through the day.
 */
const PLACE_PRECISION = 3;

/** Only the fields this component needs, so it is not tied to the lead shape. */
export type MappableLead = {
  id: string;
  name: string;
  captureLatitude?: number;
  captureLongitude?: number;
  captureAddress?: string;
};

type Place = {
  key: string;
  latitude: number;
  longitude: number;
  label: string;
  leads: MappableLead[];
};

function groupIntoPlaces(leads: MappableLead[]): Place[] {
  const byKey = new Map<string, Place>();

  for (const lead of leads) {
    if (!isUsableFix(lead.captureLatitude, lead.captureLongitude)) continue;
    const latitude = lead.captureLatitude as number;
    const longitude = lead.captureLongitude as number;
    const key = `${latitude.toFixed(PLACE_PRECISION)},${longitude.toFixed(PLACE_PRECISION)}`;

    const existing = byKey.get(key);
    if (existing) {
      existing.leads.push(lead);
      // The first lead at a place may be the one whose geocode failed, so a
      // later address is allowed to name the dot the earlier one left unnamed.
      if (!existing.label && lead.captureAddress?.trim()) existing.label = lead.captureAddress.trim();
      continue;
    }

    byKey.set(key, {
      key,
      latitude,
      longitude,
      label: captureLocationLine(lead) ?? '',
      leads: [lead],
    });
  }

  return [...byKey.values()].sort((a, b) => b.leads.length - a.leads.length);
}

export function CaptureMap({
  leads,
  total,
  onOpenLead,
}: {
  /** Every lead in view, located or not. Filtering happens here. */
  leads: MappableLead[];
  /** How many leads were considered, so the header can be honest about coverage. */
  total: number;
  onOpenLead: (leadId: string) => void;
}) {
  /**
   * The panel is fluid, the projection is not - it needs a pixel width to
   * choose a zoom. Measured rather than assumed, and held in state, which is
   * free here: this is a dashboard panel with no text inputs in it.
   */
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  const places = useMemo(() => groupIntoPlaces(leads), [leads]);

  const view = useMemo(() => {
    if (!width || places.length === 0) return null;
    return fitToPoints(
      places.map((p) => toWorld(p.latitude, p.longitude)),
      { width, height: MAP_HEIGHT }
    );
  }, [places, width]);

  const located = places.reduce((n, p) => n + p.leads.length, 0);

  return (
    <View className="px-6 py-6">
      <View className="flex-row items-center justify-between gap-3">
        <Typography className="text-[16.5px] font-bold text-navy tracking-tight shrink-0">
          Where leads were captured
        </Typography>
        {located ? (
          <Typography className="text-[12px] text-slate font-medium">
            {located} of {total} have a location
          </Typography>
        ) : null}
      </View>

      <View className="mt-4 rounded-lg overflow-hidden bg-section border border-hairline" onLayout={onLayout}>
        {places.length === 0 ? (
          <Empty
            title="No lead has a location yet"
            body="Locations are recorded on the phone at the moment a card is captured, so leads captured before this was switched on do not have one."
          />
        ) : (
          <View style={{ height: MAP_HEIGHT }}>
            {/*
              The tiles live in their own layer with pointer events off, so a
              256px picture can never swallow the click on a 24px dot sitting
              over it. `Image` has no pointerEvents prop of its own - only
              `View` does - which is the whole reason for the wrapper.
            */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {view
                ? tilesFor(view).map((tile) => (
                    <Image
                      key={`${tile.z}/${tile.x}/${tile.y}`}
                      source={{ uri: tileUrl(tile) }}
                      style={{
                        position: 'absolute',
                        left: tile.left,
                        top: tile.top,
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                      }}
                    />
                  ))
                : null}
            </View>

            {view
              ? places.map((place) => {
                  const { left, top } = project(toWorld(place.latitude, place.longitude), view);
                  const count = place.leads.length;
                  // Grows with the count but stops growing, so one busy show
                  // does not become a disc that hides three cities behind it.
                  const size = Math.min(44, 24 + Math.log2(count) * 6);
                  const single = count === 1 ? place.leads[0] : undefined;
                  return (
                    <Pressable
                      key={place.key}
                      // A dot holding one lead opens it. A dot holding forty has
                      // nothing honest to open, so it stays a dot - there is no
                      // "leads captured near here" list for it to lead to.
                      onPress={single ? () => onOpenLead(single.id) : undefined}
                      style={{
                        position: 'absolute',
                        left: left - size / 2,
                        top: top - size / 2,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                      }}
                      className="bg-gold border-2 border-white items-center justify-center"
                    >
                      <Typography className="text-[11px] font-bold text-navy">{count}</Typography>
                    </Pressable>
                  );
                })
              : null}
          </View>
        )}
      </View>

      {places.length ? (
        <>
          <View className="mt-4">
            {places.slice(0, 5).map((place) => (
              <View key={place.key} className="flex-row items-baseline justify-between gap-4 py-[6px]">
                <Typography className="text-[13px] text-navy flex-1 min-w-0" numberOfLines={1}>
                  {place.label || 'Address not resolved'}
                </Typography>
                <Typography className="text-[13px] font-bold text-navy">
                  {place.leads.length}
                </Typography>
              </View>
            ))}
          </View>
          {/*
            Required by the tile licence, not decoration. See lib/mapTiles.ts.
          */}
          <Typography className="text-[10.5px] text-label mt-2">
            Map data from OpenStreetMap contributors
          </Typography>
        </>
      ) : null}
    </View>
  );
}
