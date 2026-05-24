import { IsString, MinLength } from "class-validator";

export class CreateTeamDto {
    @IsString()
    @MinLength(3, { message: "Назва команди має бути не менше 3 символів" })
    name!: string;
}
