import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { MatchesModule } from "./matches/matches.module";
import { TournamentsModule } from "./tournaments/tournaments.module";
import { TeamsModule } from "./teams/teams.module";
import { CategiriesModule } from "./categories/categories.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UsersModule,
        TeamsModule,
        TournamentsModule,
        MatchesModule,
        RegistrationsModule,
        CategiriesModule,
        NotificationsModule,
        AdminModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
