"use client";

import { memo, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  Line,
} from "react-simple-maps";
import { getCountryCoordinates } from "@/lib/country-coordinates";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface GeoType {
  rsmKey: string;
  properties: Record<string, unknown>;
  geometry: object;
}

interface CountryData {
  country_name: string;
  count: string | number;
}

interface CountryConnection {
  country1: string;
  country2: string;
  count: string | number;
}

interface WorldMapHeatmapProps {
  data: CountryData[];
  connections?: CountryConnection[];
  className?: string;
}

interface HeatmapPoint {
  coordinates: [number, number];
  intensity: number;
  count: number;
  name: string;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  name: string;
  count: number;
}

/**
 * World map with heatmap overlay showing country entry distribution
 */
function WorldMapHeatmapComponent({ data, connections = [], className = "" }: WorldMapHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    name: "",
    count: 0,
  });
  // Transform data to heatmap points
  const heatmapPoints = useMemo((): HeatmapPoint[] => {
    if (!data || data.length === 0) return [];

    const points: HeatmapPoint[] = [];
    let maxCount = 0;

    // Find max count for normalization
    for (const item of data) {
      const count = typeof item.count === "string" ? parseInt(item.count) : item.count;
      if (count > maxCount) maxCount = count;
    }

    // Create points with coordinates
    for (const item of data) {
      const coords = getCountryCoordinates(item.country_name);
      if (coords) {
        const count = typeof item.count === "string" ? parseInt(item.count) : item.count;
        points.push({
          coordinates: coords,
          intensity: maxCount > 0 ? count / maxCount : 0,
          count,
          name: item.country_name,
        });
      }
    }

    // Sort by intensity so smaller points render on top
    return points.sort((a, b) => b.intensity - a.intensity);
  }, [data]);

  // Process connections
  const connectionLines = useMemo(() => {
    if (!connections || connections.length === 0) return [];

    const lines = [];
    let maxConnectionCount = 0;

    // Find max connection count for normalization
    for (const conn of connections) {
      const count = typeof conn.count === "string" ? parseInt(conn.count) : conn.count;
      if (count > maxConnectionCount) maxConnectionCount = count;
    }

    // Create lines between countries
    for (const conn of connections) {
      const coords1 = getCountryCoordinates(conn.country1);
      const coords2 = getCountryCoordinates(conn.country2);
      
      if (coords1 && coords2) {
        const count = typeof conn.count === "string" ? parseInt(conn.count) : conn.count;
        const intensity = maxConnectionCount > 0 ? count / maxConnectionCount : 0;
        
        lines.push({
          start: coords1,
          end: coords2,
          intensity,
          count,
        });
      }
    }

    return lines;
  }, [connections]);

  // Get color for connection lines based on intensity
  const getConnectionColor = (intensity: number): string => {
    // Purple to bright cyan gradient
    if (intensity < 0.33) {
      const t = intensity / 0.33;
      const r = Math.round(147 - t * 50);
      const g = Math.round(51 + t * 150);
      const b = Math.round(234);
      return `rgba(${r}, ${g}, ${b}, 0.6)`;
    } else if (intensity < 0.66) {
      const t = (intensity - 0.33) / 0.33;
      const r = Math.round(97 - t * 50);
      const g = Math.round(201 + t * 54);
      const b = Math.round(234 - t * 94);
      return `rgba(${r}, ${g}, ${b}, 0.7)`;
    } else {
      const t = (intensity - 0.66) / 0.34;
      const r = Math.round(47 + t * 208);
      const g = Math.round(255);
      const b = Math.round(140 - t * 40);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    }
  };

  // Get color based on intensity (blue to red gradient like the reference image)
  const getHeatColor = (intensity: number): string => {
    // Create a blue -> cyan -> yellow -> orange -> red gradient
    if (intensity < 0.2) {
      // Blue to cyan
      const t = intensity / 0.2;
      const r = Math.round(0 + t * 0);
      const g = Math.round(100 + t * 155);
      const b = Math.round(200 - t * 55);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.4) {
      // Cyan to yellow
      const t = (intensity - 0.2) / 0.2;
      const r = Math.round(0 + t * 255);
      const g = Math.round(255);
      const b = Math.round(145 - t * 145);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.6) {
      // Yellow to orange
      const t = (intensity - 0.4) / 0.2;
      const r = Math.round(255);
      const g = Math.round(255 - t * 100);
      const b = Math.round(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.8) {
      // Orange to red-orange
      const t = (intensity - 0.6) / 0.2;
      const r = Math.round(255);
      const g = Math.round(155 - t * 80);
      const b = Math.round(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Red-orange to red
      const t = (intensity - 0.8) / 0.2;
      const r = Math.round(255);
      const g = Math.round(75 - t * 75);
      const b = Math.round(0);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Calculate marker size based on intensity
  const getMarkerSize = (intensity: number): number => {
    // Base size + scaled size (min 8, max 40)
    return 8 + intensity * 32;
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 rounded-lg h-[400px] ${className}`}>
        <p className="text-slate-400">No country data available</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1a2744] ${className}`}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 130,
          center: [0, 30],
        }}
        style={{
          width: "100%",
          height: "auto",
        }}
      >
        <ZoomableGroup>
          {/* Base map geography */}
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoType[] }) =>
              geographies.map((geo: GeoType) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#2d3f5f"
                  stroke="#1a2744"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#3d5070" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Connection lines */}
          {connectionLines.map((line, index) => {
            const strokeWidth = 0.5 + line.intensity * 2.5;
            const color = getConnectionColor(line.intensity);
            
            return (
              <g key={`connection-${index}`}>
                <line
                  x1={line.start[0]}
                  y1={line.start[1]}
                  x2={line.end[0]}
                  y2={line.end[1]}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  style={{
                    filter: "blur(1px)",
                    opacity: 0.4,
                  }}
                />
                <line
                  x1={line.start[0]}
                  y1={line.start[1]}
                  x2={line.end[0]}
                  y2={line.end[1]}
                  stroke={color}
                  strokeWidth={strokeWidth * 0.5}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Heatmap markers */}
          {heatmapPoints.map((point, index) => {
            const size = getMarkerSize(point.intensity);
            const color = getHeatColor(point.intensity);

            return (
              <Marker key={`${point.name}-${index}`} coordinates={point.coordinates}>
                <g
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        show: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        name: point.name,
                        count: point.count,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltip((prev) => ({ ...prev, show: false }));
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={Math.log2(size) * 3}
                    fill={color}
                    fillOpacity={0.15}
                    style={{ filter: "blur(15px)" }}
                  />
                  {/* Middle glow */}
                  <circle
                    r={Math.log2(size) * 3}
                    fill={color}
                    fillOpacity={0.3}
                    style={{ filter: "blur(8px)" }}
                  />
                  {/* Center bright spot */}
                  <circle
                    r={Math.log2(size * size / 10)}
                    fill={color}
                    fillOpacity={0.7}
                  />
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-900/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-700"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="text-sm font-medium text-white">{tooltip.name}</div>
          <div className="text-xs text-slate-300">{tooltip.count} {tooltip.count === 1 ? "entry" : "entries"}</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="text-xs text-slate-300 mb-2">Entry Density</div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getHeatColor(0.1) }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getHeatColor(0.3) }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getHeatColor(0.5) }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getHeatColor(0.7) }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getHeatColor(0.9) }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Tooltip will be handled by the parent */}
    </div>
  );
}

export const WorldMapHeatmap = memo(WorldMapHeatmapComponent);
