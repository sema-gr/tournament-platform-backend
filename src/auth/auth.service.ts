import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import * as nodemailer from "nodemailer";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
    private transporter;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException("Користувач з таким Email вже існує");
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        await this.prisma.pendingUser.upsert({
            where: { email: dto.email },
            update: {
                name: dto.name,
                password: hashedPassword,
                role: dto.role || "PLAYER",
                organizationName: dto.organizationName,
                code: verificationCode,
                createdAt: new Date(),
            },
            create: {
                email: dto.email,
                name: dto.name,
                password: hashedPassword,
                role: dto.role || "PLAYER",
                organizationName: dto.organizationName,
                code: verificationCode,
            },
        });

        try {
            await this.transporter.sendMail({
                from: `"SportTeam Platform" <${process.env.SMTP_USER}>`,
                to: dto.email,
                subject: "Код підтвердження реєстрації SportTeam",
                html: `
                    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="text-align: center; color: #0f172a;">SportTeam Platform</h2>
                        <p style="color: #475569; font-size: 16px;">Вітаємо, ${dto.name}! Ваш код для підтвердження реєстрації:</p>
                        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a; margin: 20px 0; border-radius: 8px;">
                            ${verificationCode}
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Код дійсний для поточної сесії реєстрації.</p>
                    </div>
                `,
            });
        } catch (error) {
            console.error("Помилка відправки листа:", error);
            throw new BadRequestException("Не вдалося відправити лист на вказану пошту");
        }

        return {
            status: "success",
            message: "Код підтвердження надіслано на вашу пошту",
        };
    }

    async verifyCode(email: string, code: string) {
        const pendingUser = await this.prisma.pendingUser.findUnique({
            where: { email },
        });

        if (!pendingUser) {
            throw new BadRequestException("Запит на реєстрацію не знайдено або застарів");
        }

        if (pendingUser.code !== code) {
            throw new BadRequestException("Невірний код підтвердження");
        }

        let generatedUsername = pendingUser.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
        const existingUsername = await this.prisma.user.findUnique({
            where: { username: generatedUsername },
        });

        if (existingUsername) {
            generatedUsername = `${generatedUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const user = await this.prisma.user.create({
            data: {
                name: pendingUser.name,
                email: pendingUser.email,
                username: generatedUsername,
                password: pendingUser.password,
                role: pendingUser.role,
                organizationName: pendingUser.organizationName,
                isApprovedOrganizer: false,
                organizerStatus: pendingUser.role === "ORGANIZER" ? "PENDING" : "PENDING",
                stats: pendingUser.role === "PLAYER" ? { create: {} } : undefined,
            },
        });

        await this.prisma.pendingUser.delete({
            where: { email },
        });

        const token = this.jwtService.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            organizerStatus: user.organizerStatus,
        });

        return {
            status: "success",
            message: "Акаунт успішно активовано",
            data: {
                token,
                user: { id: user.id, email: user.email, username: user.username, role: user.role },
            },
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) throw new UnauthorizedException("Невірний email або пароль");

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException("Невірний email або пароль");

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
                user: { id: user.id, email: user.email, username: user.username, role: user.role },
            },
        };
    }
}
