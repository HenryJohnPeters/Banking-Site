import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "./modules/auth/auth.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {
    super({
      // Only use httpOnly cookies - no Authorization header support
      jwtFromRequest: (request: Request) => {
        let token = null;
        if (request && request.cookies) {
          token = request.cookies["banking_token"];
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") || "fallback-secret-key",
    });
  }

  async validate(payload: any) {
    // Enhanced validation for banking security
    if (!payload.sub || !payload.iat || !payload.exp) {
      throw new UnauthorizedException("Invalid token structure");
    }

    // Check if token is too old (additional security layer)
    const tokenAge = Date.now() / 1000 - payload.iat;
    if (tokenAge > 24 * 60 * 60) {
      // 24 hours max
      throw new UnauthorizedException("Token expired");
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user;
  }
}
