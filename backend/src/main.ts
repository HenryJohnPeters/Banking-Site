import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL", "FRONTEND_ORIGIN"];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error(
      "❌ FATAL ERROR: Required environment variables are missing:",
    );
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\nApplication cannot start without these variables.");
    console.error("Please set them in your .env file or environment.");
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.error(
      "❌ FATAL ERROR: JWT_SECRET must be at least 32 characters long for security.",
    );
    console.error("Current length:", process.env.JWT_SECRET.length);
    process.exit(1);
  }

  // Validate FRONTEND_ORIGIN format
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  if (
    !frontendOrigin.startsWith("http://") &&
    !frontendOrigin.startsWith("https://")
  ) {
    console.error(
      "❌ FATAL ERROR: FRONTEND_ORIGIN must be a valid URL starting with http:// or https://",
    );
    console.error("Current value:", frontendOrigin);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Security headers
  app.use(helmet());

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable CORS - no fallback, validated at startup
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix("api");

  // Minimal Swagger/OpenAPI setup
  AppModule.setupSwagger(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`✅ Banking App API is running on http://localhost:${port}`);
  console.log(
    `📚 API Documentation available at http://localhost:${port}/api/docs`,
  );
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_ORIGIN}`);
  console.log(`🔐 Security: JWT authentication active`);
}
bootstrap();
