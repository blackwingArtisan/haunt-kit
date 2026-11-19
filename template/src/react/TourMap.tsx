import { useId, useMemo, type MouseEvent, type ReactNode } from 'react';
import type { LatLng } from '../core/geo';
import { fitProjection, pathData, type Projection } from '../core/projection';
import type { SessionState } from '../core/session';
import { tourRoute, type Stop, type Tour } from '../core/tour';
import { stopStatus, type StopStatus } from './status';

export interface TourMapProps {
  tour: Tour;
  state: SessionState;
  /** Accessible summary of the map, read by screen readers instead of the drawing. */
  label: string;
  width?: number;
  height?: number;
  position?: (LatLng & { accuracy?: number }) | null;
  /** Fog of war over ground the walker has not explored. */
  fog?: boolean;
  /** How far around the walker's trail the fog lifts, in meters. Default 150. */
  revealMeters?: number;
  /**
   * How the drifting fog is drawn. "mist" is soft, "paper" cuts it into
   * hard-edged layers like cut paper. Colors come from --hk-fog, --hk-fog-tint,
   * --hk-fog-opacity and --hk-fog-grid. Default "mist".
   */
  fogStyle?: 'mist' | 'paper';
  selectedId?: string;
  /** Extra points to keep in view (for example a host's current position). */
  extraPoints?: LatLng[];
  /** Fix the view instead of fitting the tour. */
  projection?: Projection;
  /** Map clicks in ground coordinates, for editors that drop pins. */
  onMapClick?: (point: LatLng) => void;
  /** Hides names of stops that are not unlocked yet. */
  hideLockedNames?: boolean;
  /** Draws the trigger radius around each stop. Default true. */
  showRadius?: boolean;
  /** Draws the tour route. Default true. */
  showRoute?: boolean;
  /** Only draws stops that are unlocked, so a hunt map does not give hiding spots away. */
  revealOnlyUnlocked?: boolean;
  /** Extra SVG drawn above the map features and below the markers. */
  children?: (proj: Projection) => ReactNode;
}

/**
 * A stylized SVG map drawn only from the tour's own coordinates: no tiles, no
 * keys, works offline. All colors come from --hk-* CSS custom properties so
 * each app can theme it.
 */
export function TourMap({
  tour,
  state,
  label,
  width = 1000,
  height = 700,
  position,
  fog = false,
  revealMeters = 150,
  fogStyle = 'mist',
  selectedId,
  extraPoints = [],
  projection,
  onMapClick,
  hideLockedNames = false,
  showRadius = true,
  showRoute = true,
  revealOnlyUnlocked = false,
  children,
}: TourMapProps) {
  const uid = useId().replace(/:/g, '');
  const route = tourRoute(tour);
  // Fit to every stop even when markers are hidden: the view gives away the play area, not the spots.
  const fitPoints = [...tour.stops.map((s) => s.position), ...route];
  const extraKey = extraPoints.map((p) => `${p.lat},${p.lng}`).join('|');
  const proj = useMemo(
    () => projection ?? fitProjection([...fitPoints, ...extraPoints], width, height, 70, 160),
    // extraKey stands in for extraPoints so a new array with the same points does not refit the map.
    [projection, tour, width, height, extraKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const m = (meters: number) => meters / proj.metersPerUnit;

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    onMapClick(proj.unproject({ x: local.x, y: local.y }));
  };

  const me = position ? proj.project(position) : null;
  const unlockedStops = tour.stops.filter((s) => state.stops[s.id]?.unlockedAt !== undefined);

  return (
    <svg
      className={`hk-map${onMapClick ? ' hk-map--editable' : ''}${state.completedAt !== undefined ? ' hk-map--complete' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      onClick={handleClick}
      data-testid="tour-map"
    >
      <defs>
        <pattern id={`${uid}-grid`} width={m(100)} height={m(100)} patternUnits="userSpaceOnUse">
          <path d={`M ${m(100)} 0 L 0 0 0 ${m(100)}`} className="hk-map__grid" />
        </pattern>
        <pattern id={`${uid}-fog-grid`} width={m(250)} height={m(250)} patternUnits="userSpaceOnUse">
          <path d={`M ${m(250)} 0 L 0 0 0 ${m(250)}`} className="hk-map__fog-grid" />
        </pattern>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" className="hk-map__glow-core" />
          <stop offset="100%" className="hk-map__glow-edge" />
        </radialGradient>
        <radialGradient id={`${uid}-hole`}>
          <stop offset="55%" stopColor="black" stopOpacity="1" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        {/* Turbulence becomes the clouds' shape (alpha only); the color is a themed flood. */}
        <filter id={`${uid}-noise`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={fogStyle === 'paper' ? 0.006 : 0.008} numOctaves="3" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.35" />
          {fogStyle === 'paper' && (
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0.35 0.6 0.85" />
            </feComponentTransfer>
          )}
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
        {fog && (
          <mask id={`${uid}-fog`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <rect width={width} height={height} fill="white" />
            {state.trail.map((p, i) => {
              const c = proj.project(p);
              return <circle key={i} cx={c.x} cy={c.y} r={m(revealMeters)} fill={`url(#${uid}-hole)`} />;
            })}
            {unlockedStops.map((s) => {
              const c = proj.project(s.position);
              return <circle key={s.id} cx={c.x} cy={c.y} r={m(revealMeters * 2)} fill={`url(#${uid}-hole)`} />;
            })}
            {me && <circle cx={me.x} cy={me.y} r={m(revealMeters)} fill={`url(#${uid}-hole)`} />}
          </mask>
        )}
      </defs>

      <rect width={width} height={height} className="hk-map__ground" />
      <rect width={width} height={height} fill={`url(#${uid}-grid)`} />

      {tour.mapFeatures.map((f, i) => (
        <MapFeature key={i} kind={f.kind} d={pathData(f.path, proj)} />
      ))}

      {showRoute && route.length > 1 && <path d={pathData(route, proj)} className="hk-map__route" />}
      {state.trail.length > 1 && <path d={pathData(state.trail, proj)} className="hk-map__trail" />}

      {children?.(proj)}

      {fog && (
        <g mask={`url(#${uid}-fog)`} className="hk-map__fog" aria-hidden="true" data-testid="map-fog">
          <rect width={width} height={height} className="hk-map__fog-base" />
          <rect width={width} height={height} filter={`url(#${uid}-noise)`} className="hk-map__fog-drift" />
          <rect width={width} height={height} fill={`url(#${uid}-fog-grid)`} />
        </g>
      )}

      {/* Place names are printed above the fog, like names on an old survey
          map, so walkers can orient themselves before anything is revealed. */}
      <g className="hk-map__labels" aria-hidden="true">
        {tour.mapFeatures.map((f, i) => {
          if (!f.name) return null;
          const anchor = proj.project(f.labelAt ?? f.path[Math.floor(f.path.length / 2)]!);
          // Keep names near the edges inside the frame.
          const textAnchor = anchor.x > width * 0.85 ? 'end' : anchor.x < width * 0.15 ? 'start' : 'middle';
          const x = textAnchor === 'end' ? anchor.x - 14 : textAnchor === 'start' ? anchor.x + 14 : anchor.x;
          return (
            <text
              key={i}
              x={x}
              y={anchor.y - 10}
              textAnchor={textAnchor}
              className={`hk-map__feature-label hk-map__feature-label--${f.kind}`}
            >
              {f.name}
            </text>
          );
        })}
      </g>

      {tour.stops.map((s, i) =>
        revealOnlyUnlocked && state.stops[s.id]?.unlockedAt === undefined ? null : (
        <StopMarker
          key={s.id}
          stop={s}
          index={i}
          status={stopStatus(tour, state, s)}
          center={proj.project(s.position)}
          radius={m(s.radius)}
          selected={selectedId === s.id}
          showRadius={showRadius}
          hideName={hideLockedNames}
        />
        ),
      )}

      {me && (
        <g className="hk-map__me" data-testid="map-me">
          {position?.accuracy ? <circle cx={me.x} cy={me.y} r={m(position.accuracy)} className="hk-map__accuracy" /> : null}
          <circle cx={me.x} cy={me.y} r={Math.max(28, m(30))} fill={`url(#${uid}-glow)`} className="hk-map__lantern" />
          <circle cx={me.x} cy={me.y} r={7} className="hk-map__me-dot" />
        </g>
      )}

      <ScaleBar proj={proj} width={width} height={height} />
    </svg>
  );
}

function MapFeature({ kind, d }: { kind: string; d: string }) {
  return (
    <g className={`hk-map__feature hk-map__feature--${kind}`}>
      <path d={d} />
    </g>
  );
}

function StopMarker({
  stop,
  index,
  status,
  center,
  radius,
  selected,
  showRadius,
  hideName,
}: {
  stop: Stop;
  index: number;
  status: StopStatus;
  center: { x: number; y: number };
  radius: number;
  selected: boolean;
  showRadius: boolean;
  hideName: boolean;
}) {
  const name = hideName && (status === 'locked' || status === 'available') ? '???' : stop.name;
  return (
    <g
      className={`hk-marker hk-marker--${status}${selected ? ' hk-marker--selected' : ''}`}
      data-stop={stop.id}
      data-status={status}
    >
      {showRadius && <circle cx={center.x} cy={center.y} r={radius} className="hk-marker__radius" />}
      <circle cx={center.x} cy={center.y} r={15} className="hk-marker__dot" />
      <text x={center.x} y={center.y + 5} className="hk-marker__num">
        {index + 1}
      </text>
      <text x={center.x} y={center.y - 24} className="hk-marker__name">
        {name}
      </text>
    </g>
  );
}

function ScaleBar({ proj, width, height }: { proj: Projection; width: number; height: number }) {
  const candidates = [25, 50, 100, 200, 250, 500, 1000];
  const meters = candidates.find((c) => c / proj.metersPerUnit > width * 0.12) ?? 1000;
  const len = meters / proj.metersPerUnit;
  const x = 24;
  const y = height - 24;
  return (
    <g className="hk-map__scale" aria-hidden="true">
      <path d={`M${x} ${y - 6} V${y} H${x + len} V${y - 6}`} />
      <text x={x + len / 2} y={y - 10}>
        {meters >= 1000 ? `${meters / 1000} km` : `${meters} m`}
      </text>
      <text x={width - 28} y={48} className="hk-map__north">
        N
      </text>
      <path d={`M${width - 28} 56 l-8 20 l8 -6 l8 6 z`} className="hk-map__north-arrow" />
    </g>
  );
}
