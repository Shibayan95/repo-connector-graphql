import { AppConfig } from "./config.lib";
import { HttpService } from "./http.lib";
import { ApolloServer, HeaderMap } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildClientSchema, extendSchema, parse, printSchema } from "graphql";
import { Logger } from "winston";
import { readFileSync, writeFile, writeFileSync } from "fs";
import { mergeResolvers } from "@graphql-tools/merge";
import { join } from "path";
import { loadFilesSync } from "@graphql-tools/load-files";
import { IApolloServerDependencies, IModuleDependencies } from "src/types";
import { GraphQlQuery } from "./query.lib";
import { Utils } from "./util.lib";
import { Validator } from "./validator.lib";
export class Apollo {
  private readonly apolloService: HttpService;
  private readonly logger: Logger;
  private readonly validator: Validator;
  private readonly appConfig: AppConfig;
  private readonly util: Utils;
  private readonly headerMap: HeaderMap = new HeaderMap();
  private apolloServer: ApolloServer<IModuleDependencies>;
  private readonly graphQlQuery: GraphQlQuery;
  constructor(dependencies: IApolloServerDependencies) {
    const { logger, graphQlQuery, util, appConfig, validator } = dependencies;
    this.logger = logger;
    this.appConfig = appConfig;
    this.validator = validator;
    this.graphQlQuery = graphQlQuery;
    this.util = util;
    this.headerMap.set(
      "Authorization",
      `Bearer ${appConfig.get("GITHUB_ACCESS_TOKEN")}`,
    );
    this.headerMap.set("Content-Type", `application/json`);
    this.apolloService = new HttpService(
      appConfig.get("GITHUB_GRAPHQL_END_POINT"),
      {
        Authorization: `Bearer ${appConfig.get("GITHUB_ACCESS_TOKEN")}`,
      },
    );
  }

  // TO DO: Put this into separate script
  private async introSpectSchema() {
    const { data } = await this.apolloService.get("");
    const schema = buildClientSchema(data);
    const typeDefs = printSchema(schema);
    writeFileSync(join(__dirname, "../graphql/schema.gql"), typeDefs);
  }

  async getMiddleWare() {
    if (!this.apolloServer) {
      await this.setUpServer();
    }
    return expressMiddleware(this.apolloServer, {
      context: async () => ({
        apolloService: this.apolloService,
        graphQlQuery: this.graphQlQuery,
        util: this.util,
        logger: this.logger,
        appConfig: this.appConfig,
        validator: this.validator,
      }),
    });
  }

  private async setUpServer() {
    if (!this.apolloServer) {
      const typeDefs = readFileSync(
        join(__dirname, "../graphql/schema.gql"),
        "utf-8",
      );
      const resolvers = mergeResolvers(
        loadFilesSync(join(__dirname, "../modules/**/*.resolver.ts")),
      );
      this.apolloServer = new ApolloServer<IModuleDependencies>({
        typeDefs,
        logger: this.logger,
        resolvers,
        // introspection: false,
      });
      await this.apolloServer.start();
      this.logger.info(`Initialised Apollo Server`);
    }
    return this.apolloServer;
  }

  server() {
    return this.apolloService;
  }
}
