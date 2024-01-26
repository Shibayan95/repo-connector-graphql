import { Request, Response, NextFunction, response } from "express";
import { HttpStatus, IContentDetails, IModuleDependencies } from "../../types";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
} from "fs";
import * as path from "path";
import { readdir } from "fs/promises";
import { Worker } from "worker_threads";
import { HttpService } from "src/lib/http.lib";

const formatAllRepositoryResult = (data: any) => {
  const result = {
    pageInfo: data.viewer.repositories.pageInfo,
    data: [],
  };
  data.viewer.repositories.nodes.forEach((node) => {
    result.data.push({ ...node });
  });
  const {
    endCursor: end,
    hasNextPage,
    hasPreviousPage,
    startCursor: start,
  } = data.viewer.repositories.pageInfo;
  if (hasNextPage) {
    result["nextPageParams"] = {
      after: end,
    };
  }
  if (hasPreviousPage) {
    result["prevPageParams"] = {
      before: start,
    };
  }
  return result;
};

const generatePathMapper = async (
  dependencies: IModuleDependencies,
  repoName: string,
  pathMapper: any,
  expressionPreffix: string,
  yamlFilePath: string,
  directoryCountPath: string,
  contentDetailsPath: string,
) => {
  const getMultiplePathRepoContentsMapper: Record<string, string> = {};
  const idToPathMapper: Record<string, string> = {};
  const { util, apolloService, graphQlQuery } = dependencies;
  const pathMapperKeys = Object.keys(pathMapper);
  for (let i = 0; i < pathMapperKeys.length; i++) {
    const k = pathMapperKeys[i];
    const value = pathMapper[k] as IContentDetails;
    if (value.type === "tree") {
      const token = util.randomTokenGenerator("object");
      idToPathMapper[token] = value.name;
      getMultiplePathRepoContentsMapper[token] =
        `${expressionPreffix}${value.name}`;
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
  if (Object.keys(getMultiplePathRepoContentsMapper).length > 0) {
    const objectChunks = util.buildObjectChunk(
      getMultiplePathRepoContentsMapper,
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
            // writeFileSync(
            //   path.join(
            //     __dirname,
            //     `${contentDetailsPath}/${idToPathMapper[token]}.json`,
            //   ),
            //   JSON.stringify(repository[token].entries),
            // );
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

const getActiveWebhooks = async (apolloService: HttpService, name: string, owner: string) => {
  const data = await apolloService.get(`https://api.github.com/repos/${owner}/${name}/hooks`, {}, false);
  return data.map(d => ({
    type: d.type,
    active: d.active,
    contentType: d.config.content_type,
    updatedAt: d.updated_at,
    createdAt: d.created_at,
    deliveriesUrl: d.deliveries_url,
    events: d.events
  }));
}

const postProcessScanRepository = async (dependencies: IModuleDependencies, identifier: string, repoName: string, login: string, directoryRelativePath: string, directoryCountPath: string, directoryCountRelativePath: string,yamlFilePath: string) => {
  const { apolloService, logger, graphQlQuery } = dependencies;
  let fileName, fileText;
  const activeWebHooks = await getActiveWebhooks(apolloService, repoName, login);
  if(existsSync(yamlFilePath)) {
    const data = readFileSync(yamlFilePath, "utf-8");
    const {
      data: {
        repositoryOwner: {
          repository: {
            object: { text },
          },
        },
      },
      errors: fileEntryErrors,
    } = await apolloService.request(
      "",
      graphQlQuery.getFileContent(repoName, login, data),
    );
    fileName = data;
    fileText = text;
    }
  let totalCount = 0;
  const files = await readdir(directoryCountRelativePath);
  files.forEach((file) => {
    const { count } = JSON.parse(
      readFileSync(
        path.join(__dirname, `${directoryCountPath}/${file}`),
        "utf-8",
      ),
    );
    totalCount = totalCount + count;
  });

  // Asynchronously remove the files
  rmdirSync(directoryRelativePath, { recursive: true });
  logger.info(`Removed all related files for job-id: ${identifier}`);

  return {
    totalCount,
    text: fileText,
    data: fileName,
    activeWebHooks
  }
}

const scanRepositoryByName = async (
  dependencies: IModuleDependencies,
  name: string,
  workerThreadEnabled: boolean,
  response?: Response,
) => {
  const { apolloService, logger, graphQlQuery, util } = dependencies;
  const identifier = util.randomTokenGenerator("", 12);
  logger.info(`Starting Scanning for repo: ${name}, job-id: ${identifier}`);
  const directoryPath = `../../../output/${identifier}`;
  const contentDetailsPath = `${directoryPath}/content`;
  const directoryCountPath = `${directoryPath}/count`;
  const directoryRelativePath = path.join(__dirname, directoryPath);
  mkdirSync(directoryRelativePath);
  const directoryCountRelativePath = path.join(__dirname, directoryCountPath);
  mkdirSync(directoryCountRelativePath);
  const directoryContentRelativePath = path.join(__dirname, contentDetailsPath);
  mkdirSync(directoryContentRelativePath);
  const yamlFilePath = path.join(__dirname, `${directoryPath}/yaml.txt`);
  const { data: basicData, errors: basicDataErrors } =
    await apolloService.request(
      "",
      graphQlQuery.getRepositoryBasicDetails(name),
    );
  if (response) {
    apolloService.errorHandler(basicDataErrors, response);
  }
  const {
    viewer: {
      login,
      repository: {
        name: repoName,
        diskUsage,
        nameWithOwner,
        isPrivate,
        defaultBranchRef: { name: branchName },
      },
    },
  } = basicData;

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
  apolloService.errorHandler(defaultBranchErrors, response);
  entries.forEach((entry: IContentDetails) => {
    pathMapper[branchName].contents[entry.name] = entry;
  });
  writeFileSync(
    path.join(__dirname, `${directoryCountPath}/${branchName}_count.json`),
    JSON.stringify({
      count: entries.filter((e) => e.type === "blob").length,
    }),
  );
  if (workerThreadEnabled) {
    const worker = new Worker(
      path.join(__dirname, "../../worker/scan-repo.worker.ts"),
      {
        workerData: {
          path: "./scan-repo.worker.js",
          environment: process.env.NODE_ENV,
          branchName,
          repoName,
          yamlFilePath,
          directoryCountPath,
          contentDetailsPath,
        },
        execArgv: ["--require", "ts-node/register"],
      },
    );
    return new Promise((resolve, reject) => {
      worker.on("message", async (value) => {
        const pathMapper = value;
        const { totalCount, text, data, activeWebHooks } = await postProcessScanRepository(dependencies, identifier, repoName, login, directoryRelativePath, directoryCountPath, directoryCountRelativePath, yamlFilePath);
        resolve({
          defaultBranch: branchName,
          owner: nameWithOwner,
          diskUsage,
          isPrivate,
          totalCount,
          activeWebHooks,
          // fileTree: pathMapper,
          content: {
            fileName: data,
            text,
          },
        });
      });
      worker.on("error", (err) => {
        logger.error(err);
        reject(err);
      });
    });
  } 

  await generatePathMapper(
    dependencies,
    repoName,
    pathMapper[branchName].contents,
    `${branchName}:`,
    yamlFilePath,
    directoryCountPath,
    contentDetailsPath,
  );
  const { totalCount, text, data, activeWebHooks } = await postProcessScanRepository(dependencies, identifier, repoName, login, directoryRelativePath, directoryCountPath, directoryCountRelativePath, yamlFilePath)
  return {
    defaultBranch: branchName,
    owner: nameWithOwner.replace(`/${repoName}`, ""),
    diskUsage,
    isPrivate,
    totalCount,
    activeWebHooks,
    // fileTree: pathMapper,
    content: {
      fileName: data,
      text,
    },
  };
};

const getAllRepositoryList = ({
  apolloService,
  logger,
  graphQlQuery,
}: IModuleDependencies) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { first, after, before } = request.body;
      const { data, errors } = await apolloService.request(
        "",
        graphQlQuery.getRepositories(first, after, before),
      );
      if (errors) {
        return response.status(HttpStatus.BAD_REQUEST).json(errors);
      }
      const result = formatAllRepositoryResult(data);
      return response.status(HttpStatus.OK).jsonp(result);
    } catch (error) {
      logger.error(error);
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.data });
    }
  };
};

const getRepositoryByName = (dependencies: IModuleDependencies, newVersion = false) => {
  const { logger } = dependencies;
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name } = request.params;
      const result = await scanRepositoryByName(dependencies, name, newVersion, response);
      return response.status(HttpStatus.OK).json(result);
    } catch (error) {
      logger.error(error);
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.data });
    }
  };
};

export {
  scanRepositoryByName,
  formatAllRepositoryResult,
  getRepositoryByName,
  getAllRepositoryList,
  getActiveWebhooks
};
