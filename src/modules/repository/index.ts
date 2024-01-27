import { Request, Response, NextFunction } from "express";
import { HttpStatus, IContentDetails, IModuleDependencies } from "../../types";
import { HttpService } from "../../lib/http.lib";

const generatePathMapperV2 = async (
  dependencies: IModuleDependencies,
  repoName: string,
  allChildren: Record<any, any>,
  level: number,
  yamlFileDetails: {
    fileName?: string;
    expression?: string;
  } = {},
) => {
  const getMultiplePathRepoContentsMapper: Record<string, string> = {};
  const idToPathMapper: Record<string, string> = {};
  const { util, apolloService, graphQlQuery } = dependencies;
  const pathMapperKeys = Object.keys(allChildren[level]);
  for (let i = 0; i < pathMapperKeys.length; i++) {
    const k = pathMapperKeys[i];
    const value = allChildren[level][k] as IContentDetails;
    if (value.type === "tree") {
      const token = util.randomTokenGenerator("object");
      idToPathMapper[token] = value.name;
      getMultiplePathRepoContentsMapper[token] =
        `${value.expressionPreffix}${value.name}`;
    } else {
      const fileDetails = value.name.split(".");
      if (
        fileDetails[fileDetails.length - 1] === "yml" &&
        Object.keys(yamlFileDetails).length === 0
      ) {
        yamlFileDetails["fileName"] = value.name;
        yamlFileDetails["expression"] =
          `${value.expressionPreffix}${value.name}`;
      }
    }
  }
  if (Object.keys(getMultiplePathRepoContentsMapper).length > 0) {
    const { data, errors: defaultBranchErrors } = await apolloService.request(
      "",
      graphQlQuery.getMultiplePathRepoContents(repoName, getMultiplePathRepoContentsMapper),
    )

    if (data && data.viewer && data.viewer.repository) {
        const {
          viewer: { repository },
        } = data;
        level = level + 1;
        allChildren[level] = {};
        const keys = Object.keys(idToPathMapper);
        for (let i = 0; i < keys.length; i++) {
          const token = keys[i];
          if (repository[token] && repository[token].entries) {
            repository[token].entries.map((entry: IContentDetails) => {
              allChildren[level][entry.name] = {
                ...entry,
                expressionPreffix: `${getMultiplePathRepoContentsMapper[token]}/`,
              };
            });
          }
        }
        await generatePathMapperV2(
          dependencies,
          repoName,
          allChildren,
          level,
          yamlFileDetails,
        );
      }
  }
  return yamlFileDetails;
};

const getActiveWebhooks = async (
  apolloService: HttpService,
  name: string,
  owner: string,
) => {
  const data = await apolloService.get(
    `https://api.github.com/repos/${owner}/${name}/hooks`,
    {},
    false,
  );
  return data.map((d) => ({
    type: d.type,
    active: d.active,
    contentType: d.config.content_type,
    updatedAt: d.updated_at,
    createdAt: d.created_at,
    deliveriesUrl: d.deliveries_url,
    events: d.events,
  }));
};

const scanRepositoryByNameAfterBasicDetailsFetch = async (
  dependencies: IModuleDependencies,
  basicData: any,
  response?: Response,
) => {
  const { apolloService, graphQlQuery } = dependencies;
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

  const level = 1;

  const allChildren: Record<any, any> = {
    [level]: {},
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
  if(response) {
    apolloService.errorHandler(defaultBranchErrors, response);
  }
  entries.forEach((entry: IContentDetails) => {
    allChildren[level][entry.name] = {
      ...entry,
      expressionPreffix: `${branchName}:`,
    };
  });

  const yamlFileDetails = await generatePathMapperV2(
    dependencies,
    repoName,
    allChildren,
    level,
  );

  let totalFileCount = 0;

  Object.keys(allChildren).forEach((contents) => {
    Object.keys(allChildren[contents]).forEach((content) => {
      if (allChildren[contents][content].type !== "tree") {
        totalFileCount++;
      }
    });
  });
  const promises = [getActiveWebhooks(apolloService, repoName, login)];

  let yamlFileText;
  let yamlFileName;

  if (yamlFileDetails.expression && yamlFileDetails.fileName) {
    const { expression, fileName } = yamlFileDetails;
    yamlFileName = fileName;
    promises.push(
      apolloService.request(
        "",
        graphQlQuery.getFileContent(repoName, login, expression),
      ),
    );
  }

  const results = await Promise.all(promises);

  if (results.length > 1) {
    const {
      data: {
        repositoryOwner: {
          repository: {
            object: { text },
          },
        },
      },
      errors: fileEntryErrors,
    } = results[1];
    yamlFileText = text;
  }

  return {
    defaultBranch: branchName,
    owner: nameWithOwner.replace(`/${repoName}`, ""),
    diskUsage,
    isPrivate,
    totalCount: totalFileCount,
    activeWebHooks: results[0].length > 0 ? results[0] : null,
    content: yamlFileName ? {
      fileName: yamlFileName,
      text: yamlFileText,
    } : null,
  };
};

const scanRepositoryByName = async (
  dependencies: IModuleDependencies,
  name: string,
  response?: Response,
) => {
  const { apolloService, graphQlQuery } = dependencies;
  const { data: basicData, errors } =
    await apolloService.request(
      "",
      graphQlQuery.getRepositoryBasicDetails(name),
    );
  const {
    viewer: {
      repository,
    },
  } = basicData;
  if(!repository) {
    return null;
  }

  const {
    name: repoName,
    diskUsage,
    nameWithOwner,
    isPrivate,
    defaultBranchRef,
  } = repository;

  if (!defaultBranchRef) {
    return {
      owner: nameWithOwner.replace(`/${repoName}`, ""),
      diskUsage,
      isPrivate,
    };
  }
  return scanRepositoryByNameAfterBasicDetailsFetch(
    dependencies,
    basicData,
    response,
  );
};

const getRepositoryListQueries = async (
  dependencies: IModuleDependencies,
  response?: Response,
) => {
  const { apolloService, graphQlQuery } = dependencies;
  const {
    data: {
      viewer: { login },
    },
    errors: loginErrors,
  } = await apolloService.request("", graphQlQuery.getLogin());
  if (response) {
    apolloService.errorHandler(loginErrors, response);
  }

  const {
    data: {
      repositoryOwner: {
        repositories: { totalCount },
      },
    },
    errors: repositoryCountErrors,
  } = await apolloService.request("", graphQlQuery.getRepositoryCount(login));
  if (response) {
    apolloService.errorHandler(repositoryCountErrors, response);
  }
  const { data, errors } = await apolloService.request(
    "",
    graphQlQuery.getRepositoriesList(totalCount),
  );
  if (response) {
    apolloService.errorHandler(repositoryCountErrors, response);
  }
  return data.viewer.repositories.nodes.map((node) => node);
};

const getAllRepositoryList = (dependencies: IModuleDependencies) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    const { logger } = dependencies;
    try {
      const result = await getRepositoryListQueries(dependencies, response);
      return response.status(HttpStatus.OK).jsonp(result);
    } catch (error) {
      logger.error(error);
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.data });
    }
  };
};

const getRepositoryByName = (dependencies: IModuleDependencies) => {
  const { logger } = dependencies;
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name } = request.params;
      const result = await scanRepositoryByName(dependencies, name, response);
      return response.status(HttpStatus.OK).json(result);
    } catch (error) {
      logger.error(error);
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.data });
    }
  };
};

const transformScanRepositoryForBatch = async (
  token: string,
  dependencies: IModuleDependencies,
  basicData: any,
  response?: Response,
) => {
  const data = await scanRepositoryByNameAfterBasicDetailsFetch(
    dependencies,
    basicData,
    response,
  );
  return {
    token,
    data,
  };
};

const scanAllRepositoriesLogic = async (
  dependencies: IModuleDependencies,
  response?: Response,
) => {
  const { util, graphQlQuery, apolloService } = dependencies;
  const allRepositories = await getRepositoryListQueries(
    dependencies,
    response,
  );
  const allTokenToNameMap: Record<string, string> = {};
  const repositoryListDetails = {};
  const repositoryBasicDetails = {};
  const results = [];
  const validRepositoriesTokens = [];
  allRepositories.forEach((r) => {
    const token = util.randomTokenGenerator("repo");
    allTokenToNameMap[token] = r.name;
    repositoryListDetails[token] = { ...r };
  });
  const {
    data: { viewer },
  } = await apolloService.request(
    "",
    graphQlQuery.getRepositoryBasicDetailsBatch(allTokenToNameMap),
  );
  const login = viewer.login;
  delete viewer.login;
  Object.keys(viewer).map((k) => {
    repositoryBasicDetails[k] = viewer[k];
    if (viewer[k] && viewer[k].defaultBranchRef) {
      validRepositoriesTokens.push(k);
    } else {
      if (repositoryBasicDetails[k]) {
        const owner = repositoryBasicDetails[k].nameWithOwner.replace(
          `/${repositoryBasicDetails[k].name}`,
          "",
        );
        delete repositoryBasicDetails[k].nameWithOwner;
        repositoryBasicDetails[k].owner = owner;
      }
      results.push({
        ...repositoryListDetails[k],
        scanDetails: repositoryBasicDetails[k],
      });
    }
  });
  const validRepositoriesTokenChunks = util.buildChunk(validRepositoriesTokens);

  for (let i = 0; i < validRepositoriesTokenChunks.length; i++) {
    const validRepositoriesTokenChunk = validRepositoriesTokenChunks[i];
    const result = await Promise.all(
      validRepositoriesTokenChunk.map((token) => {
        const basicData = {
          viewer: {
            login,
            repository: { ...repositoryBasicDetails[token] },
          },
        };
        return transformScanRepositoryForBatch(
          token,
          dependencies,
          basicData,
          response,
        );
      }),
    );
    result.forEach(({ token, data }) => {
      results.push({
        ...repositoryListDetails[token],
        scanDetails: data,
      });
    });
  }
  return results;
};

const scanAllRepositories = (dependencies: IModuleDependencies) => {
  const { logger } = dependencies;
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const results = await scanAllRepositoriesLogic(dependencies, response);
      return response.status(HttpStatus.OK).json(results);
    } catch (error) {
      logger.error(error);
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.data });
    }
  };
};

export {
  getRepositoryListQueries,
  scanRepositoryByName,
  getRepositoryByName,
  getAllRepositoryList,
  getActiveWebhooks,
  scanAllRepositories,
  scanAllRepositoriesLogic,
};
