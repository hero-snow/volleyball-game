// ==========================================
// Game Constants & Types (Volleyball Game)
// ==========================================

// Canvas dimensions (16:9 for landscape tablet / desktop)
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Court geometry
export const COURT_LEFT = 100;
export const COURT_RIGHT = 860;
export const COURT_FLOOR_Y = 420;
export const NET_X = 480;
export const NET_TOP_Y = 270;
export const NET_HEIGHT = 150;
export const NET_WIDTH = 8;
export const ANTENNA_HEIGHT = 50;

// Player dimensions & physics
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 46;
export const PLAYER_SPEED = 3.8;
export const PLAYER_JUMP_POWER = 10.2;
export const GRAVITY = 0.42;
export const HIT_COOLDOWN = 20;

// Ball physics
export const BALL_RADIUS = 9;
export const BALL_GRAVITY = 0.22;
export const BALL_MAX_SPEED = 16;
export const BALL_BOUNCE = 0.65;

// Game rules
export const PLAYERS_PER_TEAM = 6;
export const MAX_TOUCHES = 3;
export const WIN_SCORE = 15;
export const DEUCE_MARGIN = 2;
export const POINT_PAUSE_FRAMES = 110;

// ==========================================
// Types
// ==========================================

export interface Vec2 {
  x: number;
  y: number;
}

export type TeamSide = 'left' | 'right';

// 6 positions in volleyball court rotation (1 to 6)
// 1: Back Right (Server), 2: Front Right, 3: Front Center, 4: Front Left, 5: Back Left, 6: Back Center
export type RotationPosition = 1 | 2 | 3 | 4 | 5 | 6;

export type PlayerRole = 'setter' | 'spiker' | 'defender' | 'allround';

export type PlayerState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'receive'
  | 'toss'
  | 'spike'
  | 'serve'
  | 'block'
  | 'fall'
  | 'celebrate';

export type GamePhase =
  | 'title'
  | 'select'
  | 'ready'
  | 'serve'
  | 'play'
  | 'point'
  | 'gameOver';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameStats {
  leftScore: number;
  rightScore: number;
  leftSets: number;
  rightSets: number;
  servingSide: TeamSide;
  touchCount: number;
  lastTouchTeam: TeamSide | null;
  lastTouchPlayerId: number | null;
}

// ==========================================
// Retro / Modern Chibi Color Palette
// ==========================================

export const COLORS = {
  bgSky: '#121829',
  bgWall: '#202a42',
  courtFloor: '#e2a365',
  courtFloorDark: '#c98a4d',
  courtLine: '#ffffff',
  courtOutBorder: '#4a3222',
  netMesh: '#e0e0e0',
  netBand: '#f5f5f5',
  netPole: '#778899',
  antenna: '#ff3333',
  shadow: 'rgba(0, 0, 0, 0.35)',

  ballWhite: '#ffffff',
  ballBlue: '#2266dd',
  ballYellow: '#ffcc00',

  // Red Team (Japan Style / Cute Modern Chibi)
  team1: {
    jersey: '#e63946',
    jerseyDark: '#b8212e',
    number: '#ffffff',
    shorts: '#1d3557',
    skin: '#fccbaf',
    hairDark: '#2b1e1a',
    hairBrown: '#5c3d2e',
    hairBlonde: '#d4a359',
    shoes: '#ffffff',
  },

  // Blue Team (USA/World Style)
  team2: {
    jersey: '#1d3557',
    jerseyDark: '#112238',
    number: '#f1faee',
    shorts: '#e63946',
    skin: '#f8d5b8',
    hairDark: '#1a1a1a',
    hairBrown: '#4a2c11',
    hairBlonde: '#e3b859',
    shoes: '#f1faee',
  },

  hudBg: 'rgba(15, 23, 42, 0.75)',
  hudBorder: '#38bdf8',
  textGold: '#fbbf24',
  textWhite: '#f8fafc',
  textRed: '#ef4444',
  textBlue: '#3b82f6',

  // Touch Controller Overlay UI
  controlBg: 'rgba(255, 255, 255, 0.15)',
  controlActive: 'rgba(56, 189, 248, 0.45)',
  controlBorder: 'rgba(255, 255, 255, 0.35)',
  controlText: '#ffffff',
};

// ==========================================
// 6-Player Court Base Formations
// ==========================================

export function getFormation6(side: TeamSide, rotationOffset: number = 0): Vec2[] {
  // Base positions on court (X relative to side, Y on floor or shifted for back/front row)
  // Left Court: X: 120 to 450. Right Court: X: 510 to 840.

  const isLeft = side === 'left';

  // Standard 6 positions relative to court center and back line
  // Front row: Y close to net / middle court
  // Back row: Y further back
  // In 2D side view, front/back is represented by X depth and small Y offset for depth layering

  const baseLeftPositions: Vec2[] = [
    { x: 160, y: COURT_FLOOR_Y }, // Pos 1: Back Right (Server)
    { x: 420, y: COURT_FLOOR_Y }, // Pos 2: Front Right
    { x: 330, y: COURT_FLOOR_Y }, // Pos 3: Front Middle
    { x: 240, y: COURT_FLOOR_Y }, // Pos 4: Front Left
    { x: 140, y: COURT_FLOOR_Y }, // Pos 5: Back Left
    { x: 230, y: COURT_FLOOR_Y }, // Pos 6: Back Middle
  ];

  const baseRightPositions: Vec2[] = [
    { x: 800, y: COURT_FLOOR_Y }, // Pos 1: Back Right (Server)
    { x: 540, y: COURT_FLOOR_Y }, // Pos 2: Front Left
    { x: 630, y: COURT_FLOOR_Y }, // Pos 3: Front Middle
    { x: 720, y: COURT_FLOOR_Y }, // Pos 4: Front Right
    { x: 820, y: COURT_FLOOR_Y }, // Pos 5: Back Right
    { x: 730, y: COURT_FLOOR_Y }, // Pos 6: Back Middle
  ];

  const positions = isLeft ? baseLeftPositions : baseRightPositions;

  // Apply rotation
  const rotated: Vec2[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = (i + rotationOffset) % 6;
    rotated.push({ ...positions[idx] });
  }

  return rotated;
}

export function getTeamBounds(side: TeamSide): { minX: number; maxX: number } {
  return side === 'left'
    ? { minX: COURT_LEFT + 15, maxX: NET_X - NET_WIDTH / 2 - 10 }
    : { minX: NET_X + NET_WIDTH / 2 + 10, maxX: COURT_RIGHT - 15 };
}
