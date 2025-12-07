import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Response,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CreateUserDto } from "../../models/User";
import { LoginDto } from "../../models/User";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 registrations per hour
  @ApiOperation({
    summary: "Register a new user",
    description:
      "Creates a new user account with USD and EUR accounts with initial balances",
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: "User successfully registered",
    schema: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            first_name: { type: "string" },
            last_name: { type: "string" },
          },
        },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({
    status: 409,
    description: "User already exists with this email",
  })
  async register(@Body() createUserDto: CreateUserDto, @Response() res) {
    const result = await this.authService.register(createUserDto);

    // Set secure httpOnly cookie (primary auth method for browsers)
    res.cookie("banking_token", result.token, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Prevents CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    // Return user data only - NO TOKEN in response body (security best practice)
    return res.json({
      user: result.user,
      message: "Registration successful",
    });
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 login attempts per 15 minutes
  @ApiOperation({
    summary: "User login",
    description:
      "Authenticates user credentials and sets secure httpOnly cookie",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Successfully authenticated",
    schema: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            first_name: { type: "string" },
            last_name: { type: "string" },
          },
        },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto, @Response() res) {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookie for browser security (prevents XSS)
    res.cookie("banking_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    // Return user data only - NO TOKEN in response body
    return res.json({
      user: result.user,
      message: "Login successful",
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @ApiOperation({
    summary: "Get user profile",
    description: "Returns the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @ApiOperation({
    summary: "User logout",
    description:
      "Logs out the current user (JWT tokens are stateless, so logout is handled on client side)",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully logged out",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Logged out successfully" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logout(@Response() res) {
    // Clear the httpOnly cookie
    res.cookie("banking_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });

    return res.json({ message: "Logged out successfully" });
  }
}
