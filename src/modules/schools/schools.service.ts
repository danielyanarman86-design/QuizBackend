import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private schoolsRepo: Repository<School>,
  ) {}

  findAll() {
    return this.schoolsRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.schoolsRepo.findOne({ where: { id } });
  }

  async create(dto: CreateSchoolDto, createdById: string) {
    const school = this.schoolsRepo.create({ ...dto, createdById });
    return this.schoolsRepo.save(school);
  }

  async update(id: string, dto: Partial<CreateSchoolDto>) {
    await this.schoolsRepo.update(id, dto);
    return this.schoolsRepo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const school = await this.schoolsRepo.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    await this.schoolsRepo.remove(school);
    return { message: 'School deleted' };
  }
}
