import { STATS } from "../../data/websiteContent";

export function StatsBar() {
  return (
    <section className="bg-[#e8570e]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-orange-600">
        {STATS.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center text-center gap-1 lg:px-8">
            <span className="text-3xl font-bold text-white">{value}</span>
            <span className="text-sm text-orange-100/80">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}