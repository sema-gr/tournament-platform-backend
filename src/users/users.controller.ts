import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "@prisma/client";
import { CreateUserDto } from "./dto/createUser.dto";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    create(
        @Body() data: CreateUserDto,
    ): Promise<User> {
        return this.usersService.create(data);
    }

    @Get()
    findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string): Promise<User | null> {
        return this.usersService.findOne(id);
    }

    @Put(":id")
    update(
        @Param("id") id: string,
        @Body() data: Partial<CreateUserDto>,
    ): Promise<User> {
        return this.usersService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: string): Promise<User> {
        return this.usersService.remove(id);
    }
}
