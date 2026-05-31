import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '@prisma/client';

export class GetMatchesDto {
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
    teamName?: string;

    @IsOptional()
    @IsEnum(MatchStatus)
    status?: MatchStatus;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;
}