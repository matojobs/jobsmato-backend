import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

type Args = {
  email?: string;
  first?: string;
  last?: string;
  password?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const part = argv[i];
    if (part === '--email') args.email = argv[++i];
    else if (part === '--first') args.first = argv[++i];
    else if (part === '--last') args.last = argv[++i];
    else if (part === '--password') args.password = argv[++i];
  }
  return args;
}

async function run() {
  const { email, first, last, password } = parseArgs(process.argv.slice(2));
  if (!email) {
    console.error('Error: --email is required');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const userRepo: Repository<User> = dataSource.getRepository(User);

    let user = await userRepo.findOne({ where: { email } });

    let finalPassword = password;
    if (!finalPassword) {
      // 24-char random password
      finalPassword = crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
    }
    const hashed = await bcrypt.hash(finalPassword, 12);

    if (user) {
      user.role = UserRole.ADMIN;
      if (first) user.firstName = first;
      if (last !== undefined) user.lastName = last ?? '';
      user.emailVerified = true;
      user.isActive = true;
      user.onboardingComplete = true;
      if (password) user.password = hashed;
      await userRepo.save(user);
      console.log('Updated existing user to admin:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
      if (!password) {
        console.log('Generated password (store securely):', finalPassword);
      }
    } else {
      user = userRepo.create({
        email,
        password: hashed,
        firstName: first ?? 'Admin',
        lastName: last ?? '',
        role: UserRole.ADMIN,
        emailVerified: true,
        isActive: true,
        onboardingComplete: true,
      } as Partial<User>);
      const saved = await userRepo.save(user);
      console.log('Created admin user:', {
        id: saved.id,
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        role: saved.role,
      });
      if (!password) {
        console.log('Generated password (store securely):', finalPassword);
      }
    }
  } catch (err) {
    console.error('Failed to create/upgrade admin:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();


