import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";

import { GET_CURRENT_USER } from "../../graphql/auth.graphql";
import { useAuthStore } from "../stores/auth.store";

export function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  const { data, loading } = useQuery(GET_CURRENT_USER, {
    errorPolicy: "ignore",
  });

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (data?.me) {
      setUser(data.me);
    } else {
      setUser(null);
    }
  }, [data, loading, setUser]);
}
