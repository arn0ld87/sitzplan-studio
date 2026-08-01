import { studentColor } from "@/data/demo";

export function ClassDot({
  name,
  colorIndex,
  size = 30,
}: {
  name: string;
  colorIndex: number;
  size?: number;
}) {
  const kuerzel = name.replace("Klasse ", "");
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: studentColor(colorIndex),
        color: "#15110D",
        fontSize: size >= 34 ? 13 : size >= 28 ? 11.5 : 10.5,
      }}
      className="grid shrink-0 place-items-center rounded-full font-semibold"
    >
      {kuerzel}
    </span>
  );
}
