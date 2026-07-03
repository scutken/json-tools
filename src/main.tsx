import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";

import "@/styles/globals.css";
import DefaultLayout from "@/layouts/default";
import { FontSizeManager } from "@/components/FontSizeManager";
import UtoolsListener from "@/services/utoolsListener";

// 初始化 Utools 监听器
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(() => {
      UtoolsListener.getInstance().initialize();
    }, 0);
  });
} else {
  setTimeout(() => {
    UtoolsListener.getInstance().initialize();
  }, 0);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Provider>
        <FontSizeManager />
        <DefaultLayout>
          <App />
        </DefaultLayout>
      </Provider>
    </HashRouter>
  </React.StrictMode>,
);
