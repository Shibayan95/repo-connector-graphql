import { AppConfig } from "./config.lib";
import { createLogger, format, transports, Logger } from "winston";
import * as moment from "moment";

export class LoggerLib {
  private readonly winstonLogger: Logger;
  constructor(appConfig: AppConfig) {
    this.winstonLogger = this.init(appConfig);
  }

  private init(appConfig: AppConfig): Logger {
    return createLogger({
      level: appConfig.get("LOG_LEVEL"),
      format: format.combine(
        format.errors({ stack: true }),
        format.timestamp({
          format: () => moment().format("YYYY-MM-DD HH:mm:ss"),
        }),
        format.printf(
          ({ timestamp, level, message, stack }) =>
            `${timestamp} ${level.toUpperCase()} ${message}${
              stack ? `\n${stack}` : ""
            }`,
        ),
      ),
      transports: [new transports.Console()],
    });
  }

  logger() {
    return this.winstonLogger;
  }
}
