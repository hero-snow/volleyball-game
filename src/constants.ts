// 画面・コート定数
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;

// コート寸法
export const FLOOR_Y = 215;
export const COURT_LEFT = 50;
export const COURT_RIGHT = 430;
export const COURT_WIDTH = COURT_RIGHT - COURT_LEFT; // 380
export const NET_X = 240;
export const NET_HEIGHT = 70;
export const NET_TOP_Y = FLOOR_Y - NET_HEIGHT; // 145
export const NET_WIDTH = 4;
export const ATTACK_LINE_OFFSET = 60;
export const PLAYER_ATTACK_X = NET_X - ATTACK_LINE_OFFSET; // 180
export const CPU_ATTACK_X = NET_X + ATTACK_LINE_OFFSET; // 300

export function projectCourtPosition(x: number, depth: number, height: number = 0): { x: number; y: number } {
  const perspectiveScale = 0.84 + depth * 0.08;
  return {
    x: CANVAS_WIDTH / 2 + (x - NET_X) * perspectiveScale,
    y: 146 + (depth - 0.5) * 118 - height * perspectiveScale * 0.7
  };
}

// 物理演算
export const GRAVITY = 0.28;
export const AIR_RESISTANCE = 0.995;
export const BALL_BOUNCE = 0.55;
export const BALL_RADIUS = 4.5;

// プレイヤー寸法と性能
export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 32;
export const PLAYER_SPEED = 2.0;
export const JUMP_IMPULSE = -5.8;

// ゲームルール
export const MAX_TOUCHES = 3;
export const DEFAULT_WIN_SCORE = 25;

// チーム定義
export enum Team {
  PLAYER = 'PLAYER',
  CPU = 'CPU'
}

// プレイヤーステート
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

// ゲームステート
export enum GameState {
  TITLE = 'TITLE',
  SERVE_WAIT = 'SERVE_WAIT',
  SERVE_IN_AIR = 'SERVE_IN_AIR',
  RALLY = 'RALLY',
  BALL_DEAD = 'BALL_DEAD',
  POINT_SCORED = 'POINT_SCORED',
  MATCH_END = 'MATCH_END'
}

// ファミコン風NESカラーパレット
export const NES_COLORS = {
  BLACK: '#000000',
  WHITE: '#fcfcfc',
  GRAY_LIGHT: '#bcbcbc',
  GRAY_DARK: '#7c7c7c',
  DARK_BG: '#0b1626',
  FLOOR_DARK: '#a85b20',
  FLOOR_LIGHT: '#c8782a',
  COURT_LINE: '#ffffff',
  COURT_FILL: '#206030',
  NET_POST: '#888888',
  NET_MESH: '#d8d8d8',
  NET_TOP: '#f83800',
  BALL_WHITE: '#fcfcfc',
  BALL_LINE: '#3858a8',
  SHADOW: 'rgba(0, 0, 0, 0.45)',

  // 1Pチーム
  TEAM_PLAYER_SKIN: '#fca044',
  TEAM_PLAYER_HAIR: '#000000',
  TEAM_PLAYER_SHIRT: '#fcfcfc',
  TEAM_PLAYER_PANTS: '#d82800',
  TEAM_PLAYER_SHOES: '#0058f8',

  // CPUチーム
  TEAM_CPU_SKIN: '#fcd8a8',
  TEAM_CPU_HAIR: '#a84400',
  TEAM_CPU_SHIRT: '#00a800',
  TEAM_CPU_PANTS: '#fcb800',
  TEAM_CPU_SHOES: '#fcfcfc',

  // UI・文字
  TEXT_YELLOW: '#fcb800',
  TEXT_WHITE: '#ffffff',
  TEXT_RED: '#d82800',
  TEXT_BLUE: '#00a8f8',
  UI_PANEL: '#181828'
};