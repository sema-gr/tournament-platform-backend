import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ApplicationStatus, Role } from "@prisma/client";
import { Strategy, ExtractJwt } from "passport-jwt";
import { SECRET_KEY } from "src/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: SECRET_KEY,
        });
    }

    validate(payload: {
        id: string;
        email: string;
        role: Role;
        organizerStatus: ApplicationStatus;
    }): {
        id: string;
        email: string;
        role: Role;
        organizerStatus: ApplicationStatus;
    } {
        return {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            organizerStatus: payload.organizerStatus,
        };
    }
}
