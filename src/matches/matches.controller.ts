import { Controller, Post, Param, UseGuards, Req, Body, Patch, Get, Query } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequestWithUser } from "src/users/types/user";
import { GetMatchesDto } from "./dto/get-matches.dto";

@Controller("matches")
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) {}

    @UseGuards(JwtAuthGuard)
    @Post("tournament/:id/generate")
    async generate(@Req() req: RequestWithUser, @Param("id") tournamentId: string) {
        return this.matchesService.generateSingleElimination(req.user.id, tournamentId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(":id/result")
    async updateResult(
        @Req() req: RequestWithUser,
        @Param("id") matchId: string,
        @Body() body: { scoreA: number; scoreB: number },
    ) {
        return this.matchesService.updateMatchResult(
            req.user.id,
            matchId,
            body.scoreA,
            body.scoreB,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get("my")
    async getMyMatches(@Req() req: RequestWithUser) {
        return this.matchesService.getMyMatches(req.user.id);
    }

    @Get()
    async getAllMatches(@Query() query: GetMatchesDto) {
        return this.matchesService.getAllMatches(query);
    }
}
