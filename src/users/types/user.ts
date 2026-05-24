import { User as PrismaUser, Role } from "@prisma/client";
import { Request } from "express";

export type User = Omit<PrismaUser, "password">;

export interface RequestWithUser extends Request {
    user: {
        id: string;
        email: string;
        role: Role;
    };
}
