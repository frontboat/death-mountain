import { createRoot } from "react-dom/client";
import { DynamicConnectorProvider } from "@/contexts/starknet.tsx";
import { MetagameProvider } from "@/contexts/metagame.tsx";
import App from "./App.tsx";
import "./index.css";

function DojoApp() {
  return (
    <MetagameProvider>
      <App />
    </MetagameProvider>
  );
}

async function main() {
  createRoot(document.getElementById("root")!).render(
    <DynamicConnectorProvider>
      <DojoApp />
    </DynamicConnectorProvider>
  );
}

main().catch((error) => {
  console.error("Failed to initialize the application:", error);
});
