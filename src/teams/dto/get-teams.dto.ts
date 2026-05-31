import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";

export class GetTeamsDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    ownerName?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;
}
