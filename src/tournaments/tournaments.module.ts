import { Module } from "@nestjs/common";
import { TournamentsService } from "./tournaments.service";
import { TournamentsController } from "./tournaments.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [PrismaModule, UsersModule],
    controllers: [TournamentsController],
    providers: [TournamentsService],
    exports: [TournamentsService],
})
export class TournamentsModule {}
