import { IsString } from "class-validator";

export class RepositoryDetailsDto {
  @IsString()
  name: string;
}
