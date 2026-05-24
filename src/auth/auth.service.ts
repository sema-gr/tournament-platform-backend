import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        console.log("Received registration data:", dto);

        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingEmail) {
            throw new ConflictException("Користувач з таким Email вже існує");
        }

        let generatedUsername = dto.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");

        const existingUsername = await this.prisma.user.findUnique({
            where: { username: generatedUsername },
        });

        if (existingUsername) {
            generatedUsername = `${generatedUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                username: generatedUsername,
                password: hashedPassword,
                role: dto.role || "PLAYER",
                organizationName: dto.organizationName,
                stats: dto.role === "PLAYER" || !dto.role ? { create: {} } : undefined,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                organizerStatus: true,
            },
        });

        const token = this.jwtService.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            organizerStatus: user.organizerStatus,
        });

        return {
            status: "success",
            message: "Користувача успішно зареєстровано",
            data: {
                token,
                user,
            },
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException("Невірний email або пароль");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Невірний email або пароль");
        }

        const token = this.jwtService.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            organizerStatus: user.organizerStatus,
        });

        return {
            status: "success",
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                },
            },
        };
    }
}
