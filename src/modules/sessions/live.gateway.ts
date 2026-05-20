import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LiveService } from './live.service';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (!origin || allowed.includes(origin) || origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  },
  namespace: '/live',
})
export class LiveGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private liveService: LiveService) {}

  // HOST: create room
  @SubscribeMessage('host:create')
  async handleCreate(@MessageBody() data: { assignmentId: string }, @ConnectedSocket() client: Socket) {
    try {
      const { pin } = await this.liveService.createSession(data.assignmentId, client.id);
      client.join(pin);
      client.emit('host:created', { pin });
    } catch (e) {
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  // HOST: start question
  @SubscribeMessage('host:startQuestion')
  handleStartQuestion(@MessageBody() data: { pin: string }, @ConnectedSocket() client: Socket) {
    const room = this.liveService.getRoom(data.pin);
    if (!room || room.hostSocketId !== client.id) return;

    const question = this.liveService.startQuestion(data.pin);
    if (!question) return;

    // Send question without correct answers to players
    const playerQuestion = {
      id: question.id,
      text: question.text,
      type: question.type,
      timeLimit: question.timeLimit || 30,
      points: question.points,
      index: room.currentQuestion,
      total: room.quiz.questions.length,
      answerOptions: question.answerOptions.map((o: any) => ({ id: o.id, text: o.text })),
    };

    this.server.to(data.pin).emit('question:start', playerQuestion);

    // Auto-advance after time limit
    const timeLimit = (question.timeLimit || 30) * 1000;
    setTimeout(() => {
      const r = this.liveService.getRoom(data.pin);
      if (r && r.status === 'question' && r.currentQuestion === room.currentQuestion) {
        this.sendQuestionResults(data.pin, question);
      }
    }, timeLimit + 500);
  }

  private sendQuestionResults(pin: string, question: any) {
    const room = this.liveService.getRoom(pin);
    if (!room) return;
    room.status = 'results';

    const correctIds = question.answerOptions
      .filter((o: any) => o.isCorrect)
      .map((o: any) => o.id);

    const leaderboard = this.liveService.getLeaderboard(pin);

    this.server.to(pin).emit('question:results', {
      correctOptionIds: correctIds,
      leaderboard: leaderboard.slice(0, 10),
    });

    // Tell host
    this.server.to(room.hostSocketId).emit('host:questionDone', {
      leaderboard,
      hasMore: room.currentQuestion + 1 < room.quiz.questions.length,
    });
  }

  // HOST: end question early & show results
  @SubscribeMessage('host:endQuestion')
  handleEndQuestion(@MessageBody() data: { pin: string }, @ConnectedSocket() client: Socket) {
    const room = this.liveService.getRoom(data.pin);
    if (!room || room.hostSocketId !== client.id) return;
    const question = room.quiz.questions[room.currentQuestion];
    this.sendQuestionResults(data.pin, question);
  }

  // HOST: next question
  @SubscribeMessage('host:nextQuestion')
  handleNextQuestion(@MessageBody() data: { pin: string }, @ConnectedSocket() client: Socket) {
    const room = this.liveService.getRoom(data.pin);
    if (!room || room.hostSocketId !== client.id) return;

    const next = this.liveService.nextQuestion(data.pin);
    if (next === null) {
      // Game over
      const leaderboard = this.liveService.getLeaderboard(data.pin);
      this.server.to(data.pin).emit('game:finished', { leaderboard });
      this.liveService.finishSession(data.pin);
    } else {
      this.server.to(data.pin).emit('question:waiting', { questionIndex: next });
    }
  }

  // PLAYER: join room
  @SubscribeMessage('player:join')
  handleJoin(@MessageBody() data: { pin: string; name: string; userId?: string }, @ConnectedSocket() client: Socket) {
    const room = this.liveService.addPlayer(data.pin, client.id, data.name, data.userId);
    if (!room) {
      client.emit('error', { message: 'Room not found' });
      return;
    }
    if (room === 'full') {
      client.emit('error', { message: 'Room is full' });
      return;
    }

    client.join(data.pin);

    const players = [...room.players.values()].map(p => ({ name: p.name, score: p.score }));
    client.emit('player:joined', { pin: data.pin, name: data.name });

    // Tell host about new player
    this.server.to(room.hostSocketId).emit('host:playerJoined', {
      name: data.name,
      count: room.players.size,
    });

    // Update lobby for all
    this.server.to(data.pin).emit('lobby:players', { players, count: room.players.size });
  }

  // PLAYER: submit answer
  @SubscribeMessage('player:answer')
  handleAnswer(
    @MessageBody() data: { pin: string; questionIndex: number; selectedOptionIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.liveService.submitAnswer(data.pin, client.id, data.questionIndex, data.selectedOptionIds);
    if (!result) return;

    client.emit('player:answerResult', result);

    // Notify host of answer count
    const room = this.liveService.getRoom(data.pin);
    if (room) {
      const question = room.quiz.questions[data.questionIndex];
      const answered = [...room.players.values()].filter(p => p.answers[question?.id]).length;
      this.server.to(room.hostSocketId).emit('host:answerCount', {
        answered,
        total: room.players.size,
      });

      // Auto-end if all answered
      if (answered >= room.players.size && room.status === 'question') {
        this.sendQuestionResults(data.pin, question);
      }
    }
  }

  handleDisconnect(client: Socket) {
    const result = this.liveService.removePlayer(client.id);
    if (result?.pin && result.room) {
      const players = [...result.room.players.values()].map(p => ({ name: p.name, score: p.score }));
      this.server.to(result.pin).emit('lobby:players', { players, count: result.room.players.size });
    }
    if (result?.pin && !result.room) {
      // Host disconnected — close room
      this.server.to(result.pin).emit('error', { message: 'Host disconnected' });
    }
  }
}
