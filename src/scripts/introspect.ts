import { existsSync, mkdirSync, writeFileSync } from "fs";
import { buildClientSchema, printSchema } from "graphql";
import { join } from "path";
import { AppConfig } from "../lib/config.lib";
import { HttpService } from "../lib/http.lib";
import { LoggerLib } from "../lib/logger.lib";
// Defaulting to development mode
const environment = process.env.NODE_ENV || "development";

const appConfig = new AppConfig(environment);
const logger = new LoggerLib(appConfig).logger();

const apolloService = new HttpService(
    appConfig.get("GITHUB_GRAPHQL_END_POINT"),
    {
      Authorization: `Bearer ${appConfig.get("GITHUB_ACCESS_TOKEN")}`,
    },
);


const introSpectSchema = async () => {
    const graphQlDirectory = join(__dirname, "../graphql");
    const graphQlSchemaFile = join(graphQlDirectory, "/schema.gql");
    logger.debug(`Attempting to create schema file, path: ${graphQlSchemaFile}`);
    if (!existsSync(graphQlDirectory)) {
        mkdirSync(graphQlDirectory);
    }
    if (existsSync(graphQlSchemaFile)) {
       throw `Skipping file creation since file: ${graphQlSchemaFile} already exists`
    }
    const { data } = await apolloService.get("");
    const schema = buildClientSchema(data);
    const typeDefs = printSchema(schema);
    writeFileSync(join(graphQlDirectory, "/schema.gql"), typeDefs);
    logger.info(`Created schema file at path: ${graphQlSchemaFile}`);
    return;
}
introSpectSchema().then(() => logger.debug('Finished Introspection')).catch(err => logger.error(err));
