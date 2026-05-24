import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "src/auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
    imports: [AuthModule],
    controllers: [AdminController],
    providers: [AdminService, PrismaService],
    exports: []
})
export class AdminModule {}
