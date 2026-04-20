import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { CanvasEnginePage } from "./pages/CanvasEnginePage.tsx";

type Status = {
  api: string;
  db: string;
  timestamp: string;
};

const defaultStatus: Status = {
  api: "loading",
  db: "loading",
  timestamp: "-",
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/canvas-engine" element={<CanvasEnginePage />} />
    </Routes>
  );
}

function HomePage() {
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const endpoint = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            query: "query { systemStatus { api db timestamp } }",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (payload.errors?.length) {
          throw new Error(payload.errors[0].message || "GraphQL error");
        }

        setStatus(payload.data.systemStatus);
        setError("");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
      }
    }

    loadStatus();
    const interval = setInterval(loadStatus, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="page">
      <section className="card">
        <h1>Webster Test Frontend</h1>
        <p className="subtitle">Проверка подключения к backend API и MongoDB</p>

        <div className="links">
          <Link className="link" to="/canvas-engine">
            Открыть страницу теста движка
          </Link>
        </div>

        <div className="row">
          <span>API:</span>
          <strong className={status.api === "ok" ? "ok" : "bad"}>{status.api}</strong>
        </div>

        <div className="row">
          <span>DB:</span>
          <strong className={status.db === "connected" ? "ok" : "bad"}>{status.db}</strong>
        </div>

        <div className="row">
          <span>Updated:</span>
          <strong>{status.timestamp}</strong>
        </div>

        {error ? <p className="error">Ошибка: {error}</p> : null}
      </section>
    </main>
  );
}
