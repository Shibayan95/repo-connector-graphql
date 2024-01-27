import * as cookieParser from "cookie-parser";
import * as express from "express";
import { appInitialiser } from "./lib";
import { HttpStatus, IModuleDependencies } from "./types";
import * as cors from "cors";
import { routerModule } from "./modules";
import { metricsMiddleware } from "./middlewares/metrics.middleware";
// Defaulting to development mode
const environment = process.env.NODE_ENV || "development";

const bootStrapApplication = async (): Promise<void> => {
  const {
    appConfig,
    logger,
    apolloService,
    validator,
    util,
    graphQlQuery,
    apolloMiddleware,
  } = await appInitialiser(environment);
  logger.info(`Environment: ${environment}`);
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  const moduleDependencies: IModuleDependencies = {
    appConfig,
    logger,
    validator,
    util,
    graphQlQuery,
    apolloService,
  };

  app.use(cors());
  app.use(metricsMiddleware(logger, util));
  app.use("/api", routerModule(moduleDependencies));
  app.use("/graphql", apolloMiddleware);

  app.get("/healthcheck", (req, res) => {
    if (appConfig && logger) {
      return res.status(HttpStatus.OK).json({ status: "Ok" });
    }
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: "Not Ok" });
  });

  app.listen(appConfig.get("PORT") || 3000, () =>
    logger.info(`Server running at port: ${appConfig.get("PORT") || 3000}`),
  );
};

bootStrapApplication();
