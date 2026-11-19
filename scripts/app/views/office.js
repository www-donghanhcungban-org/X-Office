// F-008 Văn phòng (SPEC-app §4): agent ngồi bàn theo dữ liệu thật của vòng (`GET /api/office`), nhiều kiểu văn phòng.
// Bộ vẽ mặc định: Canvas 2D tự viết (không thư viện); tuỳ chọn 3D: three.js vendor, tải lười khi chọn (office/three-view.js).
// Bản văn bản tương đương ngay dưới canvas; chuyển động tắt khi prefers-reduced-motion.
import { THEMES, SEASONS, resolveSeason, themeById } from "../office/themes.js";
import { drawScene, describe, LAYOUTS, STATE_TEXT } from "../office/scene.js";

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

function seatRows(h, seats) {
  return seats.map((s) => h("tr", null,
    h("th", { scope: "row" }, s.label),
    h("td", null, h("span", { class: "office-state office-" + s.state }, STATE_TEXT[s.state] || s.state)),
    h("td", null, s.task ? s.task.id + (s.task.title ? " — " + s.task.title : "") : "—")));
}

export async function render(main, { api, h, error }) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefs = { renderer: "2d", layout: "open", theme: "night", season: "auto", names: true, motion: true, quality: "high", zoom: 1, ...loadPrefs() };
  if (reduce) prefs.motion = false; // hệ thống xin giảm chuyển động thắng lựa chọn đã lưu; bật lại tay chỉ cho phiên này
  const [rendererLabel, rendererSel] = select(h, "office-renderer", "Bộ vẽ", RENDERERS, prefs.renderer);
  const [layoutLabel, layoutSel] = select(h, "office-layout", "Bố cục", LAYOUTS, prefs.layout);
  const [themeLabel, themeSel] = select(h, "office-theme", "Kiểu văn phòng", THEMES, prefs.theme);
  const [seasonLabel, seasonSel] = select(h, "office-season", "Mùa", SEASONS, prefs.season);
  const [qualityLabel, qualitySel] = select(h, "office-quality", "Chất lượng",
    [{ id: "high", name: "Cao" }, { id: "low", name: "Thấp (máy yếu)" }], prefs.quality);
  const [namesBox, namesLabel] = check(h, "office-names", "Nhãn tên", prefs.names);
  const [motionBox, motionLabel] = check(h, "office-motion", "Chuyển động", prefs.motion);
  const zoomOut = h("button", { type: "button", "aria-label": "Thu nhỏ" }, "−");
  const zoomIn = h("button", { type: "button", "aria-label": "Phóng to" }, "+");
  const refresh = h("button", { type: "button" }, "Làm mới");
  const canvas = h("canvas", { class: "office-canvas", role: "img", "aria-label": "Văn phòng đang tải" });
  const stage = h("div", { class: "office-stage" }, canvas);
  const summary = h("p", { class: "muted", "aria-live": "polite" });
  const table = h("tbody", null);
  const human = h("div", null);
  const feed = h("ol", { class: "items office-feed" });
  const msg = h("div", null);

  main.replaceChildren(
    h("h1", null, "Văn phòng"),
    h("p", { class: "muted" }, "Trạng thái suy ra từ bằng chứng trên đĩa (PLAN, .autopilot/runs.jsonl, việc chờ người) — không phải tín hiệu thời gian thực."),
    h("div", { class: "office-bar", role: "group", "aria-label": "Tuỳ chọn văn phòng" },
      h("span", null, rendererLabel, rendererSel), h("span", null, layoutLabel, layoutSel),
      h("span", null, themeLabel, themeSel), h("span", null, seasonLabel, seasonSel), h("span", null, qualityLabel, qualitySel),
      h("span", null, namesBox, namesLabel), h("span", null, motionBox, motionLabel),
      h("span", null, zoomOut, zoomIn, refresh)),
    msg, stage, summary,
    h("h2", null, "Ai đang làm gì"),
    h("table", null, h("thead", null, h("tr", null, h("th", { scope: "col" }, "Bàn"), h("th", { scope: "col" }, "Trạng thái"), h("th", { scope: "col" }, "Task"))), table),
    h("h2", null, "Việc cần người"), human,
    h("h2", null, "Hoạt động gần đây"), feed,
  );

  let data = { seats: [], feed: [], pending_human: [], tasks: { open: 0, done: 0, skipped: 0 }, loop: { verdict: "inactive" } };
  let dirty = true;

  function apply(d) {
    data = d;
    dirty = true;
    table.replaceChildren(...seatRows(h, d.seats));
    human.replaceChildren(d.pending_human.length
      ? h("ul", null, d.pending_human.map((x) => h("li", null, h("strong", null, x.id), x.reason ? " — " + x.reason : "")))
      : h("p", null, "Không có việc chờ người."));
    feed.replaceChildren(...(d.feed.length
      ? d.feed.map((r) => h("li", null, h("span", { class: r.ok ? "office-ok" : "office-bad" }, r.ok ? "xanh" : "đỏ"),
        " " + (r.task ? r.task.id : "?") + " · " + r.agent + (r.at ? " · " + r.at : "")))
      : [h("li", { class: "muted" }, "Chưa có lần chạy Gate nào (loop record).")]));
    summary.textContent = "Vòng: " + d.loop.verdict + " · task mở " + d.tasks.open + ", xong " + d.tasks.done + ".";
    label();
  }

  async function load() {
    try {
      apply(await api("/api/office"));
      msg.replaceChildren();
    } catch (e) {
      error(msg, e, load);
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
      theme: themeById(prefs.theme), season: resolveSeason(prefs.season), layout: prefs.layout, seats: data.seats,
      names: prefs.names, motion: prefs.motion, t, zoom: prefs.zoom, quality: prefs.quality,
    };
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

  async function useRenderer() {
    if (prefs.renderer === "3d" && !three) {
      try {
        // Thăm dò WebGL trước khi tải ~2 MB three.js; dự án đích không cài bản 3D (install.py) → tệp vendor 404.
        const probe = document.createElement("canvas").getContext("webgl2");
        if (!probe) throw new Error("trình duyệt/GPU không có WebGL 2");
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        const mod = await import("../office/three-view.js");
        three = mod.createThreeView(stage);
        canvas.hidden = true;
        three.canvas.setAttribute("aria-label", canvas.getAttribute("aria-label") || "Văn phòng");
      } catch (e) {
        three = null;
        prefs.renderer = rendererSel.value = "2d";
        msg.replaceChildren(h("p", { class: "state error", role: "alert" },
          "Không bật được 3D (" + ((e && e.message) || "WebGL không khả dụng") + ") — dùng bản 2D. Ở dự án đích, bản 3D cần cài bằng `install.py --with-office-3d`."));
      }
    } else if (prefs.renderer !== "3d" && three) {
      three.dispose();
      three = null;
      canvas.hidden = false;
    }
    size();
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
    const text = describe(data.seats, themeById(prefs.theme).name);
    canvas.setAttribute("aria-label", text);
    if (three) three.canvas.setAttribute("aria-label", text);
  }

  async function changed() {
    prefs.renderer = rendererSel.value;
    prefs.layout = layoutSel.value;
    prefs.theme = themeSel.value;
    prefs.season = seasonSel.value;
    prefs.quality = qualitySel.value;
    prefs.names = namesBox.checked;
    prefs.motion = motionBox.checked;
    savePrefs(reduce ? { ...prefs, motion: loadPrefs().motion } : prefs);
    await useRenderer();
    label();
  }
  for (const el of [rendererSel, layoutSel, themeSel, seasonSel, qualitySel, namesBox, motionBox]) el.addEventListener("change", changed);
  zoomIn.addEventListener("click", () => { prefs.zoom = Math.min(2, +(prefs.zoom + 0.15).toFixed(2)); savePrefs(prefs); dirty = true; });
  zoomOut.addEventListener("click", () => { prefs.zoom = Math.max(0.6, +(prefs.zoom - 0.15).toFixed(2)); savePrefs(prefs); dirty = true; });
  refresh.addEventListener("click", load);
  if (window.ResizeObserver) new ResizeObserver(() => { if (stage.isConnected) size(); }).observe(stage);

  await load();
  await useRenderer();
  requestAnimationFrame(tick);
  const timer = setInterval(() => {
    if (!stage.isConnected) clearInterval(timer);
    else if (!document.hidden) load(); // tab ẩn: không hỏi máy chủ
  }, POLL_MS);
}
