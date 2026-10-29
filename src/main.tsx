import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { aplicarMarca } from "./lib/marca";

aplicarMarca();

createRoot(document.getElementById("root")!).render(<App />);
