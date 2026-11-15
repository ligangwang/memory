import { createRoot } from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "./memory.css";
import { connect } from "../sdk/dingn-sdk.js";
import { DingnProvider } from "./dingn";
import { MemoryProvider } from "./memory-state";
import { MemoryApp, isTab } from "./app";
import { loadSaved } from "./save";

const sdk = await connect();
document.documentElement.lang = sdk.locale;
const [saved, tab] = await Promise.all([
  loadSaved(sdk),
  sdk.storage.get("tab").catch(() => null),
]);
createRoot(document.getElementById("root")!).render(
  <DingnProvider sdk={sdk}>
    <MemoryProvider initial={saved}>
      <MemoryApp
        initialTab={location.hash ? undefined : isTab(tab) ? tab : undefined}
      />
    </MemoryProvider>
  </DingnProvider>,
);
sdk.ready();
