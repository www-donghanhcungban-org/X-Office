// F-008 Văn phòng (SPEC-app §4): agent ngồi bàn theo dữ liệu thật của vòng (`GET /api/office`), nhiều kiểu văn phòng.
// Bộ vẽ mặc định: Canvas 2D tự viết (không thư viện); tuỳ chọn 3D: three.js vendor, tải lười khi chọn (office/three-view.js).
// Bản văn bản tương đương ngay dưới canvas; chuyển động tắt khi prefers-reduced-motion.
import { THEMES, SEASONS, resolveSeason, themeById } from "../office/themes.js";
import { drawScene, describe, LAYOUTS, STATE_TEXT, npcSeated, viewCorners } from "../office/scene.js";
import { fitPoints } from "../office/iso.js";
import { SCALES, planFor } from "../office/plans.js";

const PREF_KEY = "xt-office";
const POLL_MS = 10000;
const RENDERERS = [{ id: "2d", name: "2D isometric (nhẹ)" }, { id: "3d", name: "3D three.js (kéo để xoay)" }];

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function savePrefs(p) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* chế độ riêng tư/chặn lưu: bỏ qua, mặc định vẫn chạy */
  }
}

function select(h, id, label, options, value) {
  const el = h("select", { id }, options.map((o) => h("option", { value: o.id, selected: o.id === value }, o.name)));
  return [h("label", { for: id }, label), el];
}

function check(h, id, label, value) {
  const el = h("input", { type: "checkbox", id, checked: value });
  return [el, h("label", { for: id }, label)];
}

// Hàng bảng: tên agent là nút "tới bàn" (camera bay tới bàn đó) — cùng hành vi cho chuột và bàn phím.
function seatRows(h, seats, goSeat) {
  return seats.map((s, i) => h("tr", null,
    h("th", { scope: "row" }, (() => {
      const b = h("button", { type: "button", class: "link", "aria-label": "Tới bàn " + s.label }, s.label);
      b.addEventListener("click", () => goSeat(i));
      return b;
    })()),
    h("td", null, h("span", { class: "office-state office-" + s.state }, STATE_TEXT[s.state] || s.state)),
    h("td", null, s.task ? s.task.id + (s.task.title ? " — " + s.task.title : "") : "—")));
}

export async function render(main, { api, h, error }) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefs = {
    renderer: "2d", scale: "team", layout: "open", theme: "night", season: "auto", names: true, npc: true, motion: true,
    quality: "high", zoom: 1, ...loadPrefs(),
  };
  const view = { focus: null, seat: null, pan: { x: 0, y: 0 } }; // không lưu: mở lại màn là toàn cảnh
  // Giá trị đã lưu không còn trong danh sách (bản cũ/sửa tay) → mặc định: ô chọn, mặt bằng và luật hiệu năng (chỉ nhóm nhỏ
  // bật quầng sáng/bóng) cùng thấy một quy mô.
  for (const [k, list, d] of [["scale", SCALES, "team"], ["layout", LAYOUTS, "open"], ["theme", THEMES, "night"],
    ["season", SEASONS, "auto"], ["renderer", RENDERERS, "2d"]]) {
    if (!list.some((o) => o.id === prefs[k])) prefs[k] = d;
  }
  if (reduce) prefs.motion = false; // hệ thống xin giảm chuyển động thắng lựa chọn đã lưu; bật lại tay chỉ cho phiên này
  const [rendererLabel, rendererSel] = select(h, "office-renderer", "Bộ vẽ", RENDERERS, prefs.renderer);
  const [scaleLabel, scaleSel] = select(h, "office-scale", "Quy mô", SCALES, prefs.scale);
  const [layoutLabel, layoutSel] = select(h, "office-layout", "Bố cục", LAYOUTS, prefs.layout);
  const [themeLabel, themeSel] = select(h, "office-theme", "Kiểu văn phòng", THEMES, prefs.theme);
  const [seasonLabel, seasonSel] = select(h, "office-season", "Mùa", SEASONS, prefs.season);
  const [qualityLabel, qualitySel] = select(h, "office-quality", "Chất lượng",
    [{ id: "high", name: "Cao" }, { id: "low", name: "Thấp (máy yếu)" }], prefs.quality);
  const [namesBox, namesLabel] = check(h, "office-names", "Nhãn tên", prefs.names);
  const [motionBox, motionLabel] = check(h, "office-motion", "Chuyển động", prefs.motion);
  const [npcBox, npcLabel] = check(h, "office-npc", "Nhân viên minh hoạ", prefs.npc);
  const rooms = h("div", { class: "office-rooms", role: "group", "aria-label": "Tới phòng" });
  const counters = h("p", { class: "office-counters" });
  const legend = h("p", { class: "muted" });
  const zoomOut = h("button", { type: "button", "aria-label": "Thu nhỏ" }, "−");
  const zoomIn = h("button", { type: "button", "aria-label": "Phóng to" }, "+");
  const refresh = h("button", { type: "button" }, "Làm mới");
  // tabindex 0: canvas 2D nhận focus để dời góc nhìn bằng phím mũi tên (thay cho kéo chuột — WCAG 2.1.1).
  const canvas = h("canvas", { class: "office-canvas", role: "img", tabindex: "0", "aria-label": "Văn phòng đang tải" });
  const stage = h("div", { class: "office-stage" }, canvas);
  // Gợi ý phím hiển thị cho canvas có focus (cả 2D và 3D trỏ tới qua aria-describedby).
  const keys = h("p", { class: "muted office-keys", id: "office-keys" });
  canvas.setAttribute("aria-describedby", "office-keys");
  const summary = h("p", { class: "muted", "aria-live": "polite" });
  const table = h("tbody", null);
  const human = h("div", null);
  const feed = h("ol", { class: "items office-feed" });
  const msg = h("div", null);
  const rmsg = h("div", null); // thông báo của bộ vẽ — tách khỏi lỗi API để lần hỏi dữ liệu kế tiếp không xoá

  main.replaceChildren(
    h("h1", null, "Văn phòng"),
    h("p", { class: "muted" }, "Trạng thái suy ra từ bằng chứng trên đĩa (PLAN, .autopilot/runs.jsonl, việc chờ người) — không phải tín hiệu thời gian thực."),
    h("div", { class: "office-bar", role: "group", "aria-label": "Tuỳ chọn văn phòng" },
      h("span", null, rendererLabel, rendererSel), h("span", null, scaleLabel, scaleSel), h("span", null, layoutLabel, layoutSel),
      h("span", null, themeLabel, themeSel), h("span", null, seasonLabel, seasonSel), h("span", null, qualityLabel, qualitySel),
      h("span", null, namesBox, namesLabel), h("span", null, npcBox, npcLabel), h("span", null, motionBox, motionLabel),
      h("span", null, zoomOut, zoomIn, refresh)),
    rooms, msg, rmsg, stage, keys, counters, summary,
    legend,
    h("h2", null, "Ai đang làm gì"),
    h("table", null, h("thead", null, h("tr", null, h("th", { scope: "col" }, "Bàn"), h("th", { scope: "col" }, "Trạng thái"), h("th", { scope: "col" }, "Task"))), table),
    h("h2", null, "Việc cần người"), human,
    h("h2", null, "Hoạt động gần đây"), feed,
  );

  let data = { seats: [], feed: [], pending_human: [], tasks: { open: 0, done: 0, skipped: 0 }, loop: { verdict: "inactive" } };
  let loaded = false;
  let dirty = true;
  let seatsKey = "";

  // Bảng chỉ dựng lại khi dữ liệu bàn đổi — poll 10 s không được gỡ nút đang giữ focus bàn phím (WCAG 2.4.3); đổi thật thì
  // trả focus về đúng nút "tới bàn" cùng vị trí.
  function renderSeats(seats) {
    const key = JSON.stringify(seats);
    if (key === seatsKey) return;
    seatsKey = key;
    const buttons = [...table.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement);
    table.replaceChildren(...seatRows(h, seats, goSeat));
    if (at >= 0) table.querySelectorAll("button")[Math.min(at, seats.length - 1)]?.focus({ preventScroll: true });
  }

  function apply(d) {
    data = d;
    loaded = true;
    dirty = true;
    renderSeats(d.seats);
    human.replaceChildren(d.pending_human.length
      ? h("ul", null, d.pending_human.map((x) => h("li", null, h("strong", null, x.id), x.reason ? " — " + x.reason : "")))
      : h("p", null, "Không có việc chờ người."));
    feed.replaceChildren(...(d.feed.length
      ? d.feed.map((r) => h("li", null, h("span", { class: r.ok ? "office-ok" : "office-bad" }, r.ok ? "xanh" : "đỏ"),
        " " + (r.task ? r.task.id : "?") + " · " + r.agent + (r.at ? " · " + r.at : "")))
      : [h("li", { class: "muted" }, "Chưa có lần chạy Gate nào (loop record).")]));
    summary.textContent = "Vòng: " + d.loop.verdict + " · task mở " + d.tasks.open + ", xong " + d.tasks.done + ".";
    count();
    label();
  }

  // Hộp lỗi API: cùng thông điệp với lần đang hiện thì giữ nguyên (poll 10 s không bắt trình đọc màn hình đọc lại role=alert);
  // dựng lại thì trả focus về nút "Thử lại" mới, tải lại thành công thì về "Làm mới" (WCAG 2.4.3).
  let shownError = null;
  function showError(e) {
    const text = (e && (e.error || e.message)) || "lỗi không rõ";
    if (shownError === text && msg.firstChild) return;
    const had = msg.contains(document.activeElement);
    shownError = text;
    error(msg, e, load);
    if (had) msg.querySelector("button")?.focus({ preventScroll: true });
  }

  function clearError() {
    const had = msg.contains(document.activeElement);
    shownError = null;
    msg.replaceChildren();
    if (had) refresh.focus({ preventScroll: true });
  }

  async function load() {
    try {
      apply(await api("/api/office"));
      clearError();
    } catch (e) {
      showError(e);
    }
  }

  let three = null; // bộ vẽ 3D khi đang dùng
  let dpr = 1;
  let cssW = 800, cssH = 540;

  function size() {
    dpr = prefs.quality === "low" ? 1 : Math.min(2, window.devicePixelRatio || 1);
    cssW = Math.max(280, stage.clientWidth || 800);
    cssH = Math.round(Math.max(300, Math.min(680, cssW * 0.68)));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (three) three.resize(cssW, cssH, dpr);
    dirty = true;
  }

  function sceneOpts(t) {
    return {
      theme: themeById(prefs.theme), season: resolveSeason(prefs.season), scale: prefs.scale, layout: prefs.layout,
      seats: data.seats, names: prefs.names, npc: prefs.npc, motion: prefs.motion, t, zoom: prefs.zoom, pan: view.pan,
      focus: view.focus, focusSeat: view.seat, quality: prefs.quality,
    };
  }

  // Bộ đếm: agent thật + nhân viên minh hoạ (số bàn có người minh hoạ của mặt bằng) · đang làm · đang chờ.
  function count() {
    const plan = planFor(prefs.scale, prefs.layout);
    const npc = prefs.npc ? npcSeated(plan) : 0;
    // Chú thích chỉ phụ thuộc lựa chọn, không phụ thuộc dữ liệu — đúng cả khi đang tải hay máy chủ lỗi.
    legend.textContent = !prefs.names
      ? "Nhãn tên đang tắt — xem trạng thái từng agent ở bảng \"Ai đang làm gì\" dưới đây."
      : npc
        ? "Người có nhãn là agent thật của vòng; người không nhãn là nhân viên minh hoạ (chỉ trang trí, không mang trạng thái)."
        : "Mỗi người trong cảnh là một agent của vòng, có nhãn tên.";
    if (!loaded) {
      counters.textContent = "Chưa có dữ liệu agent (đang tải hoặc máy chủ lỗi).";
      return;
    }
    const working = data.seats.filter((s) => s.state === "work" || s.state === "fail").length;
    const waiting = data.seats.filter((s) => s.state === "wait").length;
    counters.textContent = data.seats.length + " agent" + (npc ? " + " + npc + " nhân viên minh hoạ" : "") +
      " · đang làm " + working + " · đang chờ " + waiting;
  }

  function setFocus(focus, seat) {
    view.focus = focus;
    view.seat = seat;
    view.pan = { x: 0, y: 0 };
    for (const b of rooms.querySelectorAll("button")) b.setAttribute("aria-pressed", String(pressed(b.dataset.room)));
    dirty = true;
    if (three) three.dirty = true;
  }

  // Nút phòng đang được nhìn: "Toàn cảnh" chỉ khi không nhìn phòng NÀO và không nhìn bàn nào (WCAG 4.1.2).
  function pressed(room) {
    return room ? room === view.focus : view.focus === null && view.seat === null;
  }

  function goSeat(i) {
    setFocus(null, i);
    stage.scrollIntoView({ block: "nearest" });
  }

  // Nút "Tới phòng": Toàn cảnh + mọi phòng của mặt bằng hiện tại (quy mô nhóm nhỏ chỉ có Toàn cảnh).
  function roomButtons() {
    const plan = planFor(prefs.scale, prefs.layout);
    const list = [{ id: "", name: "Toàn cảnh" }, ...plan.rooms];
    rooms.replaceChildren(h("span", { class: "muted" }, "Tới phòng: "), ...list.map((r) => {
      const b = h("button", { type: "button", "data-room": r.id, "aria-pressed": String(pressed(r.id)) }, r.name);
      b.addEventListener("click", () => setFocus(r.id || null, null));
      return b;
    }));
  }

  function frame(t) {
    if (three) {
      three.draw(sceneOpts(t));
    } else {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, canvas.width / dpr, canvas.height / dpr, sceneOpts(t));
    }
    dirty = false;
  }

  // Đổi bộ vẽ tuần tự: lần gọi sau chờ lần trước (import three.js có thể lâu) — không bao giờ có 2 canvas WebGL; xong
  // import mà người dùng đã chọn lại 2D hay đã rời màn thì giải phóng ngay.
  let switching = Promise.resolve();
  function useRenderer() {
    switching = switching.then(applyRenderer, applyRenderer);
    return switching;
  }

  async function applyRenderer() {
    if (prefs.renderer === "3d" && !three) {
      try {
        // Thăm dò WebGL trước khi tải ~2 MB three.js; dự án đích không cài bản 3D (install.py) → tệp vendor 404.
        const probe = document.createElement("canvas").getContext("webgl2");
        if (!probe) throw new Error("trình duyệt/GPU không có WebGL 2");
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        const mod = await import("../office/three-view.js");
        if (prefs.renderer !== "3d" || !stage.isConnected) return; // đổi ý / rời màn trong lúc tải
        three = mod.createThreeView(stage);
        rmsg.replaceChildren();
        canvas.hidden = true;
        three.canvas.setAttribute("aria-label", canvas.getAttribute("aria-label") || "Văn phòng");
      } catch (e) {
        three = null;
        prefs.renderer = rendererSel.value = "2d";
        persist(); // không thử lại 3D mỗi lần mở màn
        rmsg.replaceChildren(h("p", { class: "state error", role: "alert" },
          "Không bật được 3D (" + ((e && e.message) || "WebGL không khả dụng") + ") — dùng bản 2D. Ở dự án đích, bản 3D cần cài bằng `install.py --with-office-3d`."));
      }
    } else if (prefs.renderer !== "3d" && three) {
      three.dispose();
      three = null;
      canvas.hidden = false;
    }
    size();
    label(); // tên + gợi ý phím theo bộ vẽ vừa chọn
  }

  let last = 0;
  function tick(now) {
    if (!stage.isConnected) { // rời màn → dừng vòng vẽ, giải phóng WebGL
      if (three) three.dispose();
      return;
    }
    const budget = prefs.quality === "low" ? 1000 / 15 : 1000 / 30;
    if ((prefs.motion && now - last >= budget) || dirty || (three && three.dirty)) {
      last = now;
      frame(now / 1000);
    }
    requestAnimationFrame(tick);
  }

  function label() {
    const text = loaded
      ? describe(data.seats, themeById(prefs.theme).name, SCALES.find((x) => x.id === prefs.scale)?.name)
      : "Văn phòng — chưa có dữ liệu agent (đang tải hoặc máy chủ lỗi)."; // không khai "không ai đang làm" khi chưa biết
    canvas.setAttribute("aria-label", text);
    keys.textContent = three
      ? "Khi khung cảnh có focus: mũi tên xoay góc nhìn; kéo chuột để xoay."
      : "Khi khung cảnh có focus: mũi tên dời góc nhìn · + / − phóng to, thu nhỏ · 0 về giữa; kéo chuột để dời.";
    if (three) {
      three.canvas.setAttribute("aria-label", text);
      three.canvas.setAttribute("aria-describedby", "office-keys");
    }
  }

  // Lưu lựa chọn; khi hệ thống xin giảm chuyển động, giữ nguyên "Chuyển động" đã lưu (bật tay chỉ cho phiên này).
  function persist() {
    savePrefs(reduce ? { ...prefs, motion: loadPrefs().motion } : prefs);
  }

  async function changed() {
    prefs.renderer = rendererSel.value;
    const rescale = prefs.scale !== scaleSel.value || prefs.layout !== layoutSel.value;
    prefs.scale = scaleSel.value;
    prefs.layout = layoutSel.value;
    prefs.npc = npcBox.checked;
    if (rescale) {
      setFocus(null, null);
      roomButtons();
    }
    prefs.theme = themeSel.value;
    prefs.season = seasonSel.value;
    prefs.quality = qualitySel.value;
    prefs.names = namesBox.checked;
    prefs.motion = motionBox.checked;
    count(); // sau khi gán ĐỦ lựa chọn — chú thích theo "Nhãn tên" vừa đổi, không lệch một nhịp
    persist();
    await useRenderer();
    label();
  }
  for (const el of [rendererSel, scaleSel, layoutSel, themeSel, seasonSel, qualitySel, namesBox, npcBox, motionBox]) {
    el.addEventListener("change", changed);
  }
  const zoomBy = (f) => {
    prefs.zoom = Math.min(4, Math.max(0.5, +(prefs.zoom * f).toFixed(2)));
    persist();
    panTo(view.pan.x, view.pan.y); // thu nhỏ thì biên dời hẹp lại — kẹp lại góc nhìn đang dời
    if (three) three.dirty = true;
  };
  zoomIn.addEventListener("click", () => zoomBy(1.25));
  zoomOut.addEventListener("click", () => zoomBy(0.8));
  // 2D: kéo CHUỘT để dời góc nhìn (chạm/bút: để trang cuộn bình thường); phím mũi tên khi canvas có focus. Dời giới hạn
  // theo cỡ cảnh đã phóng: dời tới mép cảnh, cộng 1/4 khung — luôn còn một phần cảnh trong tầm nhìn ở mọi mức phóng.
  // (3D: three-view.js tự xử lý xoay trên canvas của nó.)
  const panTo = (x, y) => {
    const f = fitPoints(viewCorners(sceneOpts(0)).pts, cssW, cssH, prefs.zoom);
    const lim = { x: Math.max(0, (f.w - cssW) / 2) + cssW / 4, y: Math.max(0, (f.h - cssH) / 2) + cssH / 4 };
    view.pan = { x: Math.max(-lim.x, Math.min(lim.x, x)), y: Math.max(-lim.y, Math.min(lim.y, y)) };
    dirty = true;
  };
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX, y: e.clientY, pan: { ...view.pan } };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) panTo(drag.pan.x + e.clientX - drag.x, drag.pan.y + e.clientY - drag.y);
  });
  canvas.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+−/= là phóng của trình duyệt (WCAG 1.4.4) — không giành
    const step = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
    if (step) {
      e.preventDefault();
      panTo(view.pan.x + step[0], view.pan.y + step[1]);
    } else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-") zoomBy(0.8);
    else if (e.key === "0") setFocus(view.focus, view.seat); // về giữa phòng/bàn đang nhìn
  });
  for (const ev of ["pointerup", "pointercancel"]) canvas.addEventListener(ev, () => { drag = null; });
  refresh.addEventListener("click", load);
  if (window.ResizeObserver) new ResizeObserver(() => { if (stage.isConnected) size(); }).observe(stage);

  roomButtons();
  count(); // trước lần tải đầu: "chưa có dữ liệu" + chú thích theo lựa chọn
  label(); // tên khung "chưa có dữ liệu" + gợi ý phím ngay từ đầu (đích của aria-describedby không rỗng khi API chậm)
  await load();
  await useRenderer();
  requestAnimationFrame(tick);
  const timer = setInterval(() => {
    if (!stage.isConnected) clearInterval(timer);
    else if (!document.hidden) load(); // tab ẩn: không hỏi máy chủ
  }, POLL_MS);
}
