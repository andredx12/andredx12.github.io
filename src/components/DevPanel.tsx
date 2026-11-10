import { lazy, Suspense, useSyncExternalStore } from "react";

/* O painel de desempenho fica num arquivo separado e só é baixado com #dev no endereço. */
const PerfPanel = lazy(() => import("./PerfPanel").then((m) => ({ default: m.PerfPanel })));

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export function DevPanel() {
  const isDev = useSyncExternalStore(
    subscribeHash,
    () => location.hash === "#dev",
    () => false,
  );
  if (!isDev) return null;
  return (
    <Suspense fallback={null}>
      <PerfPanel />
    </Suspense>
  );
}
