"use client"

import { useEffect, useMemo } from "react"
import { geoAlbersUsa, geoBounds, geoCentroid, geoPath } from "d3-geo"
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import topology from "us-atlas/states-10m.json"

import { normalizeFips } from "@/lib/states"

const statesTopology = topology as unknown as Topology
const statesGeoJson = feature(
  statesTopology,
  statesTopology.objects.states
) as GeoJSON.FeatureCollection

type USMapProps = {
  selectedStateFips: string | null
}

/**
 * Coordinate space used by <ComposableMap width/height> / ZoomableGroup.
 * CSS can scale the SVG, but zoom math must use this viewBox size.
 */
const MAP_WIDTH = 800
const MAP_HEIGHT = 500
/** d3 default for geoAlbersUsa — same as react-simple-maps when scale is unset. */
const DEFAULT_ALBERS_SCALE = 1070
const FILL_PADDING = 0.88
const MAX_ZOOM = 64

const DEFAULT_CENTER: [number, number] = [-96.6, 38.7]
const DEFAULT_ZOOM = 1

function createBaseProjection() {
  return geoAlbersUsa()
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
    .scale(DEFAULT_ALBERS_SCALE)
}

function getMapView(selectedStateFips: string | null): {
  center: [number, number]
  zoom: number
  bounds?: [[number, number], [number, number]]
  projectedSize?: { dx: number; dy: number }
} {
  if (!selectedStateFips) {
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
  }

  // Bounds/centroid of the FILTERED single-state feature only.
  const stateFeature = statesGeoJson.features.find(
    (geo) => normalizeFips(geo.id as string | number) === selectedStateFips
  )

  if (!stateFeature) {
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
  }

  const bounds = geoBounds(stateFeature) as [[number, number], [number, number]]
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const geoMid: [number, number] = [
    (minLon + maxLon) / 2,
    (minLat + maxLat) / 2,
  ]
  const centroid = geoCentroid(stateFeature) as [number, number]

  // Projected pixel bounds → zoom that fills the map panel for small and large states.
  const projection = createBaseProjection()
  const path = geoPath(projection)
  const [[x0, y0], [x1, y1]] = path.bounds(stateFeature)
  const dx = Math.max(x1 - x0, 1)
  const dy = Math.max(y1 - y0, 1)
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(1, Math.min(MAP_WIDTH / dx, MAP_HEIGHT / dy) * FILL_PADDING)
  )

  // geoMid can fail to project (e.g. Alaska); centroid is reliable with Albers USA insets.
  const center: [number, number] =
    projection(centroid) != null
      ? centroid
      : projection(geoMid) != null
        ? geoMid
        : centroid

  return { center, zoom, bounds, projectedSize: { dx, dy } }
}

export function USMap({ selectedStateFips }: USMapProps) {
  const view = useMemo(
    () => getMapView(selectedStateFips),
    [selectedStateFips]
  )

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    console.log("[us-map] view", {
      selectedStateFips,
      center: view.center,
      zoom: view.zoom,
      geoBounds: view.bounds ?? null,
      projectedSize: view.projectedSize ?? null,
      mapSize: { width: MAP_WIDTH, height: MAP_HEIGHT },
    })
  }, [selectedStateFips, view])

  const isFiltered = selectedStateFips !== null

  return (
    <ComposableMap
      projection="geoAlbersUsa"
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      className="h-full w-full"
      style={{ width: "100%", height: "100%" }}
    >
        <ZoomableGroup
          center={view.center}
          zoom={view.zoom}
          minZoom={1}
          maxZoom={MAX_ZOOM}
          filterZoomEvent={() => false}
          className="rsm-zoomable-group"
        >
        <Geographies geography={statesGeoJson}>
          {({ geographies }) =>
            geographies
              .filter(
                (geo) =>
                  !isFiltered ||
                  normalizeFips(geo.id as string | number) === selectedStateFips
              )
              .map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isFiltered ? "var(--primary)" : "var(--card)"}
                  stroke={isFiltered ? "var(--accent)" : "var(--border)"}
                  strokeWidth={isFiltered ? 1.15 : 0.7}
                  vectorEffect="non-scaling-stroke"
                  style={{ outline: "none" }}
                  tabIndex={-1}
                />
              ))
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  )
}
