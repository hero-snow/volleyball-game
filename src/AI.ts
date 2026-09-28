import {
  COURT_RIGHT,
  FLOOR_Y,
  NET_X,
  PlayerState,
  Team
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';
import { Physics } from './Physics';

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export class AIController {
  public difficulty: AIDifficulty = 'NORMAL';

  constructor(difficulty: AIDifficulty = 'NORMAL') {
    this.difficulty = difficulty;
  }

  public updateCPU(
    cpuPlayers: Player[],
    playerTeam: Player[],
    ball: Ball,
    onCpuServe: () => void,
    onCpuHit: (player: Player, type: 'receive' | 'toss' | 'spike' | 'block') => void
  ): void {
    const isBallInCpuCourt = ball.x >= NET_X - 10 && ball.x <= COURT_RIGHT + 30;
    const predictedX = Physics.predictLandingX(ball);
    const predictedDepth = Physics.predictLandingDepth(ball);

    const server = cpuPlayers.find(p => p.state === PlayerState.SERVE_PREPARE);
    if (server) {
      if (Math.random() < 0.03) {
        onCpuServe();
      }
      return;
    }

    let closestPlayer: Player | null = null;
    let minDist = 9999;

    if (isBallInCpuCourt && ball.inPlay) {
      const targetLandingX = (predictedX !== null && predictedX >= NET_X) ? predictedX : ball.x;
      for (const p of cpuPlayers) {
        const d = Math.hypot(p.x - targetLandingX, (p.depth - predictedDepth) * 48);
        if (d < minDist) {
          minDist = d;
          closestPlayer = p;
        }
      }

      if (ball.touches[Team.CPU] === 0) {
        closestPlayer = cpuPlayers
          .filter(p => p.role === 'receiver')
          .sort((a, b) => Math.hypot(a.x - targetLandingX, (a.depth - predictedDepth) * 48) - Math.hypot(b.x - targetLandingX, (b.depth - predictedDepth) * 48))[0] || closestPlayer;
      } else if (ball.touches[Team.CPU] === 1) {
        closestPlayer = cpuPlayers.find(p => p.role === 'setter') || closestPlayer;
      } else if (ball.touches[Team.CPU] === 2) {
        closestPlayer = cpuPlayers.find(p => p.role === 'spiker') || closestPlayer;
      }
    }

    const errorMargin = this.difficulty === 'EASY' ? 12 : (this.difficulty === 'NORMAL' ? 6 : 2);
    const speedMultiplier = this.difficulty === 'EASY' ? 0.75 : (this.difficulty === 'NORMAL' ? 0.95 : 1.15);
    const spikeJumpWindow = ball.vy > 0 && ball.y > FLOOR_Y - 85 && ball.y < FLOOR_Y - 45;

    for (const p of cpuPlayers) {
      if (p.isGrounded && p.state !== PlayerState.SERVE_PREPARE && p.state !== PlayerState.CELEBRATE && p.state !== PlayerState.DISAPPOINTED) {
        if (p === closestPlayer && isBallInCpuCourt) {
          const targetX = (predictedX !== null && predictedX >= NET_X) ? predictedX : ball.x;
          const diffX = targetX - p.x;

          if (Math.abs(diffX) > errorMargin) {
            p.move(Math.sign(diffX) * speedMultiplier);
          } else {
            p.stop();
          }
          p.moveDepth(Math.sign(predictedDepth - p.depth) * speedMultiplier);

          const cpuTouches = ball.touches[Team.CPU];
          const hand = p.getHandPos();
          const ballDist = Math.hypot(ball.x - hand.x, ball.y - hand.y, (ball.depth - p.depth) * 48);

          if (cpuTouches === 0 && ball.framesSinceHit >= 5) {
            if (ballDist < 32 && ball.y > FLOOR_Y - 85) {
              p.triggerReceive();
              onCpuHit(p, 'receive');
            }
          } else if (cpuTouches === 1 && ball.framesSinceHit >= 8) {
            if (ballDist < 26 && ball.y > FLOOR_Y - 60) {
              p.triggerToss();
              onCpuHit(p, 'toss');
            }
          } else if (cpuTouches === 2) {
            if (spikeJumpWindow && p.isGrounded) {
              p.jump();
            }
          }
        } else {
          const cpuTouches = ball.touches[Team.CPU];

          if (cpuTouches === 2 && p.role === 'spiker' && isBallInCpuCourt) {
            const diffX = ball.x - p.x;
            if (Math.abs(diffX) > 8) {
              p.move(Math.sign(diffX));
            } else {
              p.stop();
              if (spikeJumpWindow && p.isGrounded) {
                p.jump();
              }
            }
          } else if (!isBallInCpuCourt && p.homeX <= NET_X + 45 && ball.touches[Team.PLAYER] >= 2) {
            const blockX = NET_X + 16;
            if (Math.abs(p.x - blockX) > 4) {
              p.move(Math.sign(blockX - p.x));
            } else {
              p.stop();
              const activePlayer = playerTeam.find(pl => !pl.isGrounded);
              const blockChance = this.difficulty === 'EASY' ? 0.3 : (this.difficulty === 'NORMAL' ? 0.65 : 0.9);
              if (activePlayer && ball.y < FLOOR_Y - 45 && Math.random() < blockChance) {
                if (p.isGrounded) {
                  p.jump();
                  p.triggerBlock();
                }
              }
            }
          } else {
            const distHome = p.homeX - p.x;
            if (Math.abs(distHome) > 10) {
              p.move(Math.sign(distHome) * 0.7);
            } else {
              p.stop();
            }
            p.moveDepth(Math.sign(p.homeDepth - p.depth) * 0.7);
          }
        }
      }

      if (!p.isGrounded) {
        const ballDist = Math.hypot(ball.x - (p.x + p.width / 2), ball.y - p.y, (ball.depth - p.depth) * 48);
        if (p.state === PlayerState.JUMP) {
          if (ball.touches[Team.CPU] === 2 && ballDist < 24) {
            p.triggerSpike();
            onCpuHit(p, 'spike');
          } else if (p.x <= NET_X + 25 && ball.x < NET_X && ballDist < 30) {
            p.triggerBlock();
            onCpuHit(p, 'block');
          }
        }
      }

      p.update();
    }
  }

  public updatePlayerAllies(
    playerTeam: Player[],
    controlledPlayer: Player,
    ball: Ball,
    onAllyHit: (player: Player, type: 'receive' | 'toss' | 'spike') => void
  ): void {
    const isBallInOurCourt = ball.x <= NET_X + 10 && ball.x >= 20;
    const predictedX = Physics.predictLandingX(ball);
    const predictedDepth = Physics.predictLandingDepth(ball);
    const spikeJumpWindow = ball.vy > 0 && ball.y > FLOOR_Y - 85 && ball.y < FLOOR_Y - 45;

    const playerDist = Math.hypot(controlledPlayer.x - ball.x, (controlledPlayer.depth - ball.depth) * 48);
    let bestAlly: Player | null = null;
    let minDist = 9999;

    if (isBallInOurCourt && ball.inPlay) {
      const targetX = (predictedX !== null && predictedX <= NET_X) ? predictedX : ball.x;
      for (const ally of playerTeam) {
        if (ally === controlledPlayer) continue;
        const d = Math.hypot(ally.x - targetX, (ally.depth - predictedDepth) * 48);
        if (d < minDist) {
          minDist = d;
          bestAlly = ally;
        }
      }
    }

    for (const ally of playerTeam) {
      if (ally === controlledPlayer) continue;

      if (ally.isGrounded && ally.state !== PlayerState.SERVE_PREPARE && ally.state !== PlayerState.CELEBRATE && ally.state !== PlayerState.DISAPPOINTED) {
        const touches = ball.touches[Team.PLAYER];

        if (ally === bestAlly && isBallInOurCourt && playerDist > 45) {
          const targetX = (predictedX !== null && predictedX <= NET_X) ? predictedX : ball.x;
          const diffX = targetX - ally.x;

          if (Math.abs(diffX) > 6) {
            ally.move(Math.sign(diffX));
          } else {
            ally.stop();
          }
          ally.moveDepth(Math.sign(predictedDepth - ally.depth));

          const dist = Math.hypot(ball.x - (ally.x + ally.width / 2), ball.y - (ally.y + 8), (ball.depth - ally.depth) * 48);
          if (dist < 24 && ball.y > FLOOR_Y - 55 && ball.framesSinceHit >= 5) {
            if (touches === 0) {
              ally.triggerReceive();
              onAllyHit(ally, 'receive');
            } else if (touches === 1) {
              ally.triggerToss();
              onAllyHit(ally, 'toss');
            }
          }
        } else if (touches === 1 && ally.role === 'setter' && isBallInOurCourt) {
          const targetX = (predictedX !== null && predictedX <= NET_X) ? predictedX : ball.x;
          const diffX = targetX - ally.x;
          if (Math.abs(diffX) > 4) {
            ally.move(Math.sign(diffX));
          } else {
            ally.stop();
          }
          ally.moveDepth(Math.sign(ball.depth - ally.depth));

          const dist = Math.hypot(ball.x - (ally.x + ally.width / 2), ball.y - (ally.y + 8), (ball.depth - ally.depth) * 48);
          if (dist < 26 && ball.y > FLOOR_Y - 55 && ball.framesSinceHit >= 8) {
            ally.triggerToss();
            onAllyHit(ally, 'toss');
          }
        } else if (touches === 2 && ally.role === 'spiker' && isBallInOurCourt && controlledPlayer.role === 'setter') {
          const diffX = ball.x - ally.x;
          if (Math.abs(diffX) > 6) {
            ally.move(Math.sign(diffX));
          } else {
            ally.stop();
            if (spikeJumpWindow && ally.isGrounded) {
              ally.jump();
            }
          }
        } else {
          const distHome = ally.homeX - ally.x;
          if (Math.abs(distHome) > 10) {
            ally.move(Math.sign(distHome) * 0.7);
          } else {
            ally.stop();
          }
          ally.moveDepth(Math.sign(ally.homeDepth - ally.depth) * 0.7);
        }
      }

      if (!ally.isGrounded && ally.state === PlayerState.JUMP) {
        const ballDist = Math.hypot(ball.x - (ally.x + ally.width / 2), ball.y - ally.y, (ball.depth - ally.depth) * 48);
        if (ball.touches[Team.PLAYER] === 2 && ballDist < 24) {
          ally.triggerSpike();
          onAllyHit(ally, 'spike');
        }
      }

      ally.update();
    }
  }
}