import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post("register")
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post("login")
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post("verify-code")
    async verifyCode(@Body() body: { email: string; code: string }) {
        return this.authService.verifyCode(body.email, body.code);
    }
}
