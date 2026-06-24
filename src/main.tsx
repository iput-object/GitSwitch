import ReactDOM from "react-dom/client";
import App from "./App";

// Disable the webview's default right-click menu in production (keep it in dev for devtools).
if (!import.meta.env.DEV) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
