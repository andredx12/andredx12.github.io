interface SectionHeadingProps {
  id: string;
  title: string;
  intro?: string;
}

export function SectionHeading({ id, title, intro }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}
