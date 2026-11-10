import { useEffect, useId, useState } from "react";
import { navLinks, profile } from "../data/profile";
import { PlyMark } from "./PlyMark";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <a
          href="#sobre"
          className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink"
        >
          <PlyMark className="h-6 w-6" />
          {profile.name}
        </a>

        <nav aria-label="Seções" className="hidden md:block">
          <ul className="flex items-center gap-7 text-[15px]">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-muted transition-colors duration-200 hover:text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink lg:flex">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
          Aberto a estágio
        </p>

        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-[15px] font-medium text-ink md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Fechar" : "Menu"}
        </button>
      </div>

      <nav id={menuId} aria-label="Seções" hidden={!open} className="border-t border-line/60 md:hidden">
        <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center text-[17px] text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
