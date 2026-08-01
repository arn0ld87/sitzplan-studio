import { Fragment } from "react";
import {
  FURNITURE_SPECS,
  studentColor,
  initials,
  type Furniture,
  type Room,
  type Student,
} from "@/data/demo";

export type PlanMode = "room" | "seating";

export function PlanDefs() {
  return (
    <defs>
      <pattern id="sp-grid" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M25 0 H0 V25" fill="none" stroke="var(--grid-line)" strokeWidth="1" />
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

function seatPositions(f: Furniture) {
  const spec = FURNITURE_SPECS[f.kind];
  if (spec.seats === 1) return [{ cx: spec.w / 2, cy: spec.h / 2 }];
  if (spec.seats === 2)
    return [
      { cx: spec.w * 0.25, cy: spec.h / 2 },
      { cx: spec.w * 0.75, cy: spec.h / 2 },
    ];
  return [];
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

export function Seat({
  cx,
  cy,
  r,
  student,
  conflict,
  selected,
  onClick,
  label,
}: {
  cx: number;
  cy: number;
  r: number;
  student?: Student | undefined;
  conflict?: boolean;
  selected?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <g
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {conflict && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={r + 5}
            fill="none"
            stroke="#8A5A12"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <circle cx={cx + r + 3} cy={cy - r - 3} r="6" fill="var(--warning-bg)" stroke="#8A5A12" />
          <text
            x={cx + r + 3}
            y={cy - r + 1}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="#8A5A12"
          >
            !
          </text>
        </>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={student ? studentColor(student.colorIndex) : "var(--elevated)"}
        stroke={
          selected ? "var(--select)" : student ? "var(--line-plan)" : "var(--line-control)"
        }
        strokeWidth={selected ? 2.6 : student ? 1.5 : 1.2}
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
        {student ? initials(student.name) : r > 13 ? "frei" : ""}
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
  conflictSeats = [],
  selectedId,
  onSelect,
  selectedSeatId,
  onSeatClick,
  className,
}: {
  room: Room;
  mode?: PlanMode;
  showGrid?: boolean;
  assignments?: Record<string, string>;
  studentsById?: Record<string, Student>;
  conflictSeats?: string[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  selectedSeatId?: string | null;
  onSeatClick?: (seatId: string) => void;
  className?: string;
}) {
  const pad = 46;
  const r = mode === "seating" ? 16 : 11;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${room.width + pad * 2} ${room.height + pad * 2}`}
      className={className}
      role="img"
      aria-label={`Grundriss ${room.name}`}
      onClick={() => onSelect?.(null)}
    >
      <PlanDefs />
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
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${spec.label} auswählen`}
              onClick={(e) => {
                if (!onSelect) return;
                e.stopPropagation();
                onSelect(f.id);
              }}
              onKeyDown={(e) => {
                if (onSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(f.id);
                }
              }}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              <FurnitureShape kind={f.kind} />
            </g>
            {f.seats.map((seatId, i) => {
              const pos = seatPositions(f)[i];
              if (!pos) return null;
              const studentId = assignments[seatId];
              const student = studentId ? studentsById[studentId] : undefined;
              return (
                <Seat
                  key={seatId}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={r}
                  student={mode === "seating" ? student : undefined}
                  conflict={conflictSeats.includes(seatId)}
                  selected={selectedSeatId === seatId}
                  {...(onSeatClick ? { onClick: () => onSeatClick(seatId) } : {})}
                  label={
                    student ? `Platz mit ${student.name}` : "Freier Sitzplatz — Schüler zuweisen"
                  }
                />
              );
            })}
            {selected && (
              <SelectionFrame w={FURNITURE_SPECS[f.kind].w} h={FURNITURE_SPECS[f.kind].h} />
            )}
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
      <rect
        width={w}
        height={h}
        fill="none"
        stroke="var(--select)"
        strokeWidth="2.6"
        rx="3"
      />
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
  room: Room;
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
