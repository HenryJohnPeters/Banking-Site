import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  last_name: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
