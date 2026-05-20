import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession, LiveSessionStatus } from './entities/live-session.entity';
import { LiveSessionResult } from './entities/live-session-result.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface PlayerState {
  socketId: string;
  name: string;
  userId?: string;
  score: number;
  answers: Record<string, string[]>;
}

// In-memory room state
export const rooms = new Map<string, {
  session: LiveSession;
  quiz: any;
  hostSocketId: string;
  players: Map<string, PlayerState>;
  currentQuestion: number;
  questionStartedAt: number;
  status: 'waiting' | 'question' | 'results' | 'finished';
  maxPlayers: number | null;
}>();

@Injectable()
export class LiveService {
  constructor(
    @InjectRepository(LiveSession) private sessionsRepo: Repository<LiveSession>,
    @InjectRepository(LiveSessionResult) private resultsRepo: Repository<LiveSessionResult>,
    @InjectRepository(QuizAssignment) private assignRepo: Repository<QuizAssignment>,
  ) {}

  async createSession(assignmentId: string, hostSocketId: string) {
    const assignment = await this.assignRepo.findOne({
      where: { id: assignmentId },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.answerOptions'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const quiz = assignment.quiz;
    const settings = quiz.settings ?? {};

    let questions = [...quiz.questions].sort((a, b) => a.order - b.order);
    if (settings.shuffleQuestions) questions = shuffleArray(questions);

    questions.forEach((q: any) => {
      let opts = [...q.answerOptions].sort((a: any, b: any) => a.order - b.order);
      if (settings.shuffleAnswers) opts = shuffleArray(opts);
      q.answerOptions = opts;
    });
    quiz.questions = questions;

    let pin: string;
    let attempts = 0;
    do {
      pin = generatePin();
      attempts++;
    } while (rooms.has(pin) && attempts < 100);

    const session = this.sessionsRepo.create({
      assignmentId,
      pin,
      status: LiveSessionStatus.WAITING,
      currentQuestionIndex: 0,
    });
    await this.sessionsRepo.save(session);

    rooms.set(pin, {
      session,
      quiz,
      hostSocketId,
      players: new Map(),
      currentQuestion: 0,
      questionStartedAt: 0,
      status: 'waiting',
      maxPlayers: assignment.maxPlayers ?? null,
    });

    return { pin, session };
  }

  getRoom(pin: string) {
    return rooms.get(pin);
  }

  addPlayer(pin: string, socketId: string, name: string, userId?: string) {
    const room = rooms.get(pin);
    if (!room) return null;

    // Check player limit
    if (room.maxPlayers && room.players.size >= room.maxPlayers) return 'full';

    // Allow rejoin by same name (restore score)
    const existing = [...room.players.values()].find(p => p.name === name);
    if (existing) {
      existing.socketId = socketId;
      if (userId) existing.userId = userId;
      room.players.delete(socketId);
      room.players.set(socketId, existing);
    } else {
      room.players.set(socketId, { socketId, name, userId, score: 0, answers: {} });
    }
    return room;
  }

  removePlayer(socketId: string) {
    for (const [pin, room] of rooms.entries()) {
      if (room.players.has(socketId)) {
        room.players.delete(socketId);
        return { pin, room };
      }
      if (room.hostSocketId === socketId) {
        rooms.delete(pin);
        return { pin, room: null };
      }
    }
    return null;
  }

  getLeaderboard(pin: string) {
    const room = rooms.get(pin);
    if (!room) return [];
    return [...room.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
  }

  submitAnswer(pin: string, socketId: string, questionIndex: number, selectedOptionIds: string[]) {
    const room = rooms.get(pin);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    const question = room.quiz.questions[questionIndex];
    if (!question) return null;

    // Prevent double answer
    if (player.answers[question.id]) return null;
    player.answers[question.id] = selectedOptionIds;

    const correctIds = question.answerOptions
      .filter((o: any) => o.isCorrect)
      .map((o: any) => o.id)
      .sort();
    const selectedSorted = [...selectedOptionIds].sort();
    const isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedSorted);

    if (isCorrect) {
      const timeSpent = (Date.now() - room.questionStartedAt) / 1000;
      const maxTime = question.timeLimit || 30;
      const timeBonus = Math.max(0, Math.round((1 - timeSpent / maxTime) * 500));
      player.score += question.points * 100 + timeBonus;
    }

    return { isCorrect, score: player.score };
  }

  startQuestion(pin: string) {
    const room = rooms.get(pin);
    if (!room) return null;
    room.status = 'question';
    room.questionStartedAt = Date.now();
    const question = room.quiz.questions[room.currentQuestion];
    return question;
  }

  nextQuestion(pin: string) {
    const room = rooms.get(pin);
    if (!room) return null;
    room.currentQuestion++;
    if (room.currentQuestion >= room.quiz.questions.length) {
      room.status = 'finished';
      return null;
    }
    return room.currentQuestion;
  }

  async finishSession(pin: string) {
    const room = rooms.get(pin);
    if (!room) return;
    room.status = 'finished';

    await this.sessionsRepo.update(room.session.id, {
      status: LiveSessionStatus.FINISHED,
      finishedAt: new Date(),
    });

    const leaderboard = this.getLeaderboard(pin);
    const totalQuestions = room.quiz.questions.length;

    const results = leaderboard.map((entry) => {
      const player = [...room.players.values()].find(p => p.name === entry.name);
      const correctAnswers = player ? Object.keys(player.answers).length : 0;
      return this.resultsRepo.create({
        sessionId: room.session.id,
        playerName: entry.name,
        userId: player?.userId ?? undefined,
        score: entry.score,
        rank: entry.rank,
        correctAnswers,
        totalQuestions,
      });
    });

    if (results.length > 0) {
      await this.resultsRepo.save(results);
    }

    rooms.delete(pin);
  }
}
