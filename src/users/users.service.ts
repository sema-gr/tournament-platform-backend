import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";
import { CreateUserDto } from "./dto/createUser.dto";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateUserDto): Promise<User> {
        return this.prisma.user.create({
            data,
        });
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    async findOne(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Partial<CreateUserDto>): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<User> {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}
