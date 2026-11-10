/**
 * Roda a função quando o navegador fica livre, ou no máximo depois de `timeout` ms.
 * O Safari não tem requestIdleCallback; nele a espera é um tempo curto fixo.
 * Devolve a função que cancela.
 */
export function onIdle(callback: () => void, timeout: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, Math.min(timeout, 300));
  return () => window.clearTimeout(id);
}
