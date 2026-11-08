// The vertical cut reuses the approved landscape v3 story, captions, clips and timings
// (../composition/scenes.mjs) and applies only the changes the vertical brief asks for.
import { SCENES as BASE, XFADE, CAPTIONS, LABELS, CHAT, AUDIO } from "../composition/scenes.mjs";

export { XFADE, CAPTIONS, LABELS, CHAT, AUDIO };

export const SCENES = structuredClone(BASE);
const scene = (id) => SCENES.find((s) => s.id === id);

// Privacy line: at least 4 s on screen and the same size as the other captions.
{
  const h = scene("history");
  const p = h.parts.find((q) => q.clip === "S06d-lock-receptionist");
  p.dur = 4.5;
  h.captions.find((c) => c.style === "small").style = "";
}
