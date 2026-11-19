---
title: Audit delta cổng ký 2026-11-17
kind: report
updated: 2026-11-17
---

# Audit delta cổng ký — 2026-11-17

Quy trình: ADR-0080 (cổng ký sau vét việc). Ứng viên `fa81dd3e` (sau #627). Năm lô reviewer độc lập (`reviewer-alt`, effort max), chỉ đọc, chạy song song trên diff tích luỹ; mọi phát hiện có lệnh tái hiện đã chạy. Dòng sổ: [`AUDIT-STATUS.md`](AUDIT-STATUS.md).

| Lô | Phạm vi | Kết luận | Phát hiện |
|---|---|---|---|
| SEC-A | `guard.py` dòng 1–7000, diff `7ca87a6..fa81dd3e` | CÓ PHÁT HIỆN; INCONCLUSIVE: `_split_why`, `tokenize(strict)`, `_arith_hash_why`, `_extglob_why`, `_wrapper_arguments`, `_set_positional_why`, `_autocorrect_lookup_why`, `_git_cfg_dyn` | 🔴 AUD-SEC-801, AUD-SEC-802 · 🟠 AUD-SEC-804 · 🟢 AUD-SEC-808 |
| SEC-B | `guard.py` dòng 7001–hết, `.claude/hooks/*.sh` | CÓ PHÁT HIỆN; INCONCLUSIVE: `_heredoc_bodies`, `_go_mark_nul`, `_subst_tail`, `_printf_render`, `_record_assigns`, `_rough_budget`, `_exec_env_why`, `_runner_why`, `GATE_PASSIVE` | 🔴 AUD-SEC-803 · 🟠 AUD-SEC-805, AUD-SEC-806, AUD-SEC-807 |
| scripts | `scripts/` (2 832 dòng diff) | ARCH, DATA sạch; CODE/XFEAT có phát hiện; PERF không có số đỏ | 🟠 AUD-HAR-415, AUD-HAR-416, AUD-HAR-417 · 🟢 AUD-DOC-296, AUD-HAR-418, AUD-DOC-297 |
| TEST | `tests/` lấy mẫu (file mới, cấu trúc `test_hooks`, đối chiếu 716 kỳ vọng với 2 617 ca corpus, 6 đột biến) | CÓ PHÁT HIỆN; INCONCLUSIVE ~4 000 dòng ở test sửa khác | 🟠 AUD-TEST-109 · 🟢 AUD-TEST-110, AUD-TEST-111 |
| HAR/CI/DOC | skill, `framework/11-autonomous-loop`, `.github`, tài liệu đổi | HAR có phát hiện; CI sạch; DOC INCONCLUSIVE (phần lớn CHANGELOG, ADR-0074/0078 so với mã) | 🟠 AUD-HAR-412, AUD-HAR-413 · 🟢 AUD-HAR-414, AUD-DOC-294, AUD-DEP-030, AUD-DOC-295, AUD-SEC-809 |

Tổng: 🔴 3 · 🟠 10 · 🟢 12 (kể cả AUD-SEC-810 từ T-3918). Năm 🟠 là bản sửa chưa đủ của mục đã ghi `đã sửa` (AUD-SEC-641/681/544/636, AUD-HAR-371/405) — dòng cũ giữ nguyên, dòng mới mang phần còn thiếu.

Kết quả G7: chưa GO. Theo ADR-0080 — FAIL → đợt kế: PLAN-harden-2026-11-17 đợt 4 (T-3924…T-3928), rồi audit delta lần nữa trên phần sửa và các phần INCONCLUSIVE ở trên.

## Cổng ký lần 2 (ứng viên `b68527fc`, sau đợt 4)

Năm lô: phần sửa của guard (#628/#630/#632), hai lô phần guard INCONCLUSIVE của lần 1, `scripts/`+`tests/`, harness/tài liệu/phụ thuộc. `loop verify --all` XANH (26 Gate + 68 lệnh kiểm blueprint); `pip-audit` ba lockfile pip: 0 lỗ hổng (2026-11-17).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| phần sửa guard (#628/#630/#632) | CÓ PHÁT HIỆN; blueprint `--run` exit 0, không hồi quy idiom lành | 🔴 AUD-SEC-828/829/830 (bản sửa 803/811/801 chưa đủ) · 🟠 AUD-SEC-831/832/833 · 🟢 AUD-SEC-834/835 |
| guard INCONCLUSIVE A | CÓ PHÁT HIỆN (đều có từ trước) | 🔴 AUD-SEC-820…824 · 🟠 AUD-SEC-825 · 🟢 AUD-SEC-826 |
| guard INCONCLUSIVE B | CÓ PHÁT HIỆN (đều có từ trước) | 🔴 AUD-SEC-815/816/817 · 🟠 AUD-HAR-419 · 🟢 AUD-SEC-818 |
| scripts + tests | CODE/TEST có phát hiện; XFEAT sạch | 🟠 AUD-HAR-422, AUD-TEST-112 · 🟢 AUD-HAR-423, AUD-TEST-113…116, AUD-DOC-300 |
| harness/tài liệu/DEP | HAR có phát hiện; README, ADR-0074/0078 sạch; DEP pip sạch | 🟠 AUD-HAR-420, AUD-SEC-827 · 🟢 AUD-DOC-298/299, AUD-HAR-421 |

Mỗi vòng rà đối kháng sâu hơn lại ra lỗ có từ trước của bộ đọc shell heuristic → D-502: sửa theo LỚP (giá trị không tính chắc ở đích/cờ của lệnh có luật → BUDGET; kênh chạy lệnh → BUDGET), cổng ký lần 3 rà diff sửa + hồi quy. Đợt 5: T-3929…T-3933.

## Cổng ký lần 3 (ứng viên `b5de13e9`, sau đợt 5)

Ba lô theo D-502 (diff sửa + hồi quy): #637, #638/#639, #636. Không hồi quy chậm (lệnh 14–30 KB: 1,0–1,2× nền); blueprint `--run` exit 0; idiom lành trong brief đều qua.

| Lô | Kết luận | Phát hiện |
|---|---|---|
| #637 lớp giá trị | CÓ PHÁT HIỆN (biến thể trong lớp, có từ trước) | 🔴 AUD-SEC-836…843 · 🟠 AUD-SEC-844 · 🟢 AUD-SEC-854 |
| #638/#639 kênh chạy lệnh, heredoc, dữ liệu | CÓ PHÁT HIỆN (biến thể trong lớp, có từ trước) | 🔴 AUD-SEC-846…850 · 🟠 AUD-SEC-851/852, AUD-HAR-424/425 · 🟢 AUD-SEC-853, AUD-HAR-426 |
| #636 scripts/tests | CÓ PHÁT HIỆN | 🟠 AUD-TEST-117 · 🟢 AUD-HAR-427/428, AUD-TEST-118 |

Liệt kê biến thể trong lớp không hội tụ → D-503: mặc định chặn (BUDGET) trong lệnh có luật kèm danh sách cho phép hẹp; cổng ký lần 4 kiểm bất biến bằng fuzz có hướng + hồi quy. Đợt 6: T-3934…T-3936.

## Cổng ký lần 4 (ứng viên `a662344e`, sau đợt 6)

Hai lô theo D-503: fuzz bất biến có hướng và hồi quy. Blueprint `--run` exit 0; tốc độ quyết định 1,16× nền (p95 42 ms); #642/#644 đủ.

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz bất biến (47 lệnh gốc × ~120 dạng, 15 778 tổ hợp; bash thật trong sandbox) | CÓ PHÁT HIỆN: 829 tổ hợp nguy hiểm lọt (815 có từ trước, 14 hồi quy #643) theo 9 gốc | 🔴 AUD-SEC-857…862 · 🟠 AUD-SEC-863/864/865 |
| Hồi quy D-503 + #642/#644 + nguồn AUD-TEST-119 | CÓ PHÁT HIỆN; AUD-TEST-119 do `ConcurrentDecisionTest` vá `os.environ` trong luồng | 🔴 (gộp AUD-SEC-861) · 🟠 AUD-SEC-866 · 🟢 AUD-SEC-868 |

Sự cố: lần chạy oracle đầu dùng đường sandbox tương đối nên 480 ca gọi `/usr/bin/rm` thật; HOME khi đó cũng tương đối (không tồn tại), chỉ thư mục sandbox bị xoá — đã kiểm `/home/liend`, `.ssh`, `git fsck` repo nguyên vẹn. Tiêu chí đợt 7: chạy lại bộ fuzz → 0 ca lọt; tập con tất định thành test hồi quy (`tests/test_guard_d503_invariant.py`).

## Cổng ký lần 5 (ứng viên `702e006d`, sau đợt 7)

Hai lô: fuzz bất biến D-503 mở rộng (kèm dạng bọc) và hồi quy. Lần này oracle bash thật chạy với đường tuyệt đối, PATH chỉ có lệnh giả và canary kiểm trước mỗi tiến trình; không có sự cố. Hồi quy: blueprint `--run` exit 0, tốc độ 1,0–1,1× nền, `tests.test_hooks` sau các `test_guard_*` trong một tiến trình 1263 test OK (AUD-TEST-119 đã đóng).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz mở rộng: 201 179 tổ hợp (core 19 369 + bọc env/command/nice/timeout 65 596 + bọc `true &&`, `X=1;`, `bash -c`, `sh -c`, `$(…)`, `cd /tmp &&` 116 214); 166 760 nguy hiểm trong bash thật | 829/829 ca lọt của cổng ký 4 đã chặn; 2 535 lọt (đều có từ trước, 0 hồi quy so nền) theo ba gốc | 🔴 AUD-SEC-870 (`sh -c "…"` nháy kép), AUD-SEC-871 (thư mục làm việc không xác định) · 🟠 AUD-SEC-872 (xargs miễn theo nguồn) |
| Hồi quy #648/#647 | CÓ PHÁT HIỆN | 🔴 AUD-SEC-869 (hồi quy #648: `for` duyệt glob + `${f%…}`) · 🟠 AUD-SEC-873 (sed/`$(date)` chặn oan) · 🟢 AUD-SEC-874, AUD-DEP-031 |

Đợt 8 (T-3940, #650): fuzz mở rộng 2 535 → 0, bộ cổng ký 4 vẫn 0/829; mọi dạng chặn mới vào `tests/fixtures/autonomy/d503_invariant.jsonl`. Một lỗi CI trên đường: nhánh trả về của `_heredoc_shell_why` không còn bị test phủ vì bước quét sớm chặn trước — ghim bằng test gọi thẳng hàm (không đổi mã).

## Cổng ký lần 6 (ứng viên `49ce04a1`, sau đợt 8)

Hai lô reviewer-alt: fuzz họ mới (hàm che lệnh, CDPATH/`popd`, nguồn xargs) và hồi quy #650/#648/#647. Oracle bash thật chạy với đường tuyệt đối, PATH chỉ có lệnh giả và canary; không có sự cố. Lô fuzz: 665/1 848 tổ hợp họ mới lọt ở ứng viên (nền `702e006d`: 755), gồm 213 ca hồi quy; tiền tố/lớp bọc mới 203 218 tổ hợp 0 lọt; tốc độ 1,02–1,15× nền. Chưa rà (INCONCLUSIVE, chuyển cổng ký 7): phần còn lại của `while`, `case`, `coproc`, `time { }`, `sh -c` lồng 2–3 tầng, `sh -c` → `bash -c` (~133 500 tổ hợp).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz họ mới | CÓ PHÁT HIỆN | 🔴 AUD-SEC-875 (hồi quy #650), AUD-SEC-876, AUD-SEC-877 · 🟠 AUD-SEC-878 · 🟢 AUD-SEC-879 |
| Hồi quy #650/#648 | CÓ PHÁT HIỆN | 🟠 AUD-SEC-880…882, AUD-SEC-884 · 🟢 AUD-SEC-883, AUD-DEP-032, AUD-HAR-429 · có từ trước: 🔴 AUD-SEC-885 (không có hạn giờ chung), AUD-SEC-886, AUD-SEC-887 · 🟢 AUD-SEC-888, AUD-SEC-889 |

Đợt 9 (T-3942, #652): bộ fuzz chỉ-guard `leaks6.fam` 665, bộ cổng ký 4 (829) và 5 (2 535) → 0 lọt; hạn giờ chung `DECISION_SECONDS` 15 s (D-505) đóng lỗ lệnh 256 KB chạy quá 1300 s. Còn mở sau #652: AUD-SEC-887 (`parallel`/`sem`) và AUD-SEC-890 (🔴 `$(pwd)` + hàm che trong thân `sh -c`, do fuzz tất định của CI bắt ở #653).

Đợt 9 phần 2 (T-3943, #654): cả hai đóng — mọi `parallel`/`sem` → BUDGET; `_pwd_subst` (ma trận 2 220 tổ hợp: nền lọt 360 → 0); 888 (điểm kiểm hạn giờ, sed 50 KB → BUDGET sau 15,0 s) và 889 (heredoc dữ liệu thuần) cùng đóng. Nợ 🟢 mới: AUD-SEC-891 (`apt-get install parallel` BUDGET), AUD-SEC-892 (tên lệnh glob `gi[t]`), AUD-HAR-430 (câu `a[0]=1 cmd` ở `harness-files.md`). Sổ không còn 🔴/🟠 mở; cổng ký lần 7 chạy trên `b76d7af5`. Cổng ký lần 7 chạy sau T-3943, gồm cả các họ INCONCLUSIVE.

## Cổng ký lần 7 (ứng viên `b76d7af5`, sau đợt 9)

Hai lô reviewer-alt: fuzz các họ còn INCONCLUSIVE của cổng ký 6 cùng ma trận giá trị tính được, và hồi quy #652/#654. Oracle bash thật chạy với đường tuyệt đối, PATH chỉ có lệnh giả và canary; không có sự cố. Lô fuzz: 164 474 quyết định guard (~181 000 lần chạy bash thật); lõi × `while`/`case`/`coproc`/`time { }`/`sh -c` 2–3 tầng/`sh -c`→`bash -c` 134 190 tổ hợp 0 lọt; mọi dạng `parallel`/`sem` trần bị chặn; ma trận giá trị tính được 19 878 tổ hợp lọt 1 462 (178 hồi quy). Lô hồi quy: tốc độ 1,03×/0,98× nền, 1 311 test chạy chung một tiến trình OK, blueprint `--run` exit 0, bench false-green 0; 64/6 592 ca lành bị chặn oan (4 idiom gốc).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz | CÓ PHÁT HIỆN | 🔴 AUD-SEC-893 (hồi quy: `BASH_CMDS`), AUD-SEC-894 (đổi PATH qua `read`/`printf -v`…), AUD-SEC-895 (thân `trap`), AUD-SEC-896 (HEAD tách rời) · 🟠 AUD-SEC-897 (`env_parallel`) |
| Hồi quy | CÓ PHÁT HIỆN | 🔴 AUD-SEC-898 (argv `parallel` của Python), AUD-SEC-899 (stdin/`--eval` của công cụ ngoài), AUD-SEC-900 (xoá nội tạng `.git`) · 🟠 AUD-SEC-901 (chặn oan `ready`/`readlink`) · 🟢 AUD-SEC-902…904, AUD-HAR-430 |

Đợt 10 (T-3945, #656, D-506): danh sách đóng `_shadow_level`; bộ lọt `leaksS` 1 462 → 0, `leaks7` 2 410 → 28 (đều `niceload` trần, không chạy lệnh), bộ cổng ký 4–6 vẫn 0; 64 ca chặn oan → 0; tốc độ p50/p95 1,05×/1,06× nền. Còn mở: 🟢 AUD-SEC-905 (ghi đè `.git/HEAD` bằng `mv`/`truncate`/`>`). So bộ ca cũ sau khi đẩy #656 bắt thêm một hồi quy của chính nó (mô hình `pushd`/`popd` một tầng làm lọt 39 ca `DIRSTACK[1]=…; popd`), vá ở #658. Cổng ký lần 8 chạy trên ứng viên sau #658.

## Cổng ký lần 8 (ứng viên `7b1ebc84`, sau đợt 10)

Hai lô reviewer-alt: fuzz danh sách đóng (D-506) và hồi quy #656/#658. Oracle bash thật chạy với đường tuyệt đối, PATH chỉ có lệnh giả và canary; không có sự cố. Lô fuzz: ma trận giá trị tính được 21 241 tổ hợp 0 lọt (`leaksS` 1 462 → 0), ca cũ cổng ký 4–7 (4 839) 0 lọt, tốc độ 0,99× nền; ma trận mới 26 225 tổ hợp lọt ở 8 họ (đều có từ trước). Lô hồi quy: 4 cổng máy xanh (1 332 test một tiến trình), tốc độ 1,02× nền, 18 chặn oan lệnh lành (O2–O4 và `$(branch)`).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz | CÓ PHÁT HIỆN | 🔴 AUD-SEC-906 (nguồn không phải chữ), AUD-SEC-907 (thân bị che), AUD-SEC-908 (cờ chương trình), AUD-SEC-909 (`.git` qua glob), AUD-SEC-910 (giá trị tính được thoát ra) · 🟠 AUD-SEC-911 (`.git` chung của worktree), AUD-SEC-912 (trồng PATH nhiều bước), AUD-SEC-913 (argv `parallel` dựng chuỗi) |
| Hồi quy | CÓ PHÁT HIỆN | 🟠 AUD-SEC-914 (push `src:dst`), AUD-SEC-915…917 (chặn oan `git pull`, `[ -eq ]`, SQL/manifest), AUD-SEC-918 (`$(date)` vào thư mục có sẵn) · 🟢 AUD-SEC-919, AUD-HAR-431 |

D-507: sửa mọi lỗ có thể do lỡ tay và mọi chặn oan phổ biến; chấp nhận có chủ và hạn 2027-01-21 hai họ cần nhiều bước hoặc dựng chuỗi động (AUD-SEC-912, AUD-SEC-913; giới hạn ghi ở `harness-files.md`; hàng rào thật là sandbox, ADR-0072).

Đợt 11 (T-3947, #661): bộ tái hiện 34 ca sai 31 → 0; fz8 `leaks8` 2 150 → 13 (đều họ AUD-SEC-912 đã chấp nhận); fz7/fz6/fz-110f0807 0; 28 901 ca cũ: 32 ca chặn → qua đều là 16 lệnh lành × 2; chặn oan corpus lành 175 → 171; tốc độ p50/p95 8,1 → 7,0 / 19,1 → 15,7 ms. AUD-SEC-905 cùng đóng. Cổng ký lần 9 chạy sau #661.

## Cổng ký lần 9 (ứng viên `e2f89c8b`, sau đợt 11)

Hai lô reviewer-alt: fuzz tổng hợp (42 365 tổ hợp, 33 986 nguy hiểm trong bash thật) và hồi quy #661 (2 336 lệnh lành × nền). Oracle bash thật chạy với đường tuyệt đối, PATH chỉ có lệnh giả và canary; không có sự cố. Mọi bộ lọt cũ của cổng ký 4–8 0 lọt (ngoài 13 ca họ (a)); các họ #661 mới thêm (`git push` từ `$(branch)`, `.git` chung của worktree, `.git` qua glob, `git -C`/`GIT_DIR`) 0 lọt; mọi ca bọc `parallel`/`sem` bị chặn; tốc độ 0,89× (fuzz) và 1,02× (hồi quy) nền. 27 module `test_guard_*` rồi `test_hooks` một tiến trình: 47 test đỏ do test `signoff8` làm rò patch (AUD-TEST-120).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| Fuzz | CÓ PHÁT HIỆN | 🔴 AUD-SEC-927 (chuyển hướng stdin vào lệnh ghép), AUD-SEC-925 (`ex -sc`), AUD-SEC-921 (hồi quy: lối thoát qua stdin), AUD-SEC-928 (`echo \| ed`), AUD-SEC-929 (`make -f /dev/fd/N`) · 🟠 AUD-SEC-923 (`$(date)` qua biến), AUD-SEC-924 (ghi đè `.git/**`), AUD-SEC-930 (nhóm lệnh trước `crontab -`) · 🟢 họ (c): AUD-SEC-931 |
| Hồi quy | CÓ PHÁT HIỆN | 🟠 AUD-SEC-920 (`$` ở here-string), AUD-SEC-922 (`for PATH in`), AUD-SEC-923 · 🟢 AUD-SEC-926, AUD-TEST-120, AUD-HAR-432 |

D-508: sửa mọi lỗi có thể do lỡ tay và chặn oan phổ biến; họ (c) — payload nguy hiểm viết tường minh vào stdin của công cụ đọc chương trình rồi che bằng lệnh ghép/`echo`/fd/biến — sửa vì gọn ở B1–B4 (AUD-SEC-927…930), phần còn lại (heredoc thân `$x`, `r${Z}m` trong gawk/perl, `mktemp` lỗi trả rỗng) chấp nhận có chủ và hạn 2027-01-21 (AUD-SEC-931).

Đợt 12 (T-3949, #663): fz9 lọt 5 125 → 695 (610 heredoc `$x` + 27 `r${Z}m` + 45 mktemp rỗng, đều họ (c); 13 họ (a)); bộ fuzz cũ không tăng; 824 biến thể quanh từng mục sửa 0 lọt; flip ~470 nghìn ca cũ: 2 ca chặn → qua đều là `git push origin "HEAD:$(git branch --show-current)"` lành; tốc độ p50/p95 0,99×/0,96× nền. Cổng ký lần 10 chạy theo kiểu toàn diện (nhiều lô song song) sau #663.

## Cổng ký lần 10 (ứng viên `a20ba307`, sau đợt 12) — toàn diện

Theo yêu cầu của người dùng (kiểm toàn diện một lần để sửa ít vòng hơn): 5 lô reviewer-alt chạy song song, mỗi lô tự sinh biến thể quanh từng lỗi và báo cả họ kèm số biến thể lọt; gom hết rồi sửa một đợt. Oracle bash thật với đường tuyệt đối, PATH chỉ có lệnh giả và canary; không có sự cố. Không lô nào thấy hồi quy an toàn so với `e2f89c8b`. Lô 3 phát hiện các fuzz fz6–fz9 đặt gốc guard dưới `/tmp` nên `..` bị coi là thư mục tạm (che vài ca); các lô sau dùng gốc ngoài `/tmp` (AUD-TEST-121).

| Lô | Kết luận | Phát hiện |
|---|---|---|
| 1 stdin/chương trình (28 599 tổ hợp, 3 192 lọt có từ trước) | CÓ PHÁT HIỆN | 🔴 AUD-SEC-935 (template JS), AUD-SEC-936 (Python bí danh) · 🟠 AUD-SEC-937 · 🟢 họ (c) |
| 2 đường dẫn/`.git`/ghi đè | CÓ PHÁT HIỆN | 🔴 AUD-SEC-932 (`>&TỆP`) · 🟠 AUD-SEC-939 (symlink glob), AUD-SEC-940 (công cụ ghi ngoài bảng) · 🟢 `nocaseglob`, chặn oan A4 |
| 3 giá trị tính được | CÓ PHÁT HIỆN | 🔴 AUD-SEC-933 (biến rỗng ở đích xoá), AUD-SEC-934 (runner đổi thư mục) · 🟠 AUD-SEC-938 (push sau checkout) · 🟢 `trap 'cd ~'` (cố ý) |
| 4 bọc/ghép/hành động ra ngoài (78 448 quyết định) | CÓ PHÁT HIỆN | 🔴 AUD-SEC-945, 947…950 · 🟠 AUD-SEC-944, 946, 951, 952 · 🟢 AUD-SEC-953, 954 |
| 5 chặn oan/tốc độ/test/tài liệu (3 050 lệnh × 3 phiên bản; 357 idiom mới) | APPROVE | 0 🔴/🟠 do diff; 🟠 có từ trước AUD-SEC-941 (`grep -rl | xargs sed -i`) · 🟢 AUD-SEC-942, AUD-HAR-433 |

D-508 áp dụng: họ (c) mở rộng (payload che bằng biến/`getattr`/template JS) chấp nhận có hạn (AUD-SEC-943); xoá trong container cục bộ chấp nhận (AUD-SEC-955); còn lại sửa. AUD-SEC-060 (🟢 mở từ trước, ghi đè dotfile `~`/`/etc`) được nâng mức và đóng.

Đợt 13: T-3951 (#665) và T-3952 (#666). Số ca lọt: EV 1 484 → 0, BR 140 → 0 (lô 3); F1 229 → 0, F2 161 → 0, F4 368 → 0, F5 434 → 0, F6 230 → 0, F7 276 → 0, F8 414 → 0, F9 115 → 0, F10 506 → 0, F11 115 → 0 (lô 4, 4 660 biến thể); hồi quy tốc độ p50/p95 1,005×/1,006× nền; 170 lệnh lành phổ biến 0 bị chặn. Hai sự cố CI trên đường: CodeQL `py/clear-text-logging-sensitive-data` vì tên định danh chứa `secret` (đổi tên, không đổi hành vi) và BASE-GATE-005 cấm ngưỡng CPU cứng ở `test_guard_d503_invariant` (bỏ phép đo). Cổng ký lần 11 chạy sau #666 với phạm vi hẹp (các họ vừa sửa, họ INCONCLUSIVE, một lô chặn oan).

## Cổng ký lần 11 (ứng viên `4d8c403f`, sau đợt 13) và xác nhận cuối (`fee39e61`)

Phạm vi hẹp theo D-509 (3 lô reviewer-alt: A ma trận các họ vừa sửa + họ INCONCLUSIVE của cổng ký 10; B chặn oan/tốc độ/test/tài liệu; C đối kháng một bước do lỡ tay). Guard-only với gốc ngoài `/tmp` và bash thật trong sandbox; không có sự cố. Không lô nào thấy hồi quy an toàn so với `a20ba307`.

| Lô | Kết luận | Phát hiện |
|---|---|---|
| A họ vừa sửa + INCONCLUSIVE (~66 000 quyết định) | CÓ PHÁT HIỆN | 🔴 AUD-SEC-956…962 (sed `-Ei`, `$HOME`, `curl -sX`/`curlie`, token qua echo/printf, npm/pnpm tuỳ chọn chung, bí danh API, `$@`/`$*`) · 🟠 AUD-SEC-963 (json.tool, bun exec, autossh/mosh, pwsh, móc môi trường, stdin chạy như lệnh, lối thoát shell) · 🟢 AUD-SEC-964 |
| B chặn oan/tốc độ/test/tài liệu (719 idiom, 12 254 ca) | CÓ PHÁT HIỆN | 🟠 AUD-SEC-966 (`git pull --rebase && git push` — hồi quy #665), 967, 968, 969, 970, 971 · 🟢 AUD-TEST-122, AUD-HAR-434 |
| C đối kháng một bước (~3 500 quyết định) | CÓ PHÁT HIỆN | 🔴 AUD-SEC-972 (bí mật vào artefact GitHub), AUD-SEC-973 (`wsl.exe --unregister`) · 🟠 AUD-SEC-974…977 · 🟢 AUD-SEC-978 |

Theo quyết định của người dùng (D-509) đây là đợt sửa cuối: #669 (T-3954) và #668 (T-3955) đã sửa các mục trên. Lô xác nhận cuối trên `fee39e61` (703 idiom lành, 6 525 ca tốc độ, 60 lệnh nguy hiểm một dòng): 60/60 vẫn bị chặn, 6 lệnh bắt buộc qua đều qua, tốc độ p50 13,1 ms, p95 46,6 → 50,4 ms; tìm hai 🟠 chặn oan do chính diff (AUD-SEC-981 chữ trong nháy qua ống, AUD-SEC-982 `--rsync-path` ở máy xa) → T-3956, cùng PR với sổ này để tiết kiệm một lượt CI. Còn lại là giới hạn đã biết có hạn 2027-01-21 (AUD-SEC-965) và 🟢 mở AUD-SEC-980, AUD-SEC-983; AUD-TEST-123 (test phụ thuộc mạng làm đỏ cổng commit) đóng cùng PR này bằng `isolate_network`. Cắt 3.34.0 ngay sau PR này.

## Audit delta 2026-11-19 (ứng viên `fe5f1e8e`, trước cắt bản 3.34.0)

`release-check` (3.34.0) đòi `audit check --strict` xanh và nợ review sau SHA quét bằng 0; nhóm TEST (4) và HAR (13) chưa từng quét, DOC có 155 file đổi, SEC/ARCH/CODE/XFEAT/DEP có file đổi từ 2026-11-11/17. Guard (`guard.py`) đã rà ở 11 cổng ký nên 4 lô không rà lại logic guard. Mỗi lô reviewer-alt ở worktree riêng (không `/tmp`), CHỈ ĐỌC.

| Lô | Nhóm | Kết luận | Phát hiện |
|---|---|---|---|
| l1 | ARCH · CODE · XFEAT · DEP | ARCH `đã quét-sạch`; CODE, XFEAT, DEP có phát hiện | 🟠 `pack-acceptance.yml` thiếu `pnpm audit:exceptions` (AUD-DEP-033) · 🟢 GHSA-fc5q-39xc-vjpf bị OSV rút 2026-11-18, `check-audit-exceptions.ts` đọc rỗng với YAML hợp lệ, hạn ngoại lệ làm hai nơi, `@types/node` lệch `engines` |
| l2 | SEC ngoài guard · CI | SEC `INCONCLUSIVE` (chưa rà gitleaks toàn lịch sử vì guard chặn oan lệnh, SHA ghim ↔ tag upstream, phần còn lại diff `xt.py`); CI có phát hiện | 🟠 ruleset `required_review_thread_resolution` `false` trái WF-REVIEW-005/WF-GIT-002 (AUD-CI-034, D-511) · 🟢 `XT_FRAMEWORK_PYTHON`, chú thích `release-tag.yml`, lời báo Python < 3.11, guard chặn oan `gitleaks git` |
| l3 | TEST (lần đầu) | `INCONCLUSIVE` (4 mục con chưa rà) | 🟢 N1–N4 (giờ tường, regex ngưỡng cứng, 38 input trùng, scope 🟢); 71 module riêng xanh, chuỗi 33 module + test_hooks một tiến trình xanh (1 475 test) |
| l4 | HAR (lần đầu) · DOC | `INCONCLUSIVE` (HAR `harness-files.md:252–387`, DOC `DECISIONS*.md`, vài file) | 🟠 `PROGRESS.md` lạc hậu 26 PR · 🟢 trạng thái ADR 0075–0079, `orchestration-and-subagents.md:65`, `harness-files.md:93`, AUD-HAR-430 còn `mở`; 28/28 URL ngoài, liên kết, CHANGELOG, số liệu sạch; `harness-files.md` 55/56 khớp hành vi |

Sửa gộp T-3958 (D-512, D-513) và `PROGRESS.md` trong PR cắt bản; bảng nhóm cập nhật `fe5f1e8e` (ARCH/CODE/DEP/CI/XFEAT `đã quét`; SEC/TEST/DOC/HAR `rút gọn`, chỗ chưa rà ghi ở cột Ghi chú). Còn 🟢 mở: AUD-HAR-436, AUD-TEST-125…127, AUD-SEC-985, AUD-DEP-036.
