import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../types";

export class Validator {
  validate(DtoClass: any, key: "body" | "params") {
    return async (request: Request, response: Response, next: NextFunction) => {
      const validateClass = new DtoClass();
      const keys = request[key] ? Object.keys(request[key]) : [];
      keys.forEach((k) => {
        validateClass[k] = request[key][k];
      });
      const errors = await validate(validateClass);
      if (errors.length) {
        const message = errors.map((e) => e.constraints);
        return response.status(HttpStatus.BAD_REQUEST).json({
          message,
        });
      }
      next();
    };
  }
}
