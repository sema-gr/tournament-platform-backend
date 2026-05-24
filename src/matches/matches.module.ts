import { Module } from "@nestjs/common";
import { MatchesController } from "./matches.controller";
import { PrismaService } from "src/prisma/prisma.service";
import { MatchesService } from "./matches.service";

@Module({
    controllers: [MatchesController],
    providers: [MatchesService, PrismaService],
})
export class MatchesModule {}
