"""Black-box repair journey. Only HTTP and rendered browser controls are observable."""

import json
import os
from uuid import UUID

from playwright.sync_api import expect, sync_playwright


def check() -> dict:
    accounts = json.loads(os.environ["REPAIR_ACCOUNTS"])
    url = os.environ["REPAIR_URL"]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("XT_E2E_CHROMIUM"))

        def login(context, name):
            page = context.new_page()
            page.set_default_timeout(4000)
            response = page.goto(url + "/repairs")
            assert response.status == 200, "Repair page is missing"
            page.get_by_label("Email").fill(accounts[name]["email"])
            page.get_by_label("Mật khẩu").fill(accounts[name]["password"])
            page.get_by_role("button", name="Đăng nhập").click()
            expect(page.get_by_role("heading", name="Yêu cầu của tòa nhà")).to_be_visible()
            return page

        with browser.new_context() as session:
            page = login(session, "resident")
            page.get_by_label("Mô tả sự cố").fill("Vòi nước rò")
            with page.expect_response(
                lambda r: r.url.endswith("/v1/repairs") and r.request.method == "POST"
            ) as created:
                page.get_by_role("button", name="Gửi yêu cầu").click()
            assert created.value.status == 201
            ticket = created.value.json()
            ticket_id = str(UUID(ticket["id"]))
            assert ticket["status"] == "open" and ticket["room"] == "A-101"

        def row(page):
            return page.get_by_role("listitem").filter(has_text=ticket_id)

        with browser.new_context() as session:
            page = login(session, "resident")
            expect(row(page)).to_contain_text("Vòi nước rò")
            expect(row(page)).to_contain_text("open")

        def api_token(session, name):
            auth = session.request.post(url + "/v1/login", data=accounts[name])
            assert auth.status == 200
            return {"Authorization": "Bearer " + auth.json()["token"]}

        with browser.new_context() as session:
            foreign = api_token(session, "outsider")
            own = api_token(session, "resident")
            endpoint = url + "/v1/repairs/" + ticket_id
            assert session.request.get(endpoint, headers=foreign).status == 404
            assert session.request.post(endpoint + "/resolve", headers=foreign).status == 403
            assert session.request.post(endpoint + "/resolve", headers=own).status == 403

        with browser.new_context() as session:
            page = login(session, "manager")
            expect(row(page)).to_contain_text("A-101")
            with page.expect_response(lambda r: r.url.endswith("/resolve")) as updated:
                row(page).get_by_role("button", name="Đánh dấu đã sửa").click()
            assert updated.value.status == 200
            expect(row(page)).to_contain_text("resolved")
            if int(os.environ["REPAIR_PHASE"]) >= 2:
                manager = api_token(session, "manager")
                assert session.request.post(endpoint + "/resolve", headers=manager).status == 409
                audit = session.request.get(endpoint, headers=manager).json()
                assert audit["resolved_at"]

        with browser.new_context() as session:
            page = login(session, "resident")
            expect(row(page)).to_contain_text("resolved")
        browser.close()
    return {"created": 201, "other_read": 404, "other_resolve": 403, "resident_resolve": 403, "reloaded": "resolved"}


if __name__ == "__main__":
    print(json.dumps(check()))
