import { workerData, parentPort } from "worker_threads";
import { IContentDetails, IModuleDependencies } from "../types";
import { existsSync, writeFileSync } from "fs";
import { appInitialiser } from "../lib";
import * as path from "path";

const generatePathMapper = async (
  dependencies: IModuleDependencies,
  repoName: string,
  pathMapper: any,
  expressionPreffix: string,
  yamlFilePath: string,
  directoryCountPath: string,
  contentDetailsPath: string,
) => {
  const getMultiplePathRepoContents: Record<string, string> = {};
  const idToPathMapper: Record<string, string> = {};
  const { util, apolloService, graphQlQuery } = dependencies;
  const pathMapperKeys = Object.keys(pathMapper);
  for (let i = 0; i < pathMapperKeys.length; i++) {
    const k = pathMapperKeys[i];
    const value = pathMapper[k] as IContentDetails;
    if (value.type === "tree") {
      const token = util.randomTokenGenerator("object");
      idToPathMapper[token] = value.name;
      getMultiplePathRepoContents[token] = `${expressionPreffix}${value.name}`;
    } else {
      const fileDetails = value.name.split(".");
      if (
        fileDetails[fileDetails.length - 1] === "yml" &&
        !existsSync(yamlFilePath)
      ) {
        writeFileSync(yamlFilePath, `${expressionPreffix}${value.name}`);
      }
    }
  }
  if (Object.keys(getMultiplePathRepoContents).length > 0) {
    const objectChunks = util.buildObjectChunk(
      getMultiplePathRepoContents,
      200,
    );
    const results = await Promise.all(
      objectChunks.map((ob) =>
        apolloService.request(
          "",
          graphQlQuery.getMultiplePathRepoContents(repoName, ob),
        ),
      ),
    );
    const keys = Object.keys(idToPathMapper);
    for (let i = 0; i < results.length; i++) {
      const { data, errors: defaultBranchErrors } = results[i];
      if (data && data.viewer && data.viewer.repository) {
        const {
          viewer: { repository },
        } = data;
        for (let i = 0; i < keys.length; i++) {
          const token = keys[i];
          (
            pathMapper[idToPathMapper[token].toString()] as IContentDetails
          ).contents = {};
          if (repository[token] && repository[token].entries) {
            // Storing results, later can be used
            writeFileSync(
              path.join(
                __dirname,
                `${contentDetailsPath}/${idToPathMapper[token]}.json`,
              ),
              JSON.stringify(repository[token].entries),
            );
            writeFileSync(
              path.join(
                __dirname,
                `${directoryCountPath}/${idToPathMapper[token]}_count.json`,
              ),
              JSON.stringify({
                count: repository[token].entries.filter(
                  (e) => e.type === "blob",
                ).length,
              }),
            );
            repository[token].entries.map((entry: IContentDetails) => {
              (
                pathMapper[idToPathMapper[token].toString()] as IContentDetails
              ).contents[entry.name] = entry;
            });

            await generatePathMapper(
              dependencies,
              repoName,
              (pathMapper[idToPathMapper[token].toString()] as IContentDetails)
                .contents,
              `${expressionPreffix}${idToPathMapper[token]}/`,
              yamlFilePath,
              directoryCountPath,
              contentDetailsPath,
            );
          }
        }
      }
    }
  }
  return pathMapper;
};

const scanRepository = async (
  dependencies: IModuleDependencies,
  branchName: string,
  repoName: string,
  yamlFilePath: string,
  directoryCountPath: string,
  contentDetailsPath: string,
) => {
  const { apolloService, graphQlQuery } = dependencies;
  const pathMapper: any = {
    [branchName]: {
      name: branchName,
      contents: {},
    },
  };
  const {
    data: {
      viewer: {
        repository: {
          object: { entries },
        },
      },
    },
    errors: defaultBranchErrors,
  } = await apolloService.request(
    "",
    graphQlQuery.getRepoBranchContents(repoName, `${branchName}:`),
  );
  //   apolloService.errorHandler(defaultBranchErrors, response);
  entries.forEach((entry: IContentDetails) => {
    pathMapper[branchName].contents[entry.name] = entry;
  });
  writeFileSync(
    path.join(__dirname, `${directoryCountPath}/${branchName}_count.json`),
    JSON.stringify({
      count: entries.filter((e) => e.type === "blob").length,
    }),
  );
  await generatePathMapper(
    dependencies,
    repoName,
    pathMapper[branchName].contents,
    `${branchName}:`,
    yamlFilePath,
    directoryCountPath,
    contentDetailsPath,
  );
};
const {
  environment,
  branchName,
  repoName,
  yamlFilePath,
  directoryCountPath,
  contentDetailsPath,
} = workerData;

appInitialiser(environment)
  .then((dependencies) =>
    scanRepository(
      dependencies,
      branchName,
      repoName,
      yamlFilePath,
      directoryCountPath,
      contentDetailsPath,
    ),
  )
  .then((pathMapper) => {
    console.log("Finished Processing");
    parentPort.postMessage(pathMapper);
  })
  .catch(() => parentPort.close());
