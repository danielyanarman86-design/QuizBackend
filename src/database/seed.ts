import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

import { User, UserRole, UserStatus, Locale } from '../modules/users/entities/user.entity';
import { School } from '../modules/schools/entities/school.entity';
import { Class } from '../modules/classes/entities/class.entity';
import { Quiz } from '../modules/quizzes/entities/quiz.entity';
import { Question } from '../modules/questions/entities/question.entity';
import { AnswerOption } from '../modules/questions/entities/answer-option.entity';
import { QuizAssignment } from '../modules/assignments/entities/assignment.entity';
import { LiveSession } from '../modules/sessions/entities/live-session.entity';
import { Attempt } from '../modules/attempts/entities/attempt.entity';
import { StudentAnswer } from '../modules/attempts/entities/student-answer.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER || 'quizrush',
  password: process.env.DB_PASSWORD || 'quizrush123',
  database: process.env.DB_NAME || 'quizrush',
  entities: [User, School, Class, Quiz, Question, AnswerOption, QuizAssignment, LiveSession, Attempt, StudentAnswer],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({
    where: { email: 'admin@quizrush.com' },
  });

  if (existing) {
    console.log('⚠️  SuperAdmin already exists: admin@quizrush.com');
    await AppDataSource.destroy();
    return;
  }

  const password = await bcrypt.hash('Admin123!', 10);

  const admin = userRepo.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@quizrush.com',
    password,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    preferredLocale: Locale.HY,
    avatarColor: '#6366f1',
  });

  await userRepo.save(admin);

  console.log('');
  console.log('🚀 SuperAdmin created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Email   : admin@quizrush.com');
  console.log('   Password: Admin123!');
  console.log('   URL     : http://localhost:3001/hy/login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Change password after first login!');
  console.log('');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
