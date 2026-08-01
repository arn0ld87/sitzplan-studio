import { Fragment, useRef } from "react";
import {
  FURNITURE_SPECS,
  seatPositions,
  studentColor,
  initials,
  studentName,
  type Furniture,
  type RoomGeometry,
  type Student,
} from "@/data/types";
import { aufRasterPunkt, rasterWeite } from "@/lib/raster";

export type PlanMode = "room" | "seating";

export function PlanDefs({ grid }: { grid: number }) {
  return (
    <defs>
      <pattern id="sp-grid" width={grid} height={grid} patternUnits="userSpaceOnUse">
        <path d={`M${grid} 0 H0 V${grid}`} fill="none" stroke="var(--grid-line)" strokeWidth="1" />
      </pattern>
      <pattern
        id="sp-hatch"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="var(--line-strong)" strokeWidth="1.5" />
      </pattern>
    </defs>
  );
}

export function FurnitureShape({ kind }: { kind: Furniture["kind"] }) {
  const { w, h } = FURNITURE_SPECS[kind];
  switch (kind) {
    case "einzeltisch":
      return (
        <rect
          width={w}
          height={h}
          rx="3"
          fill="var(--elevated)"
          stroke="var(--line-plan)"
          strokeWidth="2"
        />
      );
    case "doppeltisch":
      return (
        <>
          <rect
            width={w}
            height={h}
            rx="3"
            fill="var(--elevated)"
            stroke="var(--line-plan)"
            strokeWidth="2"
          />
          <line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke="var(--line-plan)" strokeWidth="1" />
        </>
      );
    case "pult":
      return (
        <>
          <rect width={w} height={h} rx="3" fill="url(#sp-hatch)" />
          <rect
            width={w}
            height={h}
            rx="3"
            fill="none"
            stroke="var(--line-plan)"
            strokeWidth="2.5"
          />
          <text
            x={w / 2}
            y={h / 2 + 4}
            textAnchor="middle"
            fontSize="12"
            fontFamily="var(--font-mono)"
            fill="var(--ink)"
          >
            PULT
          </text>
        </>
      );
    case "tafel":
      return (
        <>
          <rect width={w} height={h} fill="var(--board)" />
          <text
            x={w / 2}
            y={h + 15}
            textAnchor="middle"
            fontSize="11"
            letterSpacing="2"
            fontFamily="var(--font-mono)"
            fill="var(--ink-2)"
          >
            TAFEL
          </text>
        </>
      );
    case "tuer":
      return (
        <>
          <rect width={w} height={h} fill="var(--plan)" stroke="var(--line-plan)" strokeWidth="2" />
          <path
            d={`M0 ${h} A ${w} ${w} 0 0 0 ${w} 0`}
            fill="none"
            stroke="var(--line-plan)"
            strokeWidth="1.2"
            strokeDasharray="5 4"
          />
        </>
      );
    case "fenster":
      return (
        <>
          <rect width={w} height={h} fill="var(--plan)" />
          <line x1="3" y1="0" x2="3" y2={h} stroke="var(--window)" strokeWidth="2.5" />
          <line x1={w - 3} y1="0" x2={w - 3} y2={h} stroke="var(--window)" strokeWidth="2.5" />
        </>
      );
  }
}

function Seat({
  cx,
  cy,
  r,
  student,
  carried,
  interactive,
  onDown,
  onUp,
  onDropStudent,
  label,
}: {
  cx: number;
  cy: number;
  r: number;
  student?: Student | undefined;
  carried?: boolean;
  interactive?: boolean;
  onDown?: () => void;
  onUp?: () => void;
  onDropStudent?: () => void;
  label: string;
}) {
  return (
    <g
      className={interactive ? "plan-focus" : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}

      onPointerDown={onDown}
      onPointerUp={onUp}
      onDragOver={onDropStudent ? (e) => e.preventDefault() : undefined}
      onDrop={
        onDropStudent
          ? (e) => {
              e.preventDefault();
              onDropStudent();
            }
          : undefined
      }
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDown?.();
        }
      }}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={student ? studentColor(student.colorIndex) : "var(--elevated)"}
        stroke={carried ? "var(--select)" : student ? "var(--line-plan)" : "var(--line-control)"}
        strokeWidth={carried ? 2.6 : student ? 1.5 : 1.2}
        strokeDasharray={student ? undefined : "3 3"}
      />
      <text
        x={cx}
        y={cy + (r > 13 ? 4 : 3)}
        textAnchor="middle"
        fontSize={r > 13 ? 11 : 8}
        fontWeight={student ? 600 : 400}
        fontFamily={student ? "var(--font-sans)" : "var(--font-mono)"}
        fill={student ? "#15110D" : "var(--ink-3)"}
        style={{ pointerEvents: "none" }}
      >
        {student ? initials(studentName(student)) : r > 13 ? "frei" : ""}
      </text>
    </g>
  );
}

export function RoomPlan({
  room,
  mode = "room",
  showGrid = true,
  assignments = {},
  studentsById = {},
  selectedId,
  onSelect,
  onMoveFurniture,
  carriedStudentId,
  onSeatDown,
  onSeatUp,
  onSeatDropStudent,
  className,
}: {
  room: RoomGeometry;
  mode?: PlanMode;
  showGrid?: boolean;
  assignments?: Record<string, string>;
  studentsById?: Record<string, Student>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMoveFurniture?: (id: string, x: number, y: number) => void;
  carriedStudentId?: string | null;
  onSeatDown?: (seatId: string) => void;
  onSeatUp?: (seatId: string) => void;
  onSeatDropStudent?: (seatId: string) => void;
  className?: string;
}) {
  const pad = 46;
  const r = mode === "seating" ? 16 : 11;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  function toSvg(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function startDrag(e: React.PointerEvent, f: Furniture) {
    if (!onMoveFurniture) return;
    const p = toSvg(e);
    if (!p) return;
    drag.current = { id: f.id, dx: p.x - f.x, dy: p.y - f.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function moveDrag(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !onMoveFurniture) return;
    const p = toSvg(e);
    if (!p) return;
    const { x, y } = aufRasterPunkt(p.x - d.dx, p.y - d.dy, rasterWeite(room.grid));
    onMoveFurniture(d.id, x, y);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${-pad} ${-pad} ${room.width + pad * 2} ${room.height + pad * 2}`}
      className={className}
      role={onSelect || onSeatDown ? "group" : "img"}
      aria-label={`Grundriss ${room.name}`}
      onClick={() => onSelect?.(null)}
      onPointerMove={moveDrag}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
    >
      <PlanDefs grid={rasterWeite(room.grid)} />
      <rect
        x={-pad}
        y={-pad}
        width={room.width + pad * 2}
        height={room.height + pad * 2}
        fill="var(--plan)"
      />
      {showGrid && <rect width={room.width} height={room.height} fill="url(#sp-grid)" />}
      <rect
        width={room.width}
        height={room.height}
        fill="none"
        stroke="var(--line-plan)"
        strokeWidth="3"
      />

      {/* Bemaßung */}
      <g fontFamily="var(--font-mono)" fontSize="12" fill="var(--ink-3)">
        <line
          x1="0"
          y1={-24}
          x2={room.width}
          y2={-24}
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <line x1="0" y1={-30} x2="0" y2={-18} stroke="var(--line-strong)" />
        <line x1={room.width} y1={-30} x2={room.width} y2={-18} stroke="var(--line-strong)" />
        <text x={room.width / 2} y={-30} textAnchor="middle">
          {room.width} cm
        </text>
        <line
          x1={-24}
          y1="0"
          x2={-24}
          y2={room.height}
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <line x1={-30} y1="0" x2={-18} y2="0" stroke="var(--line-strong)" />
        <line x1={-30} y1={room.height} x2={-18} y2={room.height} stroke="var(--line-strong)" />
        <text
          x={-30}
          y={room.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${-30} ${room.height / 2})`}
        >
          {room.height} cm
        </text>
      </g>

      {room.furniture.map((f) => {
        const spec = FURNITURE_SPECS[f.kind];
        const selected = selectedId === f.id;
        return (
          <g
            key={f.id}
            transform={`translate(${f.x} ${f.y}) rotate(${f.rotation} ${spec.w / 2} ${spec.h / 2})`}
          >
            <g
              className={onSelect ? "plan-focus" : undefined}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              {...(onSelect
                ? { "aria-label": `${spec.label} auswählen`, "aria-pressed": selected }
                : {})}
              onClick={(e) => {
                if (!onSelect) return;
                e.stopPropagation();
                onSelect(f.id);
              }}
              onPointerDown={(e) => {
                if (!onSelect) return;
                e.stopPropagation();
                onSelect(f.id);
                startDrag(e, f);
              }}
              onKeyDown={(e) => {
                if (onSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(f.id);
                }
              }}
              style={{ cursor: onMoveFurniture ? "move" : onSelect ? "pointer" : "default" }}
            >
              <FurnitureShape kind={f.kind} />
            </g>
            {f.seats.map((seatId, i) => {
              const pos = seatPositions(f.kind)[i];
              if (!pos) return null;
              const studentId = assignments[seatId];
              const student = studentId ? studentsById[studentId] : undefined;
              const interactive = mode === "seating" && Boolean(onSeatDown);
              return (
                <Seat
                  key={seatId}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={r}
                  student={mode === "seating" ? student : undefined}
                  carried={Boolean(student && carriedStudentId && student.id === carriedStudentId)}
                  interactive={interactive}
                  {...(interactive && onSeatDown ? { onDown: () => onSeatDown(seatId) } : {})}
                  {...(interactive && onSeatUp ? { onUp: () => onSeatUp(seatId) } : {})}
                  {...(interactive && onSeatDropStudent
                    ? { onDropStudent: () => onSeatDropStudent(seatId) }
                    : {})}
                  label={
                    student
                      ? `Platz mit ${studentName(student)} — auswählen zum Umsetzen`
                      : "Freier Sitzplatz — Schüler zuweisen"
                  }
                />
              );
            })}
            {selected && <SelectionFrame w={spec.w} h={spec.h} />}
          </g>
        );
      })}
    </svg>
  );
}

function SelectionFrame({ w, h }: { w: number; h: number }) {
  const g = 6;
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect width={w} height={h} fill="none" stroke="var(--select)" strokeWidth="2.6" rx="3" />
      <rect
        x={-8}
        y={-8}
        width={w + 16}
        height={h + 16}
        fill="none"
        stroke="var(--select)"
        strokeWidth="1"
        strokeDasharray="5 4"
      />
      {corners.map(([cx, cy]) => (
        <rect
          key={`${cx}-${cy}`}
          x={(cx ?? 0) - g / 2}
          y={(cy ?? 0) - g / 2}
          width={g}
          height={g}
          fill="var(--elevated)"
          stroke="var(--select)"
          strokeWidth="1.6"
        />
      ))}
      <line x1={w / 2} y1={-8} x2={w / 2} y2={-22} stroke="var(--select)" strokeWidth="1.2" />
      <circle
        cx={w / 2}
        cy={-26}
        r="4.5"
        fill="var(--elevated)"
        stroke="var(--select)"
        strokeWidth="1.6"
      />
    </g>
  );
}

/** Kleine Vorschau für Listen und Karten. */
export function PlanThumb({
  room,
  width = 44,
  height = 32,
}: {
  room: RoomGeometry;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${room.width} ${room.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className="shrink-0 rounded-[3px]"
      style={{ background: "var(--plan)", border: "1px solid var(--line)" }}
    >
      {room.furniture.map((f) => {
        const spec = FURNITURE_SPECS[f.kind];
        const fill =
          f.kind === "tafel"
            ? "var(--board)"
            : f.kind === "pult"
              ? "var(--line-strong)"
              : "var(--elevated)";
        return (
          <Fragment key={f.id}>
            <rect
              x={f.x}
              y={f.y}
              width={spec.w}
              height={spec.h}
              fill={fill}
              stroke="var(--line-plan)"
              strokeWidth="4"
            />
          </Fragment>
        );
      })}
    </svg>
  );
}
