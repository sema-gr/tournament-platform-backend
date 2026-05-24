import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";


@Module({
    controllers: [NotificationsController],
    providers: [NotificationsService, PrismaService],
})
export class NotificationsModule {}
