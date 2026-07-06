import type { GameMap, Pos } from "./types";

/**
 * Bresenham's line algorithm — returns all intermediate tiles between from and to
 * (not including source and destination)
 */
export function bresenham(from: Pos, to: Pos): Pos[] {
  const points: Pos[] = [];
  let r0 = from.row;
  let c0 = from.col;
  const r1 = to.row;
  const c1 = to.col;

  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  while (true) {
    // If we've reached the destination, stop (don't include dest)
    if (r0 === r1 && c0 === c1) break;

    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; r0 += sr; }
    if (e2 < dr)  { err += dr; c0 += sc; }

    // If we've reached the destination after stepping, don't add it
    if (r0 === r1 && c0 === c1) break;

    points.push({ row: r0, col: c0 });
  }

  return points;
}

/**
 * Returns true if unit at `from` can see tile at `to` given the map.
 * LOS rules:
 * - Walk the Bresenham line from `from` to `to`
 * - building → always blocks
 * - woods → blocks if path has traversed more than 2 wood tiles
 * - wheatfield → blocks if path has traversed more than 3 wheatfield tiles
 * - wall → does not block LOS
 * - Source and destination tiles do not block LOS
 */
export function hasLOS(map: GameMap, from: Pos, to: Pos): boolean {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;

  // Same tile always has LOS
  if (from.row === to.row && from.col === to.col) return true;

  const intermediate = bresenham(from, to);

  let woodCount = 0;
  let wheatCount = 0;

  for (const pos of intermediate) {
    // Out of bounds check
    if (pos.row < 0 || pos.row >= rows || pos.col < 0 || pos.col >= cols) {
      return false;
    }

    const tile = map[pos.row][pos.col];
    const terrain = tile.terrain;

    if (terrain === "building") {
      return false;
    }

    if (terrain === "woods") {
      woodCount++;
      if (woodCount > 2) return false;
    } else {
      woodCount = 0; // reset consecutive count
    }

    if (terrain === "wheatfield") {
      wheatCount++;
      if (wheatCount > 3) return false;
    } else {
      wheatCount = 0;
    }
  }

  return true;
}
