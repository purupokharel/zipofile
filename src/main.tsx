import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initAppTheme } from "./lib/appTheme";
import "./styles/global.css";

initAppTheme();

if (typeof window !== "undefined" && window.self !== window.top) {
  document.documentElement.dataset.framed = "1";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
