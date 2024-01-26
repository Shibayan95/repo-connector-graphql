import { config, DotenvConfigOutput } from "dotenv";
import * as path from "path";

export class AppConfig {
  private appConfig: DotenvConfigOutput = {};
  private readonly environment: string;
  constructor(environment: string) {
    this.environment = environment;
    this.init();
  }

  private init(): void {
    this.appConfig = config({
      path: path.join(__dirname, `../../${this.environment}.env`),
    });
  }

  get(key: string): any {
    return this.appConfig.parsed ? this.appConfig.parsed[key] : {};
  }
}
