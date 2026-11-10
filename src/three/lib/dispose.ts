/* Libera geometrias, materiais e texturas de uma cena, menos os compartilhados */
import type { Material, Object3D, Texture } from "three";

function disposeMaterial(m: Material) {
  if (m.userData.shared) return;
  for (const value of Object.values(m)) {
    const tex = value as Texture | null;
    if (tex && tex.isTexture && !tex.userData.shared) tex.dispose();
  }
  m.dispose();
}

export function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
    else if (mesh.material) disposeMaterial(mesh.material);
  });
}
