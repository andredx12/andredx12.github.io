import type { ReactNode } from "react";

interface ButtonLinkProps {
  href: string;
  variant?: "primary" | "secondary";
  external?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-[15px] font-semibold transition-colors duration-200";

const variants = {
  primary: "bg-electric-strong text-white hover:bg-electric-deep",
  secondary: "border border-line text-ink hover:border-glow/60 hover:bg-surface-2",
};

export function ButtonLink({ href, variant = "secondary", external = false, children }: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={`${base} ${variants[variant]}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
