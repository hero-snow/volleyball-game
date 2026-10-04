// Canvas resolution - Modern 16:9 HD canvas (crisp rendering)
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Court Dimensions (2.5D Isometric Side-Angle View)
export const FLOOR_Y = 430;
export const COURT_LEFT = 110;
export const COURT_RIGHT = 850;
export const COURT_WIDTH = COURT_RIGHT - COURT_LEFT; // 740
export const NET_X = 480;
export const NET_HEIGHT = 135;
export const NET_TOP_Y = FLOOR_Y - NET_HEIGHT; // 295
export const NET_WIDTH = 8;
export const ATTACK_LINE_OFFSET = 125;
export const PLAYER_ATTACK_X = NET_X - ATTACK_LINE_OFFSET; // 355
export const CPU_ATTACK_X = NET_X + ATTACK_LINE_OFFSET; // 605

// Modern 2.5D Perspective Projection
export function projectCourtPosition(x: number, depth: number, height: number = 0): { x: number; y: number; scale: number } {
  // depth: 0.0 (far side of court) to 1.0 (near side closest to camera)
  const perspectiveScale = 0.88 + depth * 0.24;
  return {
    x: CANVAS_WIDTH / 2 + (x - NET_X) * perspectiveScale,
    y: 295 + (depth - 0.5) * 230 - height * perspectiveScale * 0.85,
    scale: perspectiveScale
  };
}

// Physics Constants
export const GRAVITY = 0.38;
export const AIR_RESISTANCE = 0.994;
export const BALL_BOUNCE = 0.62;
export const BALL_RADIUS = 9;

// Player Specifications
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 54;
export const PLAYER_SPEED = 3.6;
export const JUMP_IMPULSE = -8.6;

// Rules
export const MAX_TOUCHES = 3;

// Teams
export enum Team {
  PLAYER = 'PLAYER',
  CPU = 'CPU'
}

// Player Action States
export enum PlayerState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  SPIKE = 'SPIKE',
  RECEIVE = 'RECEIVE',
  TOSS = 'TOSS',
  BLOCK = 'BLOCK',
  DIVE = 'DIVE',
  SERVE_PREPARE = 'SERVE_PREPARE',
  SERVE_TOSS = 'SERVE_TOSS',
  SERVE_HIT = 'SERVE_HIT',
  CELEBRATE = 'CELEBRATE',
  DISAPPOINTED = 'DISAPPOINTED'
}

// Game Flow States
export enum GameState {
  TITLE = 'TITLE',
  MODE_SELECT = 'MODE_SELECT',
  SERVE_WAIT = 'SERVE_WAIT',
  SERVE_IN_AIR = 'SERVE_IN_AIR',
  RALLY = 'RALLY',
  BALL_DEAD = 'BALL_DEAD',
  POINT_SCORED = 'POINT_SCORED',
  MATCH_END = 'MATCH_END',
  PAUSED = 'PAUSED'
}

// Game Modes
export enum GameMode {
  QUICK = 'QUICK',
  TOURNAMENT = 'TOURNAMENT',
  PRACTICE = 'PRACTICE'
}

// Modern Sports Color Palette
export const MODERN_PALETTE = {
  // Background & Arena
  ARENA_BG_TOP: '#0b111e',
  ARENA_BG_BOTTOM: '#141d2f',
  ARENA_LIGHT: 'rgba(255, 255, 255, 0.08)',
  
  // Hardwood Court
  PARQUET_BASE: '#d48834',
  PARQUET_HIGHLIGHT: '#e69a48',
  PARQUET_SHADOW: '#ba7224',
  COURT_BLUE_ZONE: '#1e40af',
  COURT_BLUE_INNER: '#2563eb',
  COURT_BORDER_LINE: '#ffffff',
  COURT_ATTACK_LINE: '#f59e0b',
  
  // Net
  NET_POST: '#94a3b8',
  NET_CABLE: '#e2e8f0',
  NET_BAND_TOP: '#ef4444',
  NET_MESH: 'rgba(255, 255, 255, 0.4)',
  ANTENNA: '#ef4444',
  
  // Ball
  BALL_COLOR_1: '#ffffff',
  BALL_COLOR_2: '#2563eb', // Modern Olympic tricolor
  BALL_COLOR_3: '#facc15',
  BALL_LINE: '#1e293b',
  BALL_SHADOW: 'rgba(0, 0, 0, 0.35)',

  // Team 1: Thunder Cyan (Player)
  TEAM_PLAYER: {
    name: 'THUNDER FALCONS',
    jerseyPrimary: '#0284c7', // Cyan / Sky Blue
    jerseySecondary: '#0369a1',
    jerseyNumber: '#ffffff',
    shorts: '#0f172a',
    shoes: '#38bdf8',
    skin: '#fbd38d',
    hair: '#1e293b',
    glow: 'rgba(14, 165, 233, 0.5)'
  },

  // Team 2: Blaze Tigers (CPU default)
  TEAM_CPU: {
    name: 'BLAZE TIGERS',
    jerseyPrimary: '#e11d48', // Crimson Red
    jerseySecondary: '#be123c',
    jerseyNumber: '#fef08a',
    shorts: '#18181b',
    shoes: '#fb7185',
    skin: '#fed7aa',
    hair: '#b45309',
    glow: 'rgba(225, 29, 72, 0.5)'
  },

  // Rival Teams for Tournament
  TOURNAMENT_TEAMS: [
    {
      name: 'TOKYO WAVES',
      city: 'Tokyo, Japan',
      jerseyPrimary: '#059669', // Emerald Green
      jerseySecondary: '#047857',
      jerseyNumber: '#ffffff',
      shorts: '#064e3b',
      shoes: '#34d399',
      skin: '#fcd34d',
      hair: '#111827',
      glow: 'rgba(16, 185, 129, 0.5)',
      difficulty: 'CASUAL' as const
    },
    {
      name: 'RIO SUNSET',
      city: 'Rio de Janeiro, Brazil',
      jerseyPrimary: '#d97706', // Sunset Amber
      jerseySecondary: '#b45309',
      jerseyNumber: '#1e293b',
      shorts: '#451a03',
      shoes: '#fbbf24',
      skin: '#d97706',
      hair: '#451a03',
      glow: 'rgba(245, 158, 11, 0.5)',
      difficulty: 'PRO' as const
    },
    {
      name: 'MILANO TITANS',
      city: 'Milano, Italy',
      jerseyPrimary: '#7c3aed', // Purple Violet
      jerseySecondary: '#6d28d9',
      jerseyNumber: '#ffffff',
      shorts: '#2e1065',
      shoes: '#a78bfa',
      skin: '#fed7aa',
      hair: '#18181b',
      glow: 'rgba(124, 58, 237, 0.5)',
      difficulty: 'MASTER' as const
    }
  ],

  // UI Accents
  GOLD: '#f59e0b',
  CYAN: '#06b6d4',
  WHITE: '#ffffff',
  DARK_PANEL: 'rgba(15, 23, 42, 0.85)',
  CARD_BORDER: 'rgba(255, 255, 255, 0.12)'
};