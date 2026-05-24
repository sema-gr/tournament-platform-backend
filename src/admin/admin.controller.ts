import { Controller, Get, Patch, Param, UseGuards, Req, ForbiddenException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequestWithUser } from "src/users/types/user";

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    private checkAdminRole(req: RequestWithUser) {
        if (req.user.role !== "ADMIN") {
            throw new ForbiddenException("Доступ дозволено лише адміністраторам");
        }
    }

    @Get("stats")
    async getStats(@Req() req: RequestWithUser) {
        this.checkAdminRole(req);
        return this.adminService.getDashboardStats();
    }

    @Get("organizers/pending")
    async getPendingOrganizers(@Req() req: RequestWithUser) {
        this.checkAdminRole(req);
        return this.adminService.getPendingOrganizers();
    }

    @Patch("organizers/:id/approve")
    async approveOrganizer(@Req() req: RequestWithUser, @Param("id") userId: string) {
        this.checkAdminRole(req);
        return this.adminService.approveOrganizer(userId);
    }

    @Patch("organizers/:id/reject")
    async rejectOrganizer(@Req() req: RequestWithUser, @Param("id") userId: string) {
        this.checkAdminRole(req);
        return this.adminService.rejectOrganizer(userId);
    }
}
