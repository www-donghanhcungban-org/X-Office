const login = document.getElementById("login");
const report = document.getElementById("report");
const status = document.querySelector('[role="status"]');
let token = "";

async function api(path, data) {
  const response = await fetch(path, {
    method: data === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function handle(work) {
  return async (event) => {
    event.preventDefault();
    try {
      status.textContent = "";
      await work();
    } catch (error) {
      status.textContent = error.message;
    }
  };
}

async function refresh() {
  const { manager, tickets } = await api("/v1/repairs");
  const list = document.querySelector("ul");
  list.replaceChildren();
  report.hidden = manager;
  for (const ticket of tickets) {
    const row = document.createElement("li");
    row.textContent = `${ticket.id} · ${ticket.room} · ${ticket.description} · ${ticket.status} `;
    if (manager && ticket.status === "open") {
      const button = document.createElement("button");
      button.textContent = "Đánh dấu đã sửa";
      button.addEventListener("click", handle(async () => {
        await api(`/v1/repairs/${ticket.id}/resolve`, {});
        await refresh();
      }));
      row.append(button);
    }
    list.append(row);
  }
}

login.addEventListener("submit", handle(async () => {
  token = (await api("/v1/login", Object.fromEntries(new FormData(login)))).token;
  await refresh();
  login.reset();
  login.hidden = true;
  document.querySelector("section").hidden = false;
}));
report.addEventListener("submit", handle(async () => {
  await api("/v1/repairs", Object.fromEntries(new FormData(report)));
  report.reset();
  await refresh();
}));
