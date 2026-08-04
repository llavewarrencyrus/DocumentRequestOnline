// local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  /**
* Validate user with username, password, and optionally birthdate
* - Students: provide username, birthdate, password
* - Staff: provide username, password (birthdate not required)
*/
  async validate(
    req: Request, // The full request object
    username: string,
    password: string
  ): Promise<any> {
    // Extract birthdate from request body (may be undefined for staff)
    const body = req.body as any;
    const birthdate = body.birthdate;

    // Prepare credentials object
    const credentials: any = {
      username,
      password
    };

    // Only add birthdate if it exists (for students)
    if (birthdate) {
      credentials.birthdate = birthdate;
    }

    // Call auth service with credentials
    const user = await this.authService.validateUser(credentials);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}