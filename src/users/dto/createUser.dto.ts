import { Role } from "@prisma/client";

export interface CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: Role;
}
