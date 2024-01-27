import { AppConfig } from "./config.lib";
import { randomBytes } from "crypto";

export class Utils {
  private readonly chunkSize: number;
  constructor(appConfig: AppConfig) {
    this.chunkSize = appConfig.get("CHUNK_SIZE");
  }

  processingTime = (hrtime: [number, number], precision = 3): string => {
    return `${hrtime[0]}.${hrtime[1].toString().substring(0, precision)}s`;
  };
  buildChunk = (data: Array<any>, size = this.chunkSize): any[][] => {
    return data.reduce((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / size);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []; // start a new chunk
      }

      resultArray[chunkIndex].push(item);

      return resultArray;
    }, []);
  };

  randomTokenGenerator(prefix: string, bytes: number = 8): string {
    let randomString = randomBytes(bytes).toString("hex");
    randomString = `${prefix}${randomString}`;
    return randomString;
  }
}
