import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { onError } from "@apollo/client/link/error";
import { Observable } from "@apollo/client/utilities";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";
import { useToastStore } from "./shared/stores/toast.store";

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql";

async function refreshToken() {
  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        query: "mutation RefreshToken { refreshToken { message } }",
      }),
    });

    const payload = await response.json();
    return response.ok && !payload.errors?.length;
  } catch {
    return false;
  }
}

let lastErrorToastAt = 0;
const ERROR_TOAST_THROTTLE_MS = 2500;

function pushErrorToast(title: string, message?: string) {
  const now = Date.now();
  if (now - lastErrorToastAt < ERROR_TOAST_THROTTLE_MS) {
    return;
  }
  lastErrorToastAt = now;
  useToastStore.getState().pushToast({
    title,
    message,
    tone: "error",
  });
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const hasAuthError =
    graphQLErrors?.some((err) =>
      err.extensions?.code ? err.extensions.code === "UNAUTHENTICATED" : /unauth/i.test(err.message),
    ) ?? false;

  if (networkError) {
    pushErrorToast("Server error", networkError.message);
    return;
  }

  if (!hasAuthError) {
    if (graphQLErrors && graphQLErrors.length > 0) {
      pushErrorToast("Request failed", graphQLErrors[0]?.message);
    }
    return;
  }

  return new Observable((observer) => {
    let subscription: { unsubscribe: () => void } | null = null;

    refreshToken()
      .then((didRefresh) => {
        if (!didRefresh) {
          observer.error(new Error("Unable to refresh session"));
          return;
        }

        subscription = forward(operation).subscribe({
          next: (result) => observer.next(result),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      })
      .catch((err) => observer.error(err));

    return () => {
      subscription?.unsubscribe();
    };
  });
});

const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    new HttpLink({
      uri: graphqlUrl,
      credentials: "include",
    }),
  ]),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
