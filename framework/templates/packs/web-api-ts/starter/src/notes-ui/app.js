const element = (id) => document.getElementById(id);
const login = element("login-form");
const editor = element("note-form");
const input = element("note-body");
const list = element("notes-list");
const refresh = element("refresh");
const logout = element("logout");
const loginStatus = element("login-status");
const noteStatus = element("note-status");
const listStatus = element("list-status");
const dates = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });
let session = "";

// Thông báo nằm cạnh phần tử gây ra nó để lỗi luôn trong tầm nhìn.
function report(target, message, error = false) {
  for (const place of [loginStatus, noteStatus, listStatus]) {
    if (place !== target) {
      place.textContent = "";
      place.classList.remove("error");
    }
  }
  target.textContent = message;
  target.classList.toggle("error", error);
  if (error && message) target.scrollIntoView({ block: "nearest" });
  if (target === noteStatus && error && message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", noteStatus.id);
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function setSignedIn(signedIn) {
  element("login-panel").hidden = signedIn;
  element("workspace").hidden = !signedIn;
  logout.hidden = !signedIn;
}

function signOut() {
  session = "";
  editor.reset();
  login.reset();
  list.replaceChildren();
  element("empty").hidden = true;
  setSignedIn(false);
  element("email").focus();
}

async function request(path, body, token = "") {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok) {
    if (response.status === 401 && token && session === token) {
      signOut();
      throw new Error("Phiên đã hết hạn. Hãy đăng nhập lại.");
    }
    if (response.status === 401) throw new Error("Email hoặc mật khẩu chưa đúng.");
    if (response.status === 503) throw new Error("Dịch vụ đang bận. Vui lòng thử lại sau.");
    throw new Error("Yêu cầu chưa hoàn tất. Vui lòng thử lại.");
  }
  return response.json();
}

function entry(note) {
  const row = document.createElement("li");
  const time = document.createElement("time");
  time.dateTime = note.created_at;
  time.textContent = dates.format(new Date(note.created_at));
  const content = document.createElement("p");
  content.textContent = note.body;
  row.append(time, content);
  return row;
}

async function loadNotes() {
  const { notes } = await request("/v1/notes", null, session);
  list.replaceChildren(...notes.map(entry));
  element("empty").hidden = notes.length !== 0;
}

// Một thao tác tại mỗi thời điểm để lần tải lại cũ không ghi đè ghi chú vừa lưu.
async function perform(target, task) {
  const buttons = document.querySelectorAll("button");
  if (refresh.disabled) return;
  // Vô hiệu hóa nút đang focus làm trình duyệt đưa focus về <body>; trả lại khi xong.
  const focused = document.activeElement;
  for (const button of buttons) button.disabled = true;
  report(target, "");
  try {
    await task();
  } catch (error) {
    // Hết phiên đã đưa người dùng về màn đăng nhập: báo lỗi ở đó.
    report(
      session ? target : loginStatus,
      error instanceof TypeError ? "Mất kết nối. Hãy kiểm tra mạng và tải lại." : error.message,
      true,
    );
  } finally {
    for (const button of buttons) button.disabled = false;
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost && focused instanceof HTMLButtonElement && !focused.closest("[hidden]"))
      focused.focus({ preventScroll: true });
  }
}

login.addEventListener("submit", (event) => {
  event.preventDefault();
  perform(loginStatus, async () => {
    const { token } = await request("/v1/login", {
      email: element("email").value.trim(),
      password: element("password").value,
    });
    session = token;
    element("password").value = "";
    setSignedIn(true);
    input.focus();
    await loadNotes();
  });
});

editor.addEventListener("submit", (event) => {
  event.preventDefault();
  const body = input.value.trim();
  if (!body) {
    report(noteStatus, "Hãy nhập nội dung ghi chú.", true);
    input.focus();
    return;
  }
  perform(noteStatus, async () => {
    const note = await request("/v1/notes", { body }, session);
    list.prepend(entry(note));
    if (list.children.length > 100) list.lastElementChild.remove();
    element("empty").hidden = true;
    if (input.value.trim() === body) input.value = "";
    input.focus();
    report(noteStatus, "Đã lưu ghi chú.");
  });
});

refresh.addEventListener("click", () =>
  perform(listStatus, async () => {
    await loadNotes();
    report(listStatus, "Đã tải lại danh sách.");
  }),
);
logout.addEventListener("click", () => {
  signOut();
  report(loginStatus, "Đã đăng xuất.");
});
