import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";

@Module({
    controllers: [TeamsController],
    providers: [TeamsService, PrismaService],
})
export class TeamsModule {}
