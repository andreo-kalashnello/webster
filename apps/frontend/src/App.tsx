import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { PrivateRoute } from "./components/PrivateRoute.tsx";
import { CanvasEnginePage } from "./pages/CanvasEnginePage.tsx";
import { EditorPage } from "./pages/EditorPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { ProjectsPage } from "./pages/ProjectsPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.tsx";
import { TemplatesPage } from "./pages/TemplatesPage.tsx";
import { UserTemplatesPage } from "./pages/UserTemplatesPage.tsx";
import { VerifyEmailPage } from "./pages/VerifyEmailPage.tsx";

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <ProjectsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <PrivateRoute>
            <TemplatesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/user-templates"
        element={
          <PrivateRoute>
            <UserTemplatesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/editor"
        element={
          <PrivateRoute>
            <EditorPage />
          </PrivateRoute>
        }
      />
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

  const apiStatusClass = status.api === "ok" ? "text-emerald-300" : "text-rose-300";
  const dbStatusClass = status.db === "connected" ? "text-emerald-300" : "text-rose-300";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_15%,#223046,transparent_40%),radial-gradient(circle_at_85%_10%,#3b1e2e,transparent_35%),linear-gradient(135deg,#0b0f1a,#121826)] text-slate-100">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">CUMpus</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              className="rounded-full border border-slate-600/60 px-4 py-2 text-slate-200 transition hover:border-slate-400 hover:text-white"
              to="/login"
            >
              Sign In
            </Link>
            <Link
              className="rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300"
              to="/register"
            >
              Get Started
            </Link>
          </nav>
        </header>

        <section className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Webster — онлайн редактор для швидких кампусних матеріалів
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Збирайте афіші, оголошення та презентації за лічені хвилини.
              Одна реєстрація, і редактор готовий до роботи.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-900 transition hover:bg-emerald-300"
                to="/register"
              >
                Створити акаунт
              </Link>
              <Link
                className="rounded-full border border-slate-600/60 px-6 py-3 font-semibold text-slate-100 transition hover:border-slate-400"
                to="/login"
              >
                Увійти
              </Link>
              <Link
                className="rounded-full border border-slate-700/60 px-6 py-3 text-slate-300 transition hover:border-slate-500 hover:text-white"
                to="/canvas-engine"
              >
                Тест Canvas Engine
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link
                className="rounded-full border border-slate-700/60 px-4 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white"
                to="/projects"
              >
                Список проєктів
              </Link>
              <Link
                className="rounded-full border border-slate-700/60 px-4 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white"
                to="/templates"
              >
                Шаблони
              </Link>
            </div>
            <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Швидкий старт</p>
                <p className="mt-2">Одразу після реєстрації можна працювати з редактором.</p>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Зручні сесії</p>
                <p className="mt-2">Авторизація через токени зберігається автоматично.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 shadow-[0_20px_60px_rgba(8,12,22,0.5)]">
            <h2 className="text-lg font-semibold text-white">Стан сервісу</h2>
            <p className="mt-1 text-sm text-slate-400">Поточне підключення API та бази.</p>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <span className="text-slate-400">API</span>
                <strong className={`font-semibold ${apiStatusClass}`}>{status.api}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <span className="text-slate-400">DB</span>
                <strong className={`font-semibold ${dbStatusClass}`}>{status.db}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Updated</span>
                <strong className="font-semibold text-slate-200">{status.timestamp}</strong>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                Ошибка: {error}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}