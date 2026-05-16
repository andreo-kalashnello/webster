import { Navigate, Route, Routes } from "react-router-dom";

import { PrivateRoute } from "./components/PrivateRoute.tsx";
import { CanvasEnginePage } from "./pages/CanvasEnginePage.tsx";
import { EditorPage } from "./pages/EditorPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { MagicLinkPage } from "./pages/MagicLinkPage.tsx";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { ProjectsPage } from "./pages/ProjectsPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.tsx";
import { TemplatesPage } from "./pages/TemplatesPage.tsx";
import { VerifyEmailPage } from "./pages/VerifyEmailPage.tsx";
import { ToastViewport } from "./components/ui/ToastViewport";
import { useAuthBootstrap } from "./shared/hooks";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/magic-link" element={<MagicLinkPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
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
        <Route path="/user-templates" element={<Navigate to="/templates" replace />} />
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
    </AppLayout>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
