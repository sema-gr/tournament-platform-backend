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
    Delete,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTeamDto } from "./dto/create-team.dto";
import { RequestWithUser } from "src/users/types/user";

@Controller("teams")
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Req() req: RequestWithUser, @Body() dto: CreateTeamDto) {
        return this.teamsService.createTeam(req.user.id, dto);
    }

    @Get("my-teams")
    @UseGuards(JwtAuthGuard)
    getMyTeams(@Req() req: RequestWithUser) {
        return this.teamsService.getTeamsByUserId(req.user.id);
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.teamsService.getTeamById(id);
    }

    @Get()
    findMany() {
        return this.teamsService.getTeams();
    }

    @UseGuards(JwtAuthGuard)
    @Post(":id/invites")
    async invitePlayer(
        @Req() req: RequestWithUser,
        @Param("id") teamId: string,
        @Body("userId") targetUserId: string,
    ) {
        return this.teamsService.invitePlayer(req.user.id, teamId, targetUserId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch("invites/:inviteId")
    async respondToInvitation(
        @Req() req: RequestWithUser,
        @Param("inviteId") inviteId: string,
        @Body("status") status: "ACCEPTED" | "REJECTED",
    ) {
        return this.teamsService.respondToInvitation(req.user.id, inviteId, status);
    }

    @UseGuards(JwtAuthGuard)
    @Post(":id/join-request")
    async requestToJoin(@Req() req: RequestWithUser, @Param("id") teamId: string) {
        return this.teamsService.requestToJoinTeam(req.user.id, teamId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(":id/join-requests")
    async getRequests(@Req() req: RequestWithUser, @Param("id") teamId: string) {
        return this.teamsService.getTeamJoinRequests(teamId, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch("join-requests/:requestId/status")
    async respondToRequest(
        @Req() req: RequestWithUser,
        @Param("requestId") requestId: string,
        @Body("status") status: "APPROVED" | "REJECTED",
    ) {
        if (!["APPROVED", "REJECTED"].includes(status)) {
            throw new BadRequestException("Некоректний статус. Дозволено: APPROVED або REJECTED");
        }
        return this.teamsService.respondToJoinRequest(req.user.id, requestId, status);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(":id/leave")
    async leaveTeam(@Req() req: RequestWithUser, @Param("id") teamId: string) {
        return this.teamsService.leaveTeam(req.user.id, teamId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(":id")
    async disbandTeam(@Req() req: RequestWithUser, @Param("id") teamId: string) {
        return this.teamsService.disbandTeam(req.user.id, teamId);
    }

    @UseGuards(JwtAuthGuard)
    @Get("invites/me")
    async getMyInvitations(@Req() req: RequestWithUser) {
        return this.teamsService.getUserInvitations(req.user.id);
    }
}
