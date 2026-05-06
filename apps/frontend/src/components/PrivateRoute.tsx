import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { GET_CURRENT_USER } from "../graphql/auth.graphql";

interface PrivateRouteProps {
  children: ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { loading, error, data } = useQuery(GET_CURRENT_USER);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
          <p className="mt-4 text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.me) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}