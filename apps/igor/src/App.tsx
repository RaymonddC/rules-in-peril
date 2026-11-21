import { LabProvider } from "./lab/lab-state";
import { useRoute } from "./lab/route";
import { AutopsyScreen } from "./screens/AutopsyScreen";
import { CloseGapScreen } from "./screens/CloseGapScreen";
import { CryptScreen } from "./screens/CryptScreen";
import { LabScreen } from "./screens/LabScreen";
import { StartScreen } from "./screens/StartScreen";

function Screens() {
  const route = useRoute();
  switch (route.screen) {
    case "start":
      return <StartScreen />;
    case "lab":
      return <LabScreen />;
    case "autopsy":
      return <AutopsyScreen monsterId={route.monsterId} />;
    case "close-the-gap":
      return <CloseGapScreen />;
    case "crypt":
      return <CryptScreen />;
  }
}

export function App() {
  return (
    <LabProvider>
      <Screens />
    </LabProvider>
  );
}
