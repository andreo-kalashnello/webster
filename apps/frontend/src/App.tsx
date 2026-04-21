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

  const apiStatusClass = status.api === "ok" ? "text-emerald-700" : "text-rose-700";
  const dbStatusClass = status.db === "connected" ? "text-emerald-700" : "text-rose-700";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,#e0f2fe,#f8fafc_60%)] px-6 py-8 font-sans">
      <section className="w-full max-w-xl rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">Webster Test Frontend</h1>
        <p className="mb-5 text-sm text-slate-600">Проверка подключения к backend API и MongoDB</p>

        <div className="mb-5">
          <Link
            className="font-semibold text-blue-700 underline-offset-4 transition-colors hover:text-blue-800 hover:underline"
            to="/canvas-engine"
          >
            Открыть страницу теста движка
          </Link>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm">
          <span>API:</span>
          <strong className={`font-semibold ${apiStatusClass}`}>{status.api}</strong>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm">
          <span>DB:</span>
          <strong className={`font-semibold ${dbStatusClass}`}>{status.db}</strong>
        </div>

        <div className="flex items-center justify-between py-2.5 text-sm">
          <span>Updated:</span>
          <strong className="font-semibold text-slate-900">{status.timestamp}</strong>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Ошибка: {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
