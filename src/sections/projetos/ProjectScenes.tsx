/* Uma cena por projeto. As de IoT mostram por cima as leituras que a cena simula. */
import { useRef, useState } from "react";
import type { Crop, GreenhouseReadings, createEstufasScene } from "../../three/scenes/projects/estufas";
import type { AlertLevel } from "../../three/scenes/projects/tempGuard";
import { ProjectStage } from "./ProjectStage";

export interface SceneProps {
  description: string;
}

const LEVEL_COLORS = ["#22c55e", "#facc15", "#ef4444"] as const;
const formatTemp = (value: number) => `${value.toFixed(1).replace(".", ",")} °C`;
const formatLux = (value: number) => value.toLocaleString("pt-BR");

export function BlintecScene({ description }: SceneProps) {
  return <ProjectStage description={description} create={(three, viewport) => three.createBlintecScene(viewport)} />;
}

export function CampusScene({ description }: SceneProps) {
  return <ProjectStage description={description} create={(three, viewport) => three.createCampusScene(viewport)} />;
}

export function TempGuardScene({ description }: SceneProps) {
  const [reading, setReading] = useState<{ temp: number; level: AlertLevel }>({ temp: 24, level: 0 });

  return (
    <ProjectStage
      description={description}
      create={(three, viewport) => three.createTempGuardScene(viewport, { onReading: (temp, level) => setReading({ temp, level }) })}
    >
      <span className="chip">
        <i style={{ background: LEVEL_COLORS[reading.level] }} />
        <span>{formatTemp(reading.temp)}</span>
      </span>
    </ProjectStage>
  );
}

const RELAY_NAMES = ["Irrigação", "Ventilação", "Iluminação"] as const;
const INITIAL_READINGS: GreenhouseReadings = { temperature: 22, soil: 68, lux: 9000, relays: [false, false, false] };

export function EstufasScene({ description }: SceneProps) {
  const [readings, setReadings] = useState(INITIAL_READINGS);
  const [crop, setCrop] = useState<Crop>("alface");
  const cropRef = useRef(crop);
  const sceneRef = useRef<ReturnType<typeof createEstufasScene> | null>(null);

  const toggleCrop = () => {
    const next: Crop = cropRef.current === "alface" ? "repolho" : "alface";
    cropRef.current = next;
    setCrop(next);
    sceneRef.current?.setCrop(next);
  };

  return (
    <ProjectStage
      description={description}
      showReplay={false}
      sceneRef={sceneRef}
      create={(three, viewport) => {
        const scene = three.createEstufasScene(viewport, { onReadings: setReadings });
        if (cropRef.current !== "alface") scene.setCrop(cropRef.current);
        /* no celular, tocar na estufa também troca a cultura */
        return { ...scene, tap: toggleCrop };
      }}
    >
      <div className="gh-read">
        <span className="chip-s">
          <b>{formatTemp(readings.temperature)}</b> ar
        </span>
        <span className="chip-s">
          <b>{readings.soil}%</b> solo
        </span>
        <span className="chip-s">
          <b>{formatLux(readings.lux)}</b> lux
        </span>
      </div>
      <div className="gh-relays" aria-hidden="true">
        {RELAY_NAMES.map((name, i) => (
          <span key={name} className={readings.relays[i] ? "on" : undefined}>
            <i />
            {name}
          </span>
        ))}
      </div>
      <button className="crop" type="button" aria-pressed={crop === "repolho"} onClick={toggleCrop}>
        Cultura: <b>{crop}</b>
      </button>
    </ProjectStage>
  );
}
