"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface PlaceFeature {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry | null;
  properties: {
    name: string;
    kind: string;
    uncertainty: string;
    uncertainty_note: string | null;
    sensitive: boolean;
    external_ids?: Record<string, unknown>;
  };
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: PlaceFeature[];
  attribution: string[];
}

export function projectMapPoint(coordinates: [number, number]) {
  const [longitude, latitude] = coordinates;
  return { left: `${((longitude + 180) / 360) * 100}%`, top: `${((90 - latitude) / 180) * 100}%` };
}

function MapFallback({ features, onSelect }: { features: PlaceFeature[]; onSelect: (feature: PlaceFeature) => void }) {
  const points = features.filter((feature): feature is PlaceFeature & { geometry: GeoJSON.Point } => feature.geometry?.type === "Point");
  return (
    <div className="map-fallback" role="img" aria-label="Schematic world map showing reviewed place coordinates">
      <div className="map-fallback-grid" aria-hidden="true" />
      <span className="map-fallback-label map-fallback-west">180°W</span>
      <span className="map-fallback-label map-fallback-equator">Equator</span>
      <span className="map-fallback-label map-fallback-east">180°E</span>
      {points.map((feature) => (
        <button
          key={feature.id}
          className="map-fallback-point"
          style={projectMapPoint(feature.geometry.coordinates as [number, number])}
          onClick={() => onSelect(feature)}
          title={feature.properties.name}
        >
          <i />
          <span>{feature.properties.name}</span>
        </button>
      ))}
      <p><strong>Accessible coordinate view</strong><span>The interactive WebGL basemap is unavailable in this browser. Reviewed coordinates remain selectable here.</span></p>
    </div>
  );
}

export function ResearchMap() {
  const container = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [selected, setSelected] = useState<PlaceFeature | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => { fetch("/api/map/features").then((response) => response.json()).then(setData); }, []);
  const visible = useMemo(() => data?.features.filter((feature) => {
    const matchesQuery = feature.properties.name.toLowerCase().includes(query.toLowerCase());
    const matchesMode = mode === "all" || (mode === "mapped" && feature.geometry) || (mode === "literary" && !feature.geometry) || (mode === "sensitive" && feature.properties.sensitive);
    return matchesQuery && matchesMode;
  }) ?? [], [data, query, mode]);

  useEffect(() => {
    if (!container.current || !data) return;
    let map: any;
    let cancelled = false;
    setMapError(false);
    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !container.current) return;
      try {
        map = new maplibregl.Map({
          container: container.current,
          style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron",
          center: [20, 25], zoom: 1.25, attributionControl: false, cooperativeGestures: true
        });
      } catch {
        setMapError(true);
        return;
      }
      map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Origin Graph · reviewed geometry only" }), "bottom-right");
      map.on("load", () => {
        map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: visible } as any });
        map.addLayer({ id: "place-regions", type: "fill", source: "places", filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false], paint: { "fill-color": ["case", ["==", ["get", "sensitive"], true], "#b48732", "#3e6b52"], "fill-opacity": .2, "fill-outline-color": "#3e6b52" } });
        map.addLayer({ id: "place-points-halo", type: "circle", source: "places", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["case", ["==", ["get", "uncertainty"], "exact"], 12, 16], "circle-color": "#f5f2ea", "circle-opacity": .8 } });
        map.addLayer({ id: "place-points", type: "circle", source: "places", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["case", ["==", ["get", "uncertainty"], "exact"], 6, 9], "circle-color": ["case", ["==", ["get", "sensitive"], true], "#b48732", "#ad4f31"], "circle-stroke-color": "#12201c", "circle-stroke-width": 1, "circle-opacity": ["case", ["==", ["get", "uncertainty"], "exact"], .95, .65] } });
        map.on("mouseenter", "place-points", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "place-points", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", "place-points", (event: any) => {
          const raw = event.features?.[0];
          if (!raw) return;
          const feature = visible.find((item) => item.id === String(raw.id));
          if (feature) setSelected(feature);
          const wrapper = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = String(raw.properties?.name ?? "Place");
          const detail = document.createElement("small");
          detail.textContent = String(raw.properties?.uncertainty ?? "unknown");
          wrapper.append(title, document.createElement("br"), detail);
          new maplibregl.Popup({ closeButton: false, offset: 12 }).setLngLat(event.lngLat).setDOMContent(wrapper).addTo(map);
        });
        if (visible.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          for (const feature of visible) if (feature.geometry?.type === "Point") bounds.extend(feature.geometry.coordinates as [number, number]);
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 90, maxZoom: 5, duration: 0 });
        }
      });
      map.on("error", (event: any) => { if (!map?.isStyleLoaded() && event?.error) setMapError(true); });
    }).catch(() => setMapError(true));
    return () => { cancelled = true; map?.remove(); };
  }, [data, visible]);

  return <div className="map-workspace"><div className="map-toolbar"><label>Find a reviewed place<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search place or region" /></label><div className="segmented-control">{[["all", "All"], ["mapped", "Mapped"], ["literary", "Literary / mythical"], ["sensitive", "Protected"]].map(([value, label]) => <button aria-selected={mode === value} onClick={() => setMode(value)} key={value}>{label}</button>)}</div><span>{visible.length} visible</span></div><div className="map-layout"><div ref={container} className="map-canvas" aria-label="Reviewed place map">{mapError && <MapFallback features={visible} onSelect={setSelected} />}</div><aside><header><p className="eyebrow">Geographic evidence</p><h2>Places & uncertainty</h2></header><p>Approximate regions are not factual pins. Protected sites use generalized public geometry.</p><ul>{visible.map((feature) => <li className={selected?.id === feature.id ? "selected" : ""} key={feature.id}><button onClick={() => setSelected(feature)}><strong>{feature.properties.name}</strong><span>{feature.geometry ? "Mapped" : "No factual coordinate"} · {feature.properties.uncertainty}</span></button></li>)}</ul><footer>Base map © OpenStreetMap contributors via OpenFreeMap. {data?.attribution.join(" ")}</footer></aside></div>{selected && <section className="map-inspector"><button onClick={() => setSelected(null)}>Close</button><span className="kicker">{selected.properties.kind.replaceAll("_", " ")}</span><h2>{selected.properties.name}</h2><p>{selected.properties.uncertainty_note ?? "No uncertainty note has been reviewed."}</p><dl><div><dt>Geometry</dt><dd>{selected.geometry ? selected.geometry.type : "Suppressed"}</dd></div><div><dt>Uncertainty</dt><dd>{selected.properties.uncertainty.replaceAll("_", " ")}</dd></div><div><dt>Protection</dt><dd>{selected.properties.sensitive ? "Generalized public location" : "Standard reviewed display"}</dd></div></dl></section>}</div>;
}
