import { IsOptional, IsString, IsEnum, IsInt } from "class-validator";
import { Type } from "class-transformer";
import { TournamentStatus } from "@prisma/client";

export class GetTournamentsDto {
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
    categoryId?: string;

    @IsOptional()
    @IsEnum(TournamentStatus)
    status?: TournamentStatus;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    organizerId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    maxTeams?: number;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;
}
