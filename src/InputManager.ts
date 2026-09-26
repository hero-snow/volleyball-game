export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
  actionPressed: boolean;
  jump: boolean;
  jumpPressed: boolean;
  start: boolean;
  startPressed: boolean;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  public state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    actionPressed: false,
    jump: false,
    jumpPressed: false,
    start: false,
    startPressed: false
  };

  private prevAction: boolean = false;
  private prevJump: boolean = false;
  private prevStart: boolean = false;

  private dpadTouchId: number | null = null;
  private dpadBaseX: number = 80;
  private dpadBaseY: number = 200;
  private dpadCurrentX: number = 80;
  private dpadCurrentY: number = 200;
  public isTouchingDpad: boolean = false;

  public actionBtn = { x: 420, y: 215, r: 24, label: 'ACTION', isDown: false, touchId: -1 };
  public jumpBtn = { x: 360, y: 225, r: 22, label: 'JUMP', isDown: false, touchId: -1 };

  public hasTouchSupport: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupKeyboardListeners();
    this.setupTouchListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.state.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.state.down = true;
          break;
        case 'KeyZ':
        case 'KeyJ':
        case 'Space':
          this.state.action = true;
          break;
        case 'KeyX':
        case 'KeyK':
          this.state.jump = true;
          break;
        case 'Enter':
          this.state.start = true;
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.state.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.state.down = false;
          break;
        case 'KeyZ':
        case 'KeyJ':
        case 'Space':
          this.state.action = false;
          break;
        case 'KeyX':
        case 'KeyK':
          this.state.jump = false;
          break;
        case 'Enter':
          this.state.start = false;
          break;
      }
    });
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 480 / rect.width;
    const scaleY = 270 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private setupTouchListeners(): void {
    const handleTouchStart = (e: TouchEvent) => {
      this.hasTouchSupport = true;
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = this.getCanvasPos(touch.clientX, touch.clientY);

        if (pos.x < 240) {
          this.dpadTouchId = touch.identifier;
          this.isTouchingDpad = true;
          this.dpadBaseX = Math.max(45, Math.min(180, pos.x));
          this.dpadBaseY = Math.max(160, Math.min(240, pos.y));
          this.dpadCurrentX = pos.x;
          this.dpadCurrentY = pos.y;
          this.updateDpadDirection();
        } else {
          const distAction = Math.hypot(pos.x - this.actionBtn.x, pos.y - this.actionBtn.y);
          if (distAction < this.actionBtn.r * 1.5) {
            this.actionBtn.isDown = true;
            this.actionBtn.touchId = touch.identifier;
            this.state.action = true;
            this.state.start = true;
          } else {
            const distJump = Math.hypot(pos.x - this.jumpBtn.x, pos.y - this.jumpBtn.y);
            if (distJump < this.jumpBtn.r * 1.5) {
              this.jumpBtn.isDown = true;
              this.jumpBtn.touchId = touch.identifier;
              this.state.jump = true;
            } else {
              this.actionBtn.isDown = true;
              this.actionBtn.touchId = touch.identifier;
              this.state.action = true;
              this.state.start = true;
            }
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.dpadTouchId) {
          const pos = this.getCanvasPos(touch.clientX, touch.clientY);
          this.dpadCurrentX = pos.x;
          this.dpadCurrentY = pos.y;
          this.updateDpadDirection();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === this.dpadTouchId) {
          this.dpadTouchId = null;
          this.isTouchingDpad = false;
          this.state.left = false;
          this.state.right = false;
          this.state.up = false;
          this.state.down = false;
        }

        if (touch.identifier === this.actionBtn.touchId) {
          this.actionBtn.isDown = false;
          this.actionBtn.touchId = -1;
          this.state.action = false;
          this.state.start = false;
        }

        if (touch.identifier === this.jumpBtn.touchId) {
          this.jumpBtn.isDown = false;
          this.jumpBtn.touchId = -1;
          this.state.jump = false;
        }
      }
    };

    this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  private updateDpadDirection(): void {
    const dx = this.dpadCurrentX - this.dpadBaseX;
    const dy = this.dpadCurrentY - this.dpadBaseY;
    const deadzone = 8;

    this.state.left = dx < -deadzone;
    this.state.right = dx > deadzone;
    this.state.up = dy < -deadzone;
    this.state.down = dy > deadzone;
  }

  public update(): void {
    this.state.actionPressed = this.state.action && !this.prevAction;
    this.state.jumpPressed = this.state.jump && !this.prevJump;
    this.state.startPressed = this.state.start && !this.prevStart;

    this.prevAction = this.state.action;
    this.prevJump = this.state.jump;
    this.prevStart = this.state.start;
  }

  public setActionLabel(label: string): void {
    this.actionBtn.label = label;
  }

  public drawTouchControls(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const bx = this.isTouchingDpad ? this.dpadBaseX : 60;
    const by = this.isTouchingDpad ? this.dpadBaseY : 215;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(bx, by, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(bx - 26, by - 8, 52, 16);
    ctx.fillRect(bx - 8, by - 26, 16, 52);

    const stickX = this.isTouchingDpad ? Math.max(bx - 24, Math.min(bx + 24, this.dpadCurrentX)) : bx;
    const stickY = this.isTouchingDpad ? Math.max(by - 24, Math.min(by + 24, this.dpadCurrentY)) : by;

    ctx.fillStyle = this.isTouchingDpad ? 'rgba(252, 160, 68, 0.7)' : 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(stickX, stickY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = this.jumpBtn.isDown ? 'rgba(0, 168, 248, 0.85)' : 'rgba(0, 168, 248, 0.4)';
    ctx.beginPath();
    ctx.arc(this.jumpBtn.x, this.jumpBtn.y, this.jumpBtn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JUMP', this.jumpBtn.x, this.jumpBtn.y);

    ctx.fillStyle = this.actionBtn.isDown ? 'rgba(248, 56, 0, 0.9)' : 'rgba(248, 56, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(this.actionBtn.x, this.actionBtn.y, this.actionBtn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(this.actionBtn.label, this.actionBtn.x, this.actionBtn.y);

    ctx.restore();
  }
}