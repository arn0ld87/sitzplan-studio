const STUD = [
  "#E08A6B",
  "#9DBFA8",
  "#E3B56B",
  "#A99CCB",
  "#7CA9C2",
  "#D88BA0",
  "#B89970",
  "#82B7A5",
];

export function ClassDot({
  name,
  colorIndex,
  size = 24,
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
        borderColor: STUD[colorIndex % STUD.length],
        fontSize: size > 30 ? 13 : 10,
      }}
      className="grid shrink-0 place-items-center rounded-full border-2 bg-sunken font-semibold"
    >
      {kuerzel}
    </span>
  );
}
