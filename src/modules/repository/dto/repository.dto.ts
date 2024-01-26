import { IsNumber, IsOptional, IsString } from "class-validator";

export class RepositoryListDto {
  @IsNumber()
  first: number;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  after?: string;
}

export class RepositoryDetailsDto {
  @IsString()
  name: string;
}
