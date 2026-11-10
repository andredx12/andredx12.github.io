import { SectionHeading } from "../components/SectionHeading";
import { stackGroups } from "../data/stack";

export function Stack() {
  return (
    <section id="stack" aria-labelledby="stack-titulo" className="border-t border-line/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading id="stack-titulo" title="Stack" />
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5 lg:gap-x-8">
          {stackGroups.map((group) => (
            <div key={group.title} className="border-t border-line pt-5">
              <h3 className="text-sm text-muted">{group.title}</h3>
              <ul className="mt-3 space-y-1.5 font-display text-lg font-medium tracking-[-0.01em] text-ink sm:text-xl">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
