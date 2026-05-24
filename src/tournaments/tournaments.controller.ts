import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    Query,
    Patch,
    BadRequestException,
    Delete,
} from "@nestjs/common";
import { TournamentsService } from "./tournaments.service";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TournamentStatus } from "@prisma/client";
import { RequestWithUser } from "src/users/types/user";

@Controller("tournaments")
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: RequestWithUser, @Body() dto: CreateTournamentDto) {
        return this.tournamentsService.create(req.user.id, dto);
    }

    @Get()
    findAll(
        @Query("categoryId") categoryId?: string,
        @Query("status") status?: TournamentStatus,
        @Query("search") search?: string,
        @Query("organizerId") organizerId?: string,
    ) {
        return this.tournamentsService.findAll({ categoryId, status, search, organizerId });
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.tournamentsService.getById(id);
    }

    @Get(":id/standings")
    async getStandings(@Param("id") tournamentId: string) {
        return this.tournamentsService.getTournamentStandings(tournamentId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(":id/start")
    async startTournament(@Req() req: RequestWithUser, @Param("id") tournamentId: string) {
        return this.tournamentsService.startTournament(req.user.id, tournamentId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch("matches/:matchId/score")
    async updateMatchScore(
        @Req() req: RequestWithUser,
        @Param("matchId") matchId: string,
        @Body() body: { scoreA: number; scoreB: number },
    ) {
        if (body.scoreA === undefined || body.scoreB === undefined) {
            throw new BadRequestException("Необхідно передати scoreA та scoreB");
        }

        return this.tournamentsService.updateMatchScore(
            req.user.id,
            matchId,
            body.scoreA,
            body.scoreB,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/leave/:teamId')
    async leaveTournament(
        @Req() req: RequestWithUser,
        @Param('id') tournamentId: string,
        @Param('teamId') teamId: string,
    ) {
        return this.tournamentsService.leaveTournament(req.user.id, tournamentId, teamId);
    }
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteTournament(
        @Req() req: RequestWithUser,
        @Param('id') tournamentId: string
    ) {
        return this.tournamentsService.deleteTournament(req.user.id, tournamentId);
    }

    
}
