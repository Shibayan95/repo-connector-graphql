import { IModuleDependencies } from "../../types";
import { formatAllRepositoryResult, getActiveWebhooks, scanRepositoryByName } from ".";

const Resolver = {
  Query: {
    getRepositories: async (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      const { apolloService, graphQlQuery } = contextValue;
      const { first, after, before } = args;
      const { data } = await apolloService.request(
        "",
        graphQlQuery.getRepositories(first, after, before),
      );
      return formatAllRepositoryResult(data);
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
    scanRepository: async (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      const { name } = args;
      const data = await scanRepositoryByName(contextValue, name, false);
      return data;
    },

    scanRepositoryV2: async (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      const { name } = args;
      const data = await scanRepositoryByName(contextValue, name, true);
      return data;
    },
    getActiveWebhooks: async (
      parent,
      args,
      contextValue: IModuleDependencies,
      info,
    ) => {
      const { name, owner } = args;
      const { apolloService } = contextValue;
      return getActiveWebhooks(apolloService, name, owner)
    }
  },
};

export default Resolver;
