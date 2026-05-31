import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: [
            "http://localhost:3000", 
            "https://my-next-app-nu-gray.vercel.app"
        ],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
        }),
    );

    const port = process.env.PORT ?? 3001;
    await app.listen(port);

    console.log(`Server is running on port ${port}`);
}
bootstrap();