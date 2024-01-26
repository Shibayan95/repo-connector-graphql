import { Response } from "express";
import { HttpStatus } from "../types";

export class HttpService {
  private baseUrl: string;
  private globalheaders: any = {};
  constructor(baseUrl: string, globalheaders: HeadersInit) {
    this.baseUrl = baseUrl;
    this.globalheaders = { ...globalheaders, Accept: "application/json" };
  }

  async get(url: string, headers: any = {}, useBaseUrl = true) {
    const urlToBeSent = `${useBaseUrl ? `${this.baseUrl}/`: ''}${url}`;
    const resp = await fetch(urlToBeSent, {
      method: "GET",
      headers: { ...this.globalheaders, ...headers },
    });
    const data = await resp.json();
    return data;
  }

  async request(url: string, body: any): Promise<any> {
    const urlToBeSent = `${this.baseUrl}${url !== "" ? `/${url}` : ""}`;
    const resp = await fetch(urlToBeSent, {
      method: "POST",
      body: JSON.stringify(body),
      headers: this.globalheaders,
    });
    const data = await resp.json();
    return data;
  }

  errorHandler = (errors: any, response: Response) => {
    if (errors) {
      return response.status(HttpStatus.BAD_REQUEST).json(errors);
    }
  };
}
