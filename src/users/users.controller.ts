import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    NotFoundException,
    Query,
    Patch,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/createUser.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { User } from "./types";
import { PrismaService } from "src/prisma/prisma.service";
import { RequestWithUser } from "./types/user";

@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly prisma: PrismaService,
    ) {}

    @Post()
    async create(@Body() data: CreateUserDto): Promise<User> {
        return (await this.usersService.create(data)) as User;
    }

    @Get()
    findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() req: RequestWithUser): Promise<User> {
        const user = await this.usersService.findOne(req.user.id);
        if (!user) {
            throw new NotFoundException("Користувач не знайдений");
        }
        return user;
    }

    @Get("search")
    @UseGuards(JwtAuthGuard)
    searchPlayers(@Query("q") query: string) {
        return this.usersService.searchPlayers(query);
    }

    @Get(":id")
    findOne(@Param("id") id: string): Promise<User | null> {
        return this.usersService.findOne(id);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() data: Partial<CreateUserDto>): Promise<User> {
        return this.usersService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: string): Promise<User> {
        return this.usersService.remove(id);
    }

    @Get(":id/stats")
    async getStats(@Param("id") userId: string) {
        return this.prisma.playerStats.findUnique({ where: { userId } });
    }

    @UseGuards(JwtAuthGuard)
    @Get("me/career")
    getMyCareer(@Req() req: RequestWithUser) {
        return this.usersService.getUserCareer(req.user.id);
    }

    @Get(":id/career")
    getUserCareer(@Param("id") id: string) {
        return this.usersService.getUserCareer(id);
    }

    @Patch("organizer/resubmit")
    @UseGuards(JwtAuthGuard)
    async resubmitOrganizerRequest(@Req() req: RequestWithUser) {
        return this.usersService.resubmitOrganizerRequest(req.user.id);
    }
}
