import { Router } from "express";
import { IModuleDependencies } from "../types";
import {
  getRepositoryByName,
  getAllRepositoryList,
  scanAllRepositories,
} from "./repository";
import { RepositoryDetailsDto } from "./repository/dto/repository.dto";

export const routerModule = (dependencies: IModuleDependencies) => {
  const router = Router({ mergeParams: true });

  router.get("/repository", getAllRepositoryList(dependencies));

  router.get(
    "/repository/:name",
    dependencies.validator.validate(RepositoryDetailsDto, "params"),
    getRepositoryByName(dependencies),
  );

  router.get("/scan-all-repository", scanAllRepositories(dependencies));

  return router;
};
