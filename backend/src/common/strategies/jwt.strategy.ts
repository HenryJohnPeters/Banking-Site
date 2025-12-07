import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Strategy } from "passport-jwt";
import { AuthService } from "../../modules/auth/auth.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      // Extract JWT ONLY from httpOnly cookies (most secure for browsers)
      jwtFromRequest: (request: Request) => {
        let token = null;

        if (request && request.cookies) {
          token = request.cookies["banking_token"];
        }

        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: { sub: string; iat: number; exp: number }) {
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

    // Return user with sub property for compatibility with controllers
    return { ...user, sub: payload.sub };
  }
}
