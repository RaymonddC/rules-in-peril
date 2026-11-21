import { useEffect, useState } from "react";
import { CircleScreen } from "./screens/CircleScreen";
import { ReplayScreen } from "./screens/ReplayScreen";

// Two screens, hash routes: #/ is the circle, #/replay is the breach replay,
// #/fixes is the circle scrolled to its fixes.
type Screen = "circle" | "replay";
const path = () => window.location.hash.replace(/^#\/?/, "");
const read = (): Screen => (path() === "replay" ? "replay" : "circle");

function scrollForHash() {
  if (path() === "fixes") {
    requestAnimationFrame(() => document.getElementById("fixes")?.scrollIntoView({ block: "start" }));
  } else {
    window.scrollTo(0, 0);
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>(read);
  useEffect(() => {
    const onChange = () => {
      setScreen(read());
      scrollForHash();
    };
    scrollForHash();
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return screen === "replay" ? <ReplayScreen /> : <CircleScreen />;
}
