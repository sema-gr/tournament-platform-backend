import { IsString, IsEnum, IsUUID, IsOptional, IsNumber, IsDateString } from "class-validator";
import { TournamentFormat } from "@prisma/client";

export class CreateTournamentDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    maxTeams!: number;

    @IsDateString()
    startDate!: string;

    @IsOptional()
    @IsEnum(TournamentFormat)
    format!: TournamentFormat;

    @IsUUID()
    categoryId!: string;
}
