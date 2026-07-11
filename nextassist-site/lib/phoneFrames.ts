export const TOTAL_FRAMES = 120;

export function framePath(index: number) {
  return `/phone-frames/frame-${String(index + 1).padStart(4, "0")}.webp`;
}

export function normalizeFrame(frame: number) {
  return ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
}

export function preloadPhoneFrames(): HTMLImageElement[] {
  return Array.from({ length: TOTAL_FRAMES }, (_, i) => {
    const img = new window.Image();
    img.decoding = "async";
    img.src = framePath(i);
    return img;
  });
}

export function drawPhoneFrameContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const x = (canvasWidth - drawWidth) / 2;
  const y = (canvasHeight - drawHeight) / 2;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}
