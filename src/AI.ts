import {
  COURT_LEFT,
  COURT_RIGHT,
  FLOOR_Y,
  NET_X,
  PlayerState,
  Team
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';
import { Physics } from './Physics';

export type AIDifficulty = 'CASUAL' | 'PRO' | 'MASTER';

export class AIController {
  public difficulty: AIDifficulty = 'PRO';
  private reactionDelay: number = 0;

  constructor(difficulty: AIDifficulty = 'PRO') {
    this.difficulty = difficulty;
  }

  public updateCPU(
    cpuPlayers: Player[],
    playerTeam: Player[],
    ball: Ball,
    onCpuServe: () => void,
    onCpuHit: (player: Player, type: 'receive' | 'toss' | 'spike' | 'block' | 'over') => void
  ): void {
    const prediction = Physics.predictLanding(ball);
    const isBallInCpuCourt = (ball.x >= NET_X - 35 || (prediction.x >= NET_X && ball.vx > 0.5)) && ball.inPlay;

    // 1. Handle CPU Serve
    const server = cpuPlayers.find(p => p.state === PlayerState.SERVE_PREPARE);
    if (server) {
      if (Math.random() < 0.035) {
        onCpuServe();
      }
      return;
    }

    // 2. Defensive Blocking at the Net by Front-Line Players
    // IMPORTANT: Blocking a serve is strictly illegal under FIVB Rule 14.1.3.
    // Blocking is only permitted against active rally attacks (3rd touch spike or attack after serve receive).
    const isServeInFlight = ball.isServed || ball.touches[Team.PLAYER] === 0;
    const isRallyAttack = !isServeInFlight && ball.inPlay && ball.touches[Team.PLAYER] >= 2;
    const isHumanSpiking = isRallyAttack && playerTeam.some(p => p.isFrontLine && (p.state === PlayerState.SPIKE || (!p.isGrounded && ball.x > NET_X - 150)));

    if (isHumanSpiking && ball.x < NET_X && ball.x > NET_X - 130) {
      const frontBlockers = cpuPlayers.filter(p => p.isFrontLine && p.isGrounded && p.x < NET_X + 110);
      for (const blocker of frontBlockers) {
        const blockProbability = this.difficulty === 'MASTER' ? 0.70 : (this.difficulty === 'PRO' ? 0.48 : 0.25);
        if (Math.random() < blockProbability) {
          blocker.triggerBlock();
          break;
        }
      }
    }

    // 3. Find target player for the ball
    let activePlayer: Player | null = null;
    const cpuTouches = ball.touches[Team.CPU];

    if (isBallInCpuCourt && ball.inPlay) {
      if (cpuTouches === 0) {
        // Receivers first (prioritize back-line defenders or closest player)
        const receivers = cpuPlayers.filter(p => !p.isFrontLine);
        activePlayer = this.getClosestToTarget(receivers.length > 0 ? receivers : cpuPlayers, prediction.x, prediction.depth);
      } else if (cpuTouches === 1) {
        // Setter takes 2nd touch
        activePlayer = cpuPlayers.find(p => p.role === 'setter') || cpuPlayers[2] || cpuPlayers[0];
      } else {
        // Front-line spikers take 3rd touch
        const spikers = cpuPlayers.filter(p => p.isFrontLine && p.role === 'spiker');
        activePlayer = this.getClosestToTarget(spikers.length > 0 ? spikers : cpuPlayers, prediction.x, prediction.depth);
      }
    }

    // Speed and precision by difficulty (boosted for competitive responsiveness)
    const speedMult = this.difficulty === 'MASTER' ? 1.25 : (this.difficulty === 'PRO' ? 1.10 : 0.92);
    const posTolerance = this.difficulty === 'MASTER' ? 8 : (this.difficulty === 'PRO' ? 12 : 18);

    // 4. Update each CPU player movement & state
    for (const p of cpuPlayers) {
      if (!p.isGrounded || p.state === PlayerState.SERVE_PREPARE || p.state === PlayerState.CELEBRATE || p.state === PlayerState.DISAPPOINTED) {
        continue;
      }

      if (p === activePlayer && isBallInCpuCourt) {
        const targetX = Math.max(NET_X + 25, Math.min(COURT_RIGHT + 20, prediction.x));
        const diffX = targetX - p.x;
        const diffDepth = prediction.depth - p.depth;

        // Move towards landing spot
        if (Math.abs(diffX) > posTolerance) {
          p.moveAnalog(Math.sign(diffX), Math.sign(diffDepth), speedMult);
        } else {
          p.moveAnalog(0, Math.sign(diffDepth) * 0.5, speedMult);
        }

        const hand = p.getHandPos();
        // Depth penalty 50 matches Physics.ts hit detection
        const dist = Math.hypot(ball.x - hand.x, ball.y - hand.y, (ball.depth - p.depth) * 50);

        // Action trigger based on touch count
        if (cpuTouches === 0 && ball.framesSinceHit >= 6) {
          if (dist < 64 && ball.y > FLOOR_Y - 180) {
            p.triggerReceive();
            onCpuHit(p, 'receive');
          } else if (dist >= 64 && dist < 100 && ball.y > FLOOR_Y - 90 && Math.abs(diffX) > 30) {
            p.triggerDive();
          }
        } else if (cpuTouches === 1 && ball.framesSinceHit >= 8) {
          if (dist < 58 && ball.y > FLOOR_Y - 150) {
            p.triggerToss();
            onCpuHit(p, 'toss');
          }
        } else if (cpuTouches >= 2) {
          // 3rd Touch: Spike if in air, or chance-ball return over net if on ground
          // Initiate jump earlier while toss approaches or peaks
          const shouldJumpToSpike = ball.y > FLOOR_Y - 260 && ball.y < FLOOR_Y - 130 && Math.abs(diffX) < 55;
          if (shouldJumpToSpike && p.isGrounded) {
            p.triggerSpike();
          } else if (!p.isGrounded && dist < 62) {
            onCpuHit(p, 'spike');
          } else if (p.isGrounded && dist < 58 && ball.y > FLOOR_Y - 140) {
            // Must return ball over net safely to player court!
            p.triggerReceive();
            onCpuHit(p, 'over');
          }
        }
      } else {
        // Return smoothly to home position
        const homeDiffX = p.homeX - p.x;
        const homeDiffDepth = p.homeDepth - p.depth;
        if (Math.abs(homeDiffX) > 15 || Math.abs(homeDiffDepth) > 0.08) {
          p.moveAnalog(Math.sign(homeDiffX) * 0.4, Math.sign(homeDiffDepth) * 0.4, 0.6);
        } else {
          p.moveAnalog(0, 0);
          p.state = PlayerState.IDLE;
        }
      }
    }
  }

  private getClosestToTarget(players: Player[], tx: number, tDepth: number): Player | null {
    if (players.length === 0) return null;
    let closest = players[0];
    let minD = 99999;
    for (const p of players) {
      const d = Math.hypot(p.x - tx, (p.depth - tDepth) * 50);
      if (d < minD) {
        minD = d;
        closest = p;
      }
    }
    return closest;
  }
}