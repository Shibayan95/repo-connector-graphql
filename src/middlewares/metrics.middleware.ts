import { Response, Request, NextFunction } from "express";
import { Utils } from "src/lib/util.lib";
import { Logger } from "winston";

export const metricsMiddleware = (logger: Logger, util: Utils) => {
    return (request: Request, response: Response, next: NextFunction) => {
        const time = process.hrtime();
        response.on('finish', () => {
            logger.info(`Url: (${request.url === '/' && request.method === 'POST' ? '/graphql' : request.url}) Method:(${request.method}) ResponseTime (${util.processingTime(
                process.hrtime(time),
              )})`);
          });
        next()
    }
}