import { Link } from "react-router-dom";

export function CanvasEnginePage() {
  return (
    <main className="engine-page">
      <header className="engine-header">
        <div>
          <p className="eyebrow">Canvas Engine</p>
          <h1>Test Page</h1>
          <p className="subtitle">
            Здесь ты проверяешь базовые операции движка: добавление объектов, выделение,
            перемещение, resize, rotate, undo/redo и сохранение состояния.
          </p>
        </div>

        <Link className="link" to="/">
          Назад к статусу
        </Link>
      </header>

      <section className="engine-layout">
        <aside className="panel">
          <h2>Тестовые действия</h2>
          <ul>
            <li>Добавить объект</li>
            <li>Выделить объект</li>
            <li>Сдвинуть / изменить размер</li>
            <li>Повернуть объект</li>
            <li>Проверить undo / redo</li>
          </ul>
        </aside>

        <div className="canvas-shell">
          <div className="canvas-toolbar">
            <span>Canvas preview</span>
            <span className="chip">/canvas-engine</span>
          </div>
          <div className="canvas-stage">
            <div className="sample-object" />
            <div className="sample-object sample-object-secondary" />
            <p className="canvas-hint">Здесь позже будет сам тестовый canvas и твои инструменты.</p>
          </div>
        </div>
      </section>
    </main>
  );
}