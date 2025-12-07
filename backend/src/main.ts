import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Security headers
  app.use(helmet());

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5174",
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // API prefix
  app.setGlobalPrefix("api");

  // Minimal Swagger/OpenAPI setup
  AppModule.setupSwagger(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Banking App API is running on http://localhost:${port}`);
  console.log(
    `API Documentation available at http://localhost:${port}/api/docs`
  );
}
bootstrap();
