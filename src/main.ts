import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as fs from "fs";

async function bootstrap() {
    const httpsOptions = {
        key: fs.readFileSync("./ssl/localhost-key.pem"),
        cert: fs.readFileSync("./ssl/localhost.pem"),
    };

    const app = await NestFactory.create(AppModule, {
        httpsOptions,
    });

    app.enableCors({
        origin: "http://localhost:3000",
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
        }),
    );

    await app.listen(process.env.PORT ?? 3001);

    console.log(`Server is running on https://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
