// Mặt bằng theo QUY MÔ (dữ liệu, không vẽ): nhóm nhỏ (1 phòng) · công ty (khu nhiều phòng) · tập đoàn (toà nhà nhiều
// tầng, tầng trên cùng là mặt bằng công ty). scene.js đọc plan để vẽ; three-view.js đọc cùng plan cho camera.
// Toạ độ: x sang phải-xuống, y sang trái-xuống, z lên (như iso.js). Bàn: [x, y] góc bàn 2.8×1.1, người ngồi phía +y.

export const SCALES = [
  { id: "team", name: "Nhóm nhỏ — 1 phòng" },
  { id: "company", name: "Công ty — nhiều phòng" },
  { id: "corp", name: "Tập đoàn — toà nhà" },
];

// [trục, vị trí, từ, đến, [cửa: [từ, đến]…]] — "x": vách chạy dọc x tại y = vị trí; "y": chạy dọc y tại x = vị trí.
const TEAM_WALLS = {
  open: [],
  connected: [
    ["x", 5.2, 0, 16, [[1.8, 3.6], [10.2, 12.0]]],
    ["y", 8.6, 0, 12, [[2.2, 3.8], [8.2, 9.8]]],
  ],
  private: [
    ["x", 5.2, 0, 12.6, [[0.6, 1.4], [6.8, 7.6], [10.8, 11.6]]],
    ["y", 4.6, 0, 11.0, [[5.6, 6.0]]],
    ["y", 8.6, 0, 11.0, [[5.6, 6.0]]],
    ["y", 12.6, 0, 5.2, []],
  ],
};

const TEAM = {
  W: 16, D: 12, H: 4, tile: 1, outdoor: false, levels: 0,
  windows: [[1.2, 2.8], [5.2, 2.8], [9.2, 2.8]],
  leftWindows: [[2.2, 2.6]],
  desks: [[1.2, 1.2], [5.2, 1.2], [9.2, 1.2], [1.2, 6.2], [5.2, 6.2]],
  extraDesks: [],
  rooms: [],
  props: null, // null = đồ đạc của kiểu văn phòng (themes.js)
  season: [9.0, 7.6],
};

// Công ty 44×22: hàng sau 6 phòng chức năng, hàng trước khu làm việc mở 28 bàn + vườn hồ bơi.
const CW = 44, CD = 22, ROW = 8;
const COMPANY_ROOMS = [
  { id: "reception", name: "Lễ tân", x: 0, y: 0, w: 8, d: ROW, floor: "#e7dcc8" },
  { id: "director", name: "Giám đốc", x: 8, y: 0, w: 6, d: ROW, floor: "#b08968" },
  { id: "meeting", name: "Phòng họp", x: 14, y: 0, w: 10, d: ROW, floor: "#cbd5e1" },
  { id: "server", name: "Server", x: 24, y: 0, w: 5, d: ROW, floor: "#475569" },
  { id: "pantry", name: "Pantry", x: 29, y: 0, w: 7, d: ROW, floor: "#f1e3c6" },
  { id: "nap", name: "Ngủ trưa", x: 36, y: 0, w: 8, d: ROW, floor: "#ddd6fe" },
  { id: "work", name: "Khu làm việc", x: 0, y: ROW, w: 30, d: CD - ROW, floor: null },
  { id: "garden", name: "Vườn & hồ bơi", x: 30, y: ROW, w: 14, d: CD - ROW, floor: "#86c06c" },
];

const COMPANY_DESKS = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) COMPANY_DESKS.push([1.0 + c * 4.0, 9.4 + r * 3.2]);

const COMPANY_PROPS = [
  // Lễ tân
  { kind: "logo", x: 1.2, w: 5.4, text: true },
  { kind: "counter", x: 2.0, y: 2.6 },
  { kind: "sofa", x: 1.6, y: 5.6, color: "#64748b" },
  { kind: "plant", x: 7.0, y: 0.6 }, { kind: "plant", x: 0.5, y: 6.8 },
  // Giám đốc
  { kind: "bigdesk", x: 9.4, y: 2.4 },
  { kind: "shelf", x: 12.2, y: 0.3, color: "#6b4226" },
  { kind: "plant", x: 13.1, y: 6.6 },
  // Phòng họp
  { kind: "meeting", x: 15.6, y: 2.8, seats: 6 },
  { kind: "screen", x: 17.0, w: 4.2 },
  { kind: "plant", x: 23.0, y: 0.6 },
  // Server
  { kind: "rack", x: 24.6, y: 1.0 }, { kind: "rack", x: 25.8, y: 1.0 }, { kind: "rack", x: 27.0, y: 1.0 },
  { kind: "rack", x: 24.6, y: 3.4 }, { kind: "rack", x: 25.8, y: 3.4 }, { kind: "rack", x: 27.0, y: 3.4 },
  // Pantry
  { kind: "counter", x: 29.8, y: 0.5 },
  { kind: "cooler", x: 34.6, y: 0.6 },
  { kind: "cafetable", x: 31.0, y: 4.0 }, { kind: "cafetable", x: 33.8, y: 5.4 },
  // Ngủ trưa
  { kind: "bed", x: 37.4, y: 1.0 }, { kind: "bed", x: 37.4, y: 3.2 }, { kind: "bed", x: 40.8, y: 1.0 }, { kind: "bed", x: 40.8, y: 3.2 },
  // Khu làm việc
  { kind: "plant", x: 28.8, y: 8.6 }, { kind: "plant", x: 0.4, y: 21.0 }, { kind: "cooler", x: 29.0, y: 21.0 },
  { kind: "board", x: 0.05, y: 13.0, side: "left" },
  // Vườn & hồ bơi
  { kind: "pool", x: 33.0, y: 9.6, w: 8.0, d: 4.4 },
  { kind: "tree", x: 31.0, y: 15.4 }, { kind: "tree", x: 41.8, y: 15.0, color: "#c2410c" }, { kind: "tree", x: 36.2, y: 19.4 },
  { kind: "bench", x: 32.6, y: 18.6 }, { kind: "bench", x: 38.4, y: 17.0 },
  { kind: "umbrella", x: 42.6, y: 10.0 },
];

const COMPANY_BASE_WALLS = [
  ["y", 8, 0, ROW, [[6.2, 7.6]]],
  ["y", 14, 0, ROW, [[6.2, 7.6]]],
  ["y", 24, 0, ROW, [[6.2, 7.6]]],
  ["y", 29, 0, ROW, [[6.2, 7.6]]],
  ["y", 36, 0, ROW, [[6.2, 7.6]]],
  ["x", ROW, 0, CW, [[2.8, 4.8], [10.0, 12.0], [18.0, 20.0], [25.8, 27.2], [31.6, 33.6], [39.0, 41.0]]],
  ["y", 30, ROW, CD, [[14.6, 17.0]]],
];
// Bố cục chỉ đổi phần khu làm việc: liên thông = chia đôi có cửa rộng; mỗi người một phòng = vách giữa các cột bàn.
const COMPANY_LAYOUT_WALLS = {
  open: [],
  connected: [["y", 16, ROW, CD, [[10.6, 13.0], [17.0, 19.4]]]],
  private: [4, 8, 12, 16, 20, 24].map((x) => ["y", x, ROW + 0.6, CD - 0.6, [[11.6, 12.4], [14.8, 15.6], [18.0, 18.8]]]),
};

function company(layout) {
  return {
    W: CW, D: CD, H: 4, tile: 2, outdoor: true, levels: 0,
    windows: [[9.2, 3.2], [14.4, 2.4], [21.4, 2.4], [30.0, 2.6], [37.0, 2.6], [40.6, 2.6]], // lễ tân: logo; họp: màn hình giữa
    leftWindows: [[1.8, 4.0], [10.0, 3.0], [15.6, 3.0]],
    desks: COMPANY_DESKS.slice(0, 5),
    extraDesks: COMPANY_DESKS.slice(5),
    rooms: COMPANY_ROOMS,
    props: COMPANY_PROPS,
    walls: [...COMPANY_BASE_WALLS, ...(COMPANY_LAYOUT_WALLS[layout] || [])],
    season: [34.5, 15.4],
  };
}

export function planFor(scale, layout) {
  if (scale === "company") return company(layout);
  if (scale === "corp") return { ...company(layout), levels: 4, levelH: 4.4 };
  return { ...TEAM, walls: TEAM_WALLS[layout] || [] };
}

// Hộp bao (thế giới) để camera nhìn: toàn cảnh, một phòng, hoặc bàn của một agent. zBase: cao độ sàn tầng trên.
export function viewBox(plan, focus, seatIndex) {
  const zb = plan.levels ? plan.levels * plan.levelH : 0;
  const top = zb + plan.H;
  if (Number.isInteger(seatIndex) && seatIndex >= 0 && seatIndex < plan.desks.length) {
    const [x, y] = plan.desks[seatIndex];
    return { x0: x - 2.5, y0: y - 2, x1: x + 5.5, y1: y + 4.5, z0: zb, z1: zb + 2.5 };
  }
  const room = plan.rooms.find((r) => r.id === focus);
  if (room) return { x0: room.x, y0: room.y, x1: room.x + room.w, y1: room.y + room.d, z0: zb, z1: top };
  const pad = plan.outdoor ? (plan.levels ? 6 : 4) : 0;
  return { x0: plan.outdoor ? -1.5 : 0, y0: plan.outdoor ? -1.5 : 0, x1: plan.W + pad, y1: plan.D + pad, z0: 0, z1: top };
}
