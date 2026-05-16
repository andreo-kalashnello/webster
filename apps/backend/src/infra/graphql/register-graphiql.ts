import { renderGraphiQL } from "@graphql-yoga/render-graphiql";
import type { INestApplication } from "@nestjs/common";
import type { Request, Response } from "express";

export function registerGraphiQLRoutes(app: INestApplication, isProduction: boolean) {
  if (isProduction) return;

  app.use("/graphiql", (_req: Request, res: Response) => {
    res.type("text/html").send(
      renderGraphiQL({
        endpoint: "/graphql",
        title: "Webster GraphiQL",
      }),
    );
  });

  app.use("/favicon.ico", (_req: Request, res: Response) => {
    res.status(204).end();
  });
}
