import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

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
  pausePressed: boolean;
}

export interface ClickEvent {
  x: number;
  y: number;
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
    startPressed: false,
    pausePressed: false
  };

  public analogX: number = 0;
  public analogY: number = 0;

  private prevAction: boolean = false;
  private prevJump: boolean = false;
  private prevStart: boolean = false;
  private prevPause: boolean = false;
  private pauseRequested: boolean = false;

  public latestClick: ClickEvent | null = null;

  // On-screen Touch Controls
  public hasTouchSupport: boolean = false;
  public isTouchingDpad: boolean = false;
  private dpadTouchId: number | null = null;
  public dpadBaseX: number = 130;
  public dpadBaseY: number = 425;
  public dpadCurrentX: number = 130;
  public dpadCurrentY: number = 425;
  public readonly dpadRadius: number = 55;

  public actionBtn = { x: 840, y: 420, r: 44, label: 'ACTION', isDown: false, touchId: -1 };
  public jumpBtn = { x: 730, y: 440, r: 38, label: 'JUMP', isDown: false, touchId: -1 };
  public pauseBtn = { x: 915, y: 35, r: 22, isDown: false };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupKeyboardListeners();
    this.setupTouchListeners();
    this.setupMouseListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent browser scroll with arrows and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

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
        case 'Escape':
        case 'KeyP':
          this.pauseRequested = true;
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

  public getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
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
        this.latestClick = { x: pos.x, y: pos.y };

        // Check Pause button
        const distPause = Math.hypot(pos.x - this.pauseBtn.x, pos.y - this.pauseBtn.y);
        if (distPause < this.pauseBtn.r * 1.5) {
          this.pauseRequested = true;
          continue;
        }

        // Left half -> Virtual D-Pad / Joystick
        if (pos.x < CANVAS_WIDTH / 2) {
          this.dpadTouchId = touch.identifier;
          this.isTouchingDpad = true;
          this.dpadBaseX = Math.max(70, Math.min(300, pos.x));
          this.dpadBaseY = Math.max(340, Math.min(480, pos.y));
          this.dpadCurrentX = pos.x;
          this.dpadCurrentY = pos.y;
          this.updateDpadDirection();
        } else {
          // Right half -> Action or Jump buttons
          const distJump = Math.hypot(pos.x - this.jumpBtn.x, pos.y - this.jumpBtn.y);
          const distAction = Math.hypot(pos.x - this.actionBtn.x, pos.y - this.actionBtn.y);

          if (distJump < this.jumpBtn.r * 1.4) {
            this.jumpBtn.isDown = true;
            this.jumpBtn.touchId = touch.identifier;
            this.state.jump = true;
          } else if (distAction < this.actionBtn.r * 1.4) {
            this.actionBtn.isDown = true;
            this.actionBtn.touchId = touch.identifier;
            this.state.action = true;
            this.state.start = true;
          } else {
            // General tap on right side behaves as action
            this.actionBtn.isDown = true;
            this.actionBtn.touchId = touch.identifier;
            this.state.action = true;
            this.state.start = true;
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
          this.analogX = 0;
          this.analogY = 0;
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

  private setupMouseListeners(): void {
    const handleMouseDown = (e: MouseEvent) => {
      if (this.hasTouchSupport) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.latestClick = { x: pos.x, y: pos.y };

      // Pause button click
      const distPause = Math.hypot(pos.x - this.pauseBtn.x, pos.y - this.pauseBtn.y);
      if (distPause < this.pauseBtn.r * 1.5) {
        this.pauseRequested = true;
        return;
      }

      if (pos.x < CANVAS_WIDTH / 2) {
        this.isTouchingDpad = true;
        this.dpadBaseX = Math.max(70, Math.min(300, pos.x));
        this.dpadBaseY = Math.max(340, Math.min(480, pos.y));
        this.dpadCurrentX = pos.x;
        this.dpadCurrentY = pos.y;
        this.updateDpadDirection();
      } else {
        const distJump = Math.hypot(pos.x - this.jumpBtn.x, pos.y - this.jumpBtn.y);
        if (distJump < this.jumpBtn.r * 1.4) {
          this.jumpBtn.isDown = true;
          this.state.jump = true;
        } else {
          this.actionBtn.isDown = true;
          this.state.action = true;
          this.state.start = true;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (this.hasTouchSupport) return;
      if (this.isTouchingDpad) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);
        this.dpadCurrentX = pos.x;
        this.dpadCurrentY = pos.y;
        this.updateDpadDirection();
      }
    };

    const handleMouseUp = () => {
      if (this.hasTouchSupport) return;
      if (this.isTouchingDpad) {
        this.isTouchingDpad = false;
        this.analogX = 0;
        this.analogY = 0;
        this.state.left = false;
        this.state.right = false;
        this.state.up = false;
        this.state.down = false;
      }
      this.actionBtn.isDown = false;
      this.state.action = false;
      this.state.start = false;
      this.jumpBtn.isDown = false;
      this.state.jump = false;
    };

    this.canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  private updateDpadDirection(): void {
    const dx = this.dpadCurrentX - this.dpadBaseX;
    const dy = this.dpadCurrentY - this.dpadBaseY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = this.dpadRadius;

    if (dist > 6) {
      this.analogX = Math.max(-1, Math.min(1, dx / maxRadius));
      this.analogY = Math.max(-1, Math.min(1, dy / maxRadius));
    } else {
      this.analogX = 0;
      this.analogY = 0;
    }

    const deadzone = 12;
    this.state.left = dx < -deadzone;
    this.state.right = dx > deadzone;
    this.state.up = dy < -deadzone;
    this.state.down = dy > deadzone;
  }

  public update(): void {
    // If keyboard is pressed, calculate analogX/Y from boolean keys
    if (!this.isTouchingDpad) {
      let kx = 0;
      let ky = 0;
      if (this.state.left) kx -= 1;
      if (this.state.right) kx += 1;
      if (this.state.up) ky -= 1;
      if (this.state.down) ky += 1;
      this.analogX = kx;
      this.analogY = ky;
    }

    this.state.actionPressed = this.state.action && !this.prevAction;
    this.state.jumpPressed = this.state.jump && !this.prevJump;
    this.state.startPressed = this.state.start && !this.prevStart;
    this.state.pausePressed = this.pauseRequested && !this.prevPause;

    this.prevAction = this.state.action;
    this.prevJump = this.state.jump;
    this.prevStart = this.state.start;
    this.prevPause = this.pauseRequested;
    this.pauseRequested = false;
  }

  public consumeClick(): ClickEvent | null {
    const c = this.latestClick;
    this.latestClick = null;
    return c;
  }

  public setActionLabel(label: string): void {
    this.actionBtn.label = label;
  }

  public drawControls(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Virtual Joystick
    const bx = this.isTouchingDpad ? this.dpadBaseX : 120;
    const by = this.isTouchingDpad ? this.dpadBaseY : 430;

    // Outer boundary ring with glass aesthetic
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.arc(bx, by, this.dpadRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cross direction guidelines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - 30, by);
    ctx.lineTo(bx + 30, by);
    ctx.moveTo(bx, by - 30);
    ctx.lineTo(bx, by + 30);
    ctx.stroke();

    // Stick thumb knob
    const stickDist = Math.min(this.dpadRadius - 10, Math.hypot(this.dpadCurrentX - bx, this.dpadCurrentY - by));
    const angle = Math.atan2(this.dpadCurrentY - by, this.dpadCurrentX - bx);
    const stickX = this.isTouchingDpad ? bx + Math.cos(angle) * stickDist : bx;
    const stickY = this.isTouchingDpad ? by + Math.sin(angle) * stickDist : by;

    const knobGrad = ctx.createRadialGradient(stickX, stickY - 4, 2, stickX, stickY, 24);
    knobGrad.addColorStop(0, this.isTouchingDpad ? '#38bdf8' : '#e2e8f0');
    knobGrad.addColorStop(1, this.isTouchingDpad ? '#0284c7' : '#94a3b8');

    ctx.fillStyle = knobGrad;
    ctx.beginPath();
    ctx.arc(stickX, stickY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Jump Button (Glowing Sky Blue)
    const jb = this.jumpBtn;
    ctx.fillStyle = jb.isDown ? 'rgba(56, 189, 248, 0.9)' : 'rgba(14, 165, 233, 0.55)';
    ctx.beginPath();
    ctx.arc(jb.x, jb.y, jb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JUMP', jb.x, jb.y - 1);
    ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('[K/X]', jb.x, jb.y + 12);

    // 3. Action Button (Glowing Vibrant Red/Coral)
    const ab = this.actionBtn;
    ctx.fillStyle = ab.isDown ? 'rgba(244, 63, 94, 0.95)' : 'rgba(225, 29, 72, 0.75)';
    ctx.beginPath();
    ctx.arc(ab.x, ab.y, ab.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ab.label, ab.x, ab.y - 3);
    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('[SPACE/J]', ab.x, ab.y + 14);

    // 4. Pause Button (Top Right Glass Pill)
    const pb = this.pauseBtn;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pb.x - 5, pb.y - 7, 3, 14);
    ctx.fillRect(pb.x + 2, pb.y - 7, 3, 14);

    ctx.restore();
  }
}