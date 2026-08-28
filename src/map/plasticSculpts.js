// Canvas plastic miniatures for the V3.00-exp board skin.
// Visual only — hit-testing still uses the existing icon grid.

function shade(hex, amt) {
  const raw = String(hex || '#888').replace('#', '');
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0').slice(0, 6);
  const ch = (i) => Math.max(0, Math.min(255, parseInt(n.slice(i, i + 2), 16) + amt));
  return `rgb(${ch(0)},${ch(2)},${ch(4)})`;
}

function plasticFill(ctx, color, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(color, 46));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -50));
  return g;
}

function stand(ctx, x, y, size, color) {
  ctx.fillStyle = 'rgba(20,12,6,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.42, size * 0.42, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = plasticFill(ctx, color, x - size * 0.38, y + size * 0.28, size * 0.76, size * 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.34, size * 0.36, size * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,16,8,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function gloss(ctx, pathFn) {
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, 'rgba(255,255,255,0.38)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, 80, 80);
  ctx.restore();
}

export function drawPlasticSculpt(ctx, x, y, size, unitType, color, { highlight = false, damaged = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  stand(ctx, 0, 0, size, color);
  ctx.fillStyle = plasticFill(ctx, color, -size / 2, -size / 2, size, size);
  ctx.strokeStyle = 'rgba(26,16,8,0.65)';
  ctx.lineWidth = 1.2;

  const s = size * 0.46;
  ctx.beginPath();
  switch (unitType) {
    case 'infantry':
      ctx.ellipse(0, s * 0.15, s * 0.38, s * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -s * 0.55, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'armour':
      ctx.roundRect(-s * 0.85, -s * 0.15, s * 1.7, s * 0.7, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-s * 0.35, -s * 0.55, s * 0.7, s * 0.5, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(s * 0.2, -s * 0.48, s * 0.7, s * 0.12);
      break;
    case 'artillery':
      ctx.roundRect(-s * 0.7, s * 0.05, s * 1.4, s * 0.45, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, 0);
      ctx.lineTo(s * 0.95, -s * 0.65);
      ctx.lineTo(s * 0.75, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'fighter':
    case 'tacticalBomber':
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.28, s * 0.15);
      ctx.lineTo(0, s * 0.55);
      ctx.lineTo(-s * 0.28, s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, 0);
      ctx.lineTo(s * 0.95, 0);
      ctx.lineTo(0, s * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    case 'bomber':
      ctx.roundRect(-s * 0.25, -s * 0.9, s * 0.5, s * 1.6, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 1.05, 0);
      ctx.lineTo(s * 1.05, 0);
      ctx.lineTo(0, s * 0.28);
      ctx.closePath();
      ctx.fill();
      break;
    case 'submarine':
      ctx.ellipse(0, 0, s * 1.05, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.08, -s * 0.7, s * 0.16, s * 0.5);
      break;
    case 'transport':
      ctx.roundRect(-s * 0.95, -s * 0.2, s * 1.9, s * 0.7, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.55, -s * 0.55, s * 0.35, s * 0.4);
      ctx.fillRect(s * 0.1, -s * 0.55, s * 0.35, s * 0.4);
      break;
    case 'destroyer':
    case 'cruiser':
      ctx.moveTo(-s * 1.1, s * 0.25);
      ctx.lineTo(-s * 0.7, -s * 0.15);
      ctx.lineTo(s * 0.85, -s * 0.15);
      ctx.lineTo(s * 1.15, s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.15, -s * 0.55, s * 0.18, s * 0.4);
      break;
    case 'battleship':
      ctx.roundRect(-s * 1.15, -s * 0.12, s * 2.3, s * 0.55, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.45, -s * 0.55, s * 0.28, s * 0.45);
      ctx.fillRect(s * 0.15, -s * 0.55, s * 0.28, s * 0.45);
      break;
    case 'carrier':
      ctx.roundRect(-s * 1.2, -s * 0.28, s * 2.4, s * 0.7, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(color, 30);
      ctx.fillRect(-s * 0.9, -s * 0.18, s * 1.8, s * 0.16);
      break;
    case 'factory':
      ctx.rect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.8);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.55, -s * 0.75, s * 0.28, s * 0.55);
      ctx.fillRect(s * 0.1, -s * 0.9, s * 0.28, s * 0.7);
      break;
    case 'aaGun':
      ctx.arc(0, s * 0.15, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-s * 0.08, -s * 0.85, s * 0.16, s * 0.8);
      break;
    default:
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  if (highlight) {
    ctx.strokeStyle = 'rgba(240, 200, 80, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.34, size * 0.48, size * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (damaged) {
    ctx.strokeStyle = 'rgba(180,40,20,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.4);
    ctx.lineTo(s * 0.6, s * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}
