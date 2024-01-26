import { Router } from "express";
import { IModuleDependencies } from "../types";
import { getRepositoryByName, getAllRepositoryList } from "./repository";
import { RepositoryListDto, RepositoryDetailsDto } from "./repository/dto/repository.dto";

export const routerModule = (dependencies: IModuleDependencies) => {
  const router = Router({ mergeParams: true });

  router.post(
    "/repository",
    dependencies.validator.validate(RepositoryListDto, "body"),
    getAllRepositoryList(dependencies),
  );

  router.get(
    "/repository/:name",
    dependencies.validator.validate(RepositoryDetailsDto, "params"),
    getRepositoryByName(dependencies),
  );

  router.get(
    "/v2/repository/:name",
    dependencies.validator.validate(RepositoryDetailsDto, "params"),
    getRepositoryByName(dependencies, true),
  );

  return router;
};
