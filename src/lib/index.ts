import { AppConfig } from "./config.lib";
import { LoggerLib } from "./logger.lib";
import { Apollo } from "./apollo.lib";
import {
  IApolloServerDependencies,
  IGlobalDependencies,
  IModuleDependencies,
} from "../types";
import { Validator } from "./validator.lib";
import { Utils } from "./util.lib";
import { GraphQlQuery } from "./query.lib";
import { HttpService } from "./http.lib";

export const appInitialiser = async (
  environment: string,
): Promise<IGlobalDependencies & IModuleDependencies> => {
  const appConfig = new AppConfig(environment);
  const loggerClass = new LoggerLib(appConfig);
  const logger = loggerClass.logger();
  const util = new Utils(appConfig);
  const graphQlQuery = new GraphQlQuery(appConfig);
  const validator = new Validator();
  const apolloDependencies: IApolloServerDependencies = {
    validator,
    graphQlQuery,
    util,
    logger,
    appConfig,
  };
  const apolloServer = new Apollo(apolloDependencies);
  return {
    appConfig,
    logger,
    apolloService: apolloServer.server(),
    apolloMiddleware: await apolloServer.getMiddleWare(),
    validator,
    util,
    graphQlQuery,
  };
};
