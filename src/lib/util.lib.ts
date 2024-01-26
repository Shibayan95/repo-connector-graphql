import { AppConfig } from "./config.lib";
import { randomBytes } from "crypto";

export class Utils {
  private readonly chunkSize: number;
  constructor(appConfig: AppConfig) {
    this.chunkSize = appConfig.get("CHUNK_SIZE");
  }

  processingTime = (hrtime: [number, number], precision = 3): string => {
    return `${hrtime[0]}.${hrtime[1].toString().substring(0, precision)}s`;
  }
  buildChunk = (data: Array<any>, size = this.chunkSize): string[][] => {
    return data
      .map((_item, index) => data.slice(index * size, index * size + size))
      .filter((arr) => arr.length > 0);
  };

  buildObjectChunk = (data: any, size = this.chunkSize): Record<any, any>[] => {
    const result: Record<any, any>[] = [];
    const keys = this.buildChunk(Object.keys(data), size);
    keys.forEach((keyObject) => {
      const resp: Record<any, any> = {};
      keyObject.map((k) => {
        resp[k] = data[k];
      });
      result.push(resp);
    });
    return result;
  };

  randomTokenGenerator(prefix: string, bytes: number = 8): string {
    let randomString = randomBytes(bytes).toString("hex");
    randomString = `${prefix}${randomString}`;
    return randomString;
  }
}
