import Link from "next/link";

interface TrackCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  color: "emerald" | "blue" | "purple";
  modules: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

const colorMap = {
  emerald: {
    ring: "border-emerald-500/30 hover:border-emerald-500/60",
    badge: "bg-emerald-500/10 text-emerald-300",
    bullet: "text-emerald-400",
    btn: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20",
    glow: "hover:shadow-emerald-500/10",
  },
  blue: {
    ring: "border-blue-500/30 hover:border-blue-500/60",
    badge: "bg-blue-500/10 text-blue-300",
    bullet: "text-blue-400",
    btn: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20",
    glow: "hover:shadow-blue-500/10",
  },
  purple: {
    ring: "border-purple-500/30 hover:border-purple-500/60",
    badge: "bg-purple-500/10 text-purple-300",
    bullet: "text-purple-400",
    btn: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20",
    glow: "hover:shadow-purple-500/10",
  },
};

export function TrackCard({ emoji, title, subtitle, color, modules, cta, featured }: TrackCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-slate-900/60 p-7 transition-all duration-200
        ${c.ring} ${featured ? "ring-1 ring-blue-500/20 scale-[1.02]" : ""}
        hover:shadow-xl ${c.glow}`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-4 text-4xl">{emoji}</div>
      <div className={`mb-1 inline-block self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
        {title} Track
      </div>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>

      <ul className="mt-5 space-y-2.5 flex-1">
        {modules.map((m) => (
          <li key={m} className="flex items-start gap-2 text-sm text-slate-300">
            <span className={`mt-0.5 ${c.bullet}`}>▸</span>
            {m}
          </li>
        ))}
      </ul>

      <Link
        href={cta.href}
        className={`mt-7 block text-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow transition-all ${c.btn}`}
      >
        {cta.label}
      </Link>
    </div>
  );
}
