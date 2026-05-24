import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from "class-validator";
import { Role } from "@prisma/client";

export class RegisterDto {
    @IsString()
    name!: string;

    @IsEmail({}, { message: "Некоректний формат email" })
    email!: string;

    @IsOptional()
    @IsString()
    @MinLength(3, { message: "Username має бути не менше 3 символів" })
    username?: string;

    @IsString()
    @MinLength(8, { message: "Пароль має бути не менше 8 символів" })
    password!: string;

    @IsOptional()
    @IsEnum(Role, { message: "Некоректна роль користувача" })
    role?: Role;

    @IsOptional()
    @IsString()
    organizationName?: string;
}
