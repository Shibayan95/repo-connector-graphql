import { WriteStream, createWriteStream } from "fs";
import * as path from "path";
import { AppConfig } from "./config.lib";

export class GraphQlQuery {
  private readonly logStream: WriteStream;
  constructor(appConfig: AppConfig) {
    this.logStream = createWriteStream(
      path.join(__dirname, `../../${appConfig.get("QUERY_LOG_FILE")}.txt`),
    );
  }

  getLogin = () => {
    const query = `query Query {
      viewer {
        login
      }
    }`;
    this.logStream.write(`getLogin: ${query}\n`);
    return {
      operationName: "Query",
      variables: {},
      query,
    };
  };

  getRepositoryCount = (login: string) => {
    const query = `query Query($login: String!) {
      repositoryOwner(login: $login) {
        repositories {
            totalCount
          }
      }
    }`;
    this.logStream.write(`getLogin: ${query}\n`);
    return {
      operationName: "Query",
      variables: { login },
      query,
    };
  };

  getRepositoriesList = (first: number) => {
    const query = `query getRepositoriesList($first: Int) {
      viewer {
        repositories(first: $first, affiliations: OWNER) {
          nodes {
            createdAt
            diskUsage
            name
            nameWithOwner
          }
        }
      }
    }`;
    this.logStream.write(`getRepositoriesList: ${query}\n`);
    return {
      operationName: "getRepositoriesList",
      variables: { first },
      query,
    };
  };

  getRepositoryBasicDetails = (name: string) => {
    const query = `query getRepositoryBasicDetails($name: String!){
      viewer {
        login
        repository(name: $name) {
          name
          diskUsage
          nameWithOwner
          isPrivate
          defaultBranchRef {
            name
          }
        }
      }
    }`;
    this.logStream.write(`getRepositoryBasicDetails: ${query}\n`);
    return {
      operationName: "getRepositoryBasicDetails",
      variables: { name },
      query,
    };
  };

  getRepositoryBasicDetailsBatch = (nameMap: Record<string, string>) => {
    const query = `query getRepositoryBasicDetails{
      viewer {
        login
        ${Object.keys(nameMap)
          .map(
            (k) => `
        ${k}: repository(name: "${nameMap[k]}") {
          name
          diskUsage
          nameWithOwner
          isPrivate
          defaultBranchRef {
            name
          }
        }
        `,
          )
          .join("")}
      }
    }`;
    this.logStream.write(`getRepositoryBasicDetails: ${query}\n`);
    return {
      operationName: "getRepositoryBasicDetails",
      variables: {},
      query,
    };
  };

  getRepoBranchContents = (name: string, expression: string) => {
    const query = `query getRepoBranchContents($name: String!, $expression: String!) {
      viewer {
        repository(name: $name) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Blob {
                    byteSize
                    isBinary
                  }
                }
                size
              }
            }
          }
        }
      }
    }`;
    this.logStream.write(`getRepoBranchContents: ${query}\n`);
    return {
      operationName: "getRepoBranchContents",
      variables: { name, expression },
      query,
    };
  };

  getFileContent = (name: string, login: string, expression: string) => {
    const query = `query getFileContent($login: String!, $name: String!, $expression: String!) {
      repositoryOwner(login: $login) {
        repository(name: $name) {
          object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    }`;
    this.logStream.write(`getFileContent: ${query}\n`);
    return {
      operationName: "getFileContent",
      variables: { name, login, expression },
      query,
    };
  };

  getMultiplePathRepoContents = (
    name: string,
    pathMap: Record<string, string>,
  ) => {
    const query = `query getRepoBranchContents($name: String!) {
        viewer {
          repository(name: $name) {
            ${Object.keys(pathMap)
              .map(
                (k) => `
                ${k}: object(expression:"${pathMap[k]}") {
                  ... on Tree {
                    entries {
                      name
                      type
                      size
                    }
                  }
                }
              `,
              )
              .join("")}
          }
        }
      }`;
    this.logStream.write(`getMultiplePathRepoContents: ${query}\n`);
    return {
      operationName: "getRepoBranchContents",
      variables: { name },
      query,
    };
  };
}
