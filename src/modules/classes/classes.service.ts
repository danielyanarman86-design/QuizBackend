import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateClassDto, JoinClassDto } from './dto/create-class.dto';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class) private classesRepo: Repository<Class>,
  ) {}

  async findAll(user: User) {
    if (user.role === UserRole.TEACHER) {
      return this.classesRepo.find({
        where: { teacherId: user.id },
        relations: ['students'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.classesRepo
      .createQueryBuilder('class')
      .innerJoin('class.students', 'student', 'student.id = :userId', { userId: user.id })
      .leftJoinAndSelect('class.students', 'students')
      .orderBy('class.createdAt', 'DESC')
      .getMany();
  }

  async create(dto: CreateClassDto, user: User) {
    const inviteCode = generateInviteCode();
    const cls = this.classesRepo.create({
      ...dto,
      teacherId: user.id,
      schoolId: user.schoolId,
      inviteCode,
    });
    return this.classesRepo.save(cls);
  }

  async join(dto: JoinClassDto, user: User) {
    const cls = await this.classesRepo.findOne({
      where: { inviteCode: dto.inviteCode },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Class not found');

    const alreadyJoined = cls.students.some((s) => s.id === user.id);
    if (!alreadyJoined) {
      cls.students.push(user as any);
      await this.classesRepo.save(cls);
    }
    return cls;
  }

  async findOne(id: string) {
    const cls = await this.classesRepo.findOne({ where: { id }, relations: ['students', 'teacher'] });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async remove(id: string, user: User) {
    const cls = await this.classesRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    await this.classesRepo.remove(cls);
    return { message: 'Class deleted' };
  }
}
