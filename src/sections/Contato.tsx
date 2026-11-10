import { ButtonLink } from "../components/ButtonLink";
import { profile } from "../data/profile";

export function Contato() {
  return (
    <section id="contato" aria-labelledby="contato-titulo" className="border-t border-line/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(55%_80%_at_100%_0%,rgba(47,107,255,0.16),transparent_70%)]"
          />
          <div className="relative">
            <h2
              id="contato-titulo"
              className="font-display text-[clamp(2.75rem,7vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.035em] text-ink"
            >
              Vamos conversar?
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {profile.availability}
            </p>
            <a
              href={`mailto:${profile.links.email}`}
              className="mt-8 inline-block font-display text-[clamp(1.05rem,4.4vw,2.25rem)] font-semibold [overflow-wrap:anywhere] tracking-[-0.01em] text-glow underline decoration-glow/30 underline-offset-8 transition-colors hover:decoration-glow"
            >
              {profile.links.email}
            </a>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={profile.links.linkedin} external>
                LinkedIn
              </ButtonLink>
              <ButtonLink href={profile.links.github} external>
                GitHub
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
