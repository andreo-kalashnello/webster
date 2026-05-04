import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql";

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: graphqlUrl,
    credentials: "include",
  }),
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
