// ==========================================
// Game Constants & Types
// ==========================================

// Canvas dimensions (16:9 for landscape tablet)
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Court geometry
export const COURT_LEFT = 80;
export const COURT_RIGHT = 880;
export const COURT_FLOOR_Y = 420;
export const NET_X = 480;
export const NET_TOP_Y = 260;
export const NET_WIDTH = 6;

// Player dimensions & physics
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 44;
export const PLAYER_SPEED = 3.5;
export const PLAYER_JUMP_POWER = 9.5;
export const GRAVITY = 0.4;
export const HIT_COOLDOWN = 18;

// Ball physics
export const BALL_RADIUS = 8;
export const BALL_GRAVITY = 0.2;
export const BALL_MAX_SPEED = 15;

// Game rules
export const MAX_TOUCHES = 3;
export const WIN_SCORE = 15;
export const DEUCE_MARGIN = 2;
export const POINT_PAUSE_FRAMES = 120;

// ==========================================
// Types
// ==========================================

export interface Vec2 {
  x: number;
  y: number;
}

export type TeamSide = 'left' | 'right';
export type PlayerRole = 'front' | 'setter' | 'back';
export type PlayerState = 'idle' | 'run' | 'jump' | 'spike' | 'receive' | 'serve' | 'fall';
export type GamePhase = 'title' | 'ready' | 'serve' | 'play' | 'point' | 'gameOver';

// ==========================================
// Retro Color Palette
// ==========================================

export const COLORS = {
  bg: '#0f1b35',
  court: '#d4a574',
  courtDark: '#c49564',
  courtLine: '#ffffff',
  net: '#cccccc',
  netBand: '#ffffff',
  netPole: '#888888',
  shadow: 'rgba(0,0,0,0.3)',

  ball: '#f0f0f0',
  ballStripe: '#cc3333',

  team1Jersey: '#cc2222',
  team1Shorts: '#ffffff',
  team1Skin: '#f5c5a3',
  team1Hair: '#332211',

  team2Jersey: '#2244cc',
  team2Shorts: '#ffffff',
  team2Skin: '#f5c5a3',
  team2Hair: '#221133',

  scorePanel: 'rgba(0,0,0,0.7)',
  scoreText: '#ffffff',
  scoreActive: '#ffdd44',

  controlBg: 'rgba(255,255,255,0.10)',
  controlActive: 'rgba(255,255,255,0.30)',
  controlBorder: 'rgba(255,255,255,0.20)',
};

// ==========================================
// Formation Helpers
// ==========================================

export function getFormation(side: TeamSide): Record<PlayerRole, Vec2> {
  if (side === 'left') {
    return {
      front:  { x: 360, y: COURT_FLOOR_Y },
      setter: { x: 240, y: COURT_FLOOR_Y },
      back:   { x: 140, y: COURT_FLOOR_Y },
    };
  } else {
    return {
      front:  { x: 600, y: COURT_FLOOR_Y },
      setter: { x: 720, y: COURT_FLOOR_Y },
      back:   { x: 820, y: COURT_FLOOR_Y },
    };
  }
}

export function getTeamBounds(side: TeamSide): { minX: number; maxX: number } {
  return side === 'left'
    ? { minX: COURT_LEFT + 15, maxX: NET_X - NET_WIDTH / 2 - 15 }
    : { minX: NET_X + NET_WIDTH / 2 + 15, maxX: COURT_RIGHT - 15 };
}
