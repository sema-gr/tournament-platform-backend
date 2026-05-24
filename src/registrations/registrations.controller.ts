import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Req,
    Patch,
    BadRequestException,
} from "@nestjs/common";
import { RegistrationsService } from "./registrations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequestWithUser } from "src/users/types/user";

@Controller("registrations")
export class RegistrationsController {
    constructor(private readonly regService: RegistrationsService) {}

    @UseGuards(JwtAuthGuard)
    @Post(":tournamentId/apply")
    async apply(
        @Req() req: RequestWithUser,
        @Param("tournamentId") tournamentId: string,
        @Body("teamId") teamId: string,
    ) {
        return this.regService.applyForTournament(req.user.id, tournamentId, teamId);
    }

    @Get("tournament/:tournamentId")
    async getApps(@Param("tournamentId") tournamentId: string) {
        return this.regService.getTournamentApplications(tournamentId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(":id/status")
    async updateStatus(
        @Req() req: RequestWithUser,
        @Param("id") registrationId: string,
        @Body("status") status: "APPROVED" | "REJECTED",
    ) {
        if (!["APPROVED", "REJECTED"].includes(status)) {
            throw new BadRequestException("Некоректний статус. Дозволено: APPROVED або REJECTED");
        }

        return this.regService.updateStatus(req.user.id, registrationId, status);
    }

    @Get("team/:teamId")
    async getTeamApps(@Param("teamId") teamId: string) {
        return this.regService.getTeamApplications(teamId);
    }
}
