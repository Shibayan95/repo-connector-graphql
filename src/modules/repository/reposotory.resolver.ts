import { IModuleDependencies } from "../../types";
import {
  getRepositoryListQueries,
  scanAllRepositoriesLogic,
  scanRepositoryByName,
} from ".";

const Resolver = {
  Query: {
    getRepositories: (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      return getRepositoryListQueries(contextValue);
    },
    getRepositoryBasicDetails: async (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      const { apolloService, graphQlQuery } = contextValue;
      const { name } = args;
      const { data } = await apolloService.request(
        "",
        graphQlQuery.getRepositoryBasicDetails(name),
      );
      return data;
    },
    scanRepository: (parent, args, contextValue: IModuleDependencies, info) => {
      const { name } = args;
      return scanRepositoryByName(contextValue, name);
    },
    scanAllRepository: (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      return scanAllRepositoriesLogic(contextValue);
    },
  },
};

export default Resolver;
