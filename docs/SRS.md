# SRS — Software Requirements Specification
## Ứng dụng PALVIN (Alvin ❤️ Paoi)

| | |
|---|---|
| **Phiên bản tài liệu** | 1.0 |
| **Ngày tạo** | 2026-08-28 |
| **Nguồn** | Reverse-engineered từ mã nguồn frontend hiện có (`frontend/src`) — không có backend |
| **Trạng thái** | Mô tả hành vi **thực tế** của bản build hiện tại, bao gồm cả phần dở dang/lỗi/orphaned |

> **Lưu ý quan trọng về phương pháp làm tài liệu:** Tài liệu này được dựng ngược (reverse-engineer) từ code frontend đã tồn tại, không phải từ một bản đặc tả được duyệt trước. Vì vậy, ngoài các yêu cầu chức năng "nên có", tài liệu **ghi nhận trung thực** cả những phần đã cài đặt nhưng chưa hoạt động đúng như kỳ vọng (ví dụ: xác thực không thực sự chặn truy cập, một số màn hình không thể truy cập được). Các mục này được đánh dấu rõ bằng nhãn trạng thái ở cột **Tình trạng**.

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu
Tài liệu này đặc tả đầy đủ các yêu cầu chức năng và phi chức năng của ứng dụng PALVIN — một ứng dụng mạng xã hội/nhật ký riêng tư dành cho một cặp đôi (Alvin và Paoi) — dựa trên phân tích mã nguồn frontend hiện có. Mục tiêu là làm cơ sở để: (a) đối chiếu/kiểm thử hành vi hiện tại, (b) làm nền tảng thiết kế backend trong tương lai, (c) làm rõ các khoảng trống/nợ chức năng cần xử lý trước khi phát hành chính thức.

### 1.2 Phạm vi sản phẩm
PALVIN là một Single Page Application (SPA) chạy trên trình duyệt, mô phỏng giao diện iPhone, kết hợp:
- Mạng xã hội riêng tư kiểu Instagram (Feed) chỉ dành cho 2 người dùng.
- Nhật ký kỷ niệm & dòng thời gian mối quan hệ (Memories, Our Story).
- Quản lý tài chính chung (thu chi, quỹ tiết kiệm, hoá đơn định kỳ, chia sẻ chi phí).
- Nhắn tin tình cảm (Love Notes, Love Letters, Secret Notes/Time Capsule).
- Lịch chung & sự kiện (Calendar).
- Mục tiêu/ước mơ chung (Future Us — bucket list dạng "Goal").
- Các mini-feature gắn kết cặp đôi: Đơn xin phép đi chơi (Date Permit), Hũ hẹn hò (Date Idea Jar), Nhật ký biết ơn (Gratitude Journal), Trip Planner, Playlist, Our Favourites, Our Places, Photo Collage, Gift Wishlist.
- Tìm kiếm toàn cục, thông báo, hồ sơ/cài đặt.

Phiên bản hiện tại **không có backend** — toàn bộ dữ liệu nghiệp vụ nằm trong bộ nhớ (React state, mất khi tải lại trang), ngoại trừ hệ thống tài khoản (`auth.ts`) lưu trong `localStorage`.

### 1.3 Định nghĩa, thuật ngữ, từ viết tắt

| Thuật ngữ | Ý nghĩa |
|---|---|
| AppState | Đối tượng trạng thái trung tâm chứa toàn bộ dữ liệu nghiệp vụ của ứng dụng (định nghĩa tại `types.ts`) |
| `currentUser` | Người dùng "đang xem" ứng dụng dưới góc nhìn nào (`'Alvin'` hoặc `'Paoi'`) — không phải tài khoản đăng nhập thật |
| AuthProfile | Hồ sơ tài khoản thật (tên, mật khẩu, mã liên kết) lưu trong `localStorage`, tách biệt khỏi AppState |
| Screen stack | Ngăn xếp điều hướng toàn cục (`navigate()`/`goBack()`) do `context.tsx` quản lý |
| Sub-navigation cục bộ | Hệ thống điều hướng thứ hai, độc lập, chỉ tồn tại bên trong màn hình "Us" (`Us.tsx`) |
| Orphaned (mồ côi) | Màn hình/tính năng có mã nguồn hoàn chỉnh nhưng **không có đường dẫn nào trong UI thực tế để người dùng truy cập được** |
| Toast | Thông báo nổi tạm thời (snackbar) hiển thị 3 giây |
| Bottom sheet | Modal trượt lên từ cạnh dưới màn hình |

### 1.4 Tài liệu tham khảo
- Bản brief gốc: `frontend/src/imports/pasted_text/palvin-app-brief.md` (đặc tả ban đầu khi sinh app bằng Figma Make)
- Mã nguồn: `frontend/src/**/*.tsx`, `frontend/src/context.tsx`, `frontend/src/types.ts`, `frontend/src/data.ts`, `frontend/src/auth.ts`

### 1.5 Tổng quan tài liệu
- Chương 2: Mô tả tổng quan sản phẩm, người dùng, ràng buộc.
- Chương 3: Danh sách actor & sơ đồ use case tổng quan.
- Chương 4: Yêu cầu chức năng chi tiết theo từng module (định dạng FR-ID).
- Chương 5: Yêu cầu phi chức năng.
- Chương 6: Ma trận trạng thái triển khai (feature status matrix).
- Chương 7: Vấn đề/hạn chế đã biết.
- Chương 8: Định hướng phát triển tương lai.
- Phụ lục A: Tổng quan dữ liệu mẫu (seed data).

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm
PALVIN được sinh ra ban đầu qua Figma Make từ một bản brief chi tiết (40 mục, xem §1.4), sau đó được phát triển tiếp thủ công, bổ sung nhiều tính năng vượt ra ngoài brief gốc (Trip Planner, Time Capsule, Couple Trivia, Date Permit, Date Idea Jar, Gratitude Journal, Mood Tracker, Monthly Stats, Bills, Playlist, Love Letters, Bucket List, Love Languages...). Ứng dụng chỉ có **frontend**, không có server/API/CSDL thật — thư mục `backend/` tồn tại nhưng rỗng.

### 2.2 Đối tượng sử dụng
- **Người dùng cuối:** đúng 2 cá nhân cố định — "Alvin" và "Paoi" — dùng chung một bộ dữ liệu (không có khái niệm nhiều cặp đôi/nhiều tài khoản dữ liệu riêng biệt trong AppState).
- Không có vai trò quản trị viên, không có bên thứ ba.

### 2.3 Môi trường vận hành
- Chạy trên trình duyệt hiện đại (Chrome/Edge/Safari), build bằng Vite + React 19 + TypeScript.
- Giao diện được thiết kế mobile-first, hiển thị bên trong khung mô phỏng iPhone 393×852px cố định trên mọi kích thước màn hình (không co giãn theo viewport thật — xem §5.7).
- Không yêu cầu kết nối mạng để chạy ứng dụng ở trạng thái hiện tại (ảnh minh hoạ tải từ Unsplash qua URL ngoài, cần mạng để hiển thị ảnh).

### 2.4 Ràng buộc thiết kế/triển khai
- Không có backend/API — mọi thao tác ghi dữ liệu chỉ tồn tại trong bộ nhớ phiên làm việc (RAM), **mất hoàn toàn khi tải lại trang** (F5), trừ dữ liệu tài khoản (`localStorage['palvin_auth']`) và ảnh đại diện.
- Không có cơ chế đồng bộ giữa hai thiết bị/hai người dùng thật — "Alvin" và "Paoi" chia sẻ cùng một AppState trong cùng một tab trình duyệt, chuyển đổi góc nhìn bằng nút "View as" trong Settings chứ không phải đăng nhập hai tài khoản riêng.
- Ngôn ngữ giao diện **không nhất quán**: xen kẽ tiếng Việt và tiếng Anh tuỳ màn hình/tuỳ hành động (xem chi tiết §7).
- Đơn vị tiền tệ **không nhất quán**: màn hình Money dùng VNĐ (₫), form thêm chi tiêu và màn hình Monthly Stats dùng USD ($) cho cùng một trường dữ liệu `Expense.amount`.

### 2.5 Giả định & phụ thuộc
- Giả định trình duyệt hỗ trợ `localStorage`, `FileReader`, CSS Grid/Flexbox, `backdrop-filter`.
- Phụ thuộc ảnh minh hoạ từ `images.unsplash.com` (URL cứng) — không có tải ảnh thật lên server.
- Giả định chỉ có tối đa 2 hồ sơ tài khoản được tạo (ràng buộc cứng trong `auth.ts`).

---

## 3. Actor & Use Case tổng quan

### 3.1 Actor
| Actor | Mô tả |
|---|---|
| Alvin | Một trong hai người dùng cố định |
| Paoi | Người dùng còn lại |
| (Chung) "Người dùng hiện tại" | `currentUser`, có thể chuyển đổi tự do giữa Alvin/Paoi qua Settings mà không cần xác thực |

### 3.2 Nhóm use case chính
1. Quản lý tài khoản & liên kết cặp đôi (đăng ký, đăng nhập, liên kết mã, đăng xuất) — *xem tình trạng thực tế ở FR-AUTH*.
2. Duyệt & tương tác với bảng feed ảnh chung (đăng, thích, bình luận, lưu, thả cảm xúc).
3. Quản lý kỷ niệm & dòng thời gian mối quan hệ.
4. Quản lý tài chính chung (thu/chi, hoá đơn, quỹ tiết kiệm, thống kê, chia sẻ chi phí).
5. Gửi/nhận thông điệp tình cảm (note nhanh, thư dài, thư bí mật/hẹn giờ).
6. Quản lý lịch & sự kiện chung.
7. Quản lý mục tiêu/ước mơ chung (Future Us).
8. Các tương tác gắn kết hằng ngày: cập nhật cảm xúc, gửi ôm, quay hũ ý tưởng hẹn hò, viết nhật ký biết ơn, xin phép đi chơi.
9. Lập kế hoạch chuyến đi chung (Trip Planner).
10. Tìm kiếm nội dung toàn cục & xem thông báo.
11. Quản lý hồ sơ cá nhân, ảnh đại diện, cài đặt hiển thị.

---

## 4. Yêu cầu chức năng chi tiết

> Định dạng: **FR-<Module>-<số>** — Mô tả — Điều kiện tiên quyết — Luồng chính — Ràng buộc/validate — Kết quả — **Tình trạng**.
> Nhãn tình trạng dùng: ✅ Hoạt động đầy đủ · ⚠️ Hoạt động một phần/có lỗi · 🚫 Không thể truy cập (orphaned) · ⛔ Chưa cài đặt (chỉ có UI tĩnh, không có logic).

### 4.1 Module Xác thực & Hồ sơ tài khoản (Auth)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-AUTH-01 | Hệ thống cho phép đăng ký tối đa 2 hồ sơ (tên hiển thị duy nhất không phân biệt hoa/thường, mật khẩu ≥ 4 ký tự, xác nhận mật khẩu khớp). Lưu vào `localStorage['palvin_auth']`, mật khẩu dạng **plaintext**. | ✅ (logic hoạt động đúng khi được gọi) |
| FR-AUTH-02 | Hệ thống cho phép đăng nhập bằng tên + mật khẩu đã đăng ký, báo lỗi "Không tìm thấy tài khoản." hoặc "Mật khẩu không đúng." tương ứng. | ✅ |
| FR-AUTH-03 | Sau đăng ký (luôn luôn) hoặc sau đăng nhập (nếu chưa liên kết), hệ thống bắt buộc chuyển sang màn hình "Liên kết với nửa kia": hiển thị mã liên kết 6 ký tự của bản thân, cho nhập mã của đối phương. Liên kết là **vĩnh viễn, không thể huỷ**. | ✅ |
| FR-AUTH-04 | Người dùng có thể bấm "Bỏ qua, kết nối sau" để hoàn tất mà không liên kết. | ✅ |
| FR-AUTH-05 | **Xác thực không chặn quyền truy cập ứng dụng.** Biến `authed` trong `App.tsx` được khởi tạo cứng là `true` và không có bất kỳ đoạn code nào đặt lại thành `false` (kể cả nút "Đăng xuất" ở Settings). Do đó màn hình `AuthScreen` (Welcome/Register/Login/Link) **không bao giờ hiển thị** khi mở ứng dụng — người dùng luôn vào thẳng Home với `currentUser = 'Alvin'` mặc định. | 🚫 Orphaned — toàn bộ màn hình `AuthScreen.tsx` không thể truy cập trong luồng UI hiện tại |
| FR-AUTH-06 | "Đăng xuất" tại Settings chỉ hiển thị hộp thoại xác nhận rồi phát toast "Signed out 👋" — không gọi `auth.ts`'s `logout()`, không đặt lại `authed`, không điều hướng đi đâu. Người dùng vẫn ở nguyên trong ứng dụng. | ⚠️ Có lỗi logic (hành động giả) |
| FR-AUTH-07 | Chuyển đổi góc nhìn "xem như Alvin/Paoi" tại Settings (`switchUser`) đổi `currentUser` ngay lập tức, **không cần mật khẩu/xác thực**, độc lập hoàn toàn với hồ sơ đang đăng nhập thật trong `auth.ts`. | ✅ (hoạt động đúng như thiết kế, nhưng là một lỗ hổng phân quyền nếu coi đây là ứng dụng có xác thực thật) |
| FR-AUTH-08 | Cho phép cập nhật ảnh đại diện qua chọn file ảnh (`FileReader` → base64), lưu vào hồ sơ auth hiện tại, đồng bộ lại bản đồ `profilePhotos` hiển thị toàn app. | ✅ |

### 4.2 Khung ứng dụng & Điều hướng (App Shell)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-SHELL-01 | Hiển thị thanh điều hướng dưới cố định gồm 5 mục: Home, Feed, "+" (nổi bật, giữa), Money/Stats, Us; mục thứ 5 hiển thị avatar người dùng hiện tại thay vì icon, dẫn tới Settings. | ✅ |
| FR-SHELL-02 | Header hiển thị: tiêu đề màn hình (hoặc logo "PALVIN" + "Alvin ❤️ Paoi" ở Home), nút quay lại `‹` (chỉ khi màn hình hiện tại không phải 1 trong 5 tab chính và khác Home), icon Tìm kiếm, icon Thông báo (có chấm đỏ nếu có thông báo chưa đọc). | ✅ |
| FR-SHELL-03 | Bấm "+" mở modal "Bạn muốn thêm gì?" với 6 lựa chọn: Post, Memory, Love Note, Expense, Event, Goal — mỗi lựa chọn mở form tương ứng trong cùng bottom sheet. | ✅ |
| FR-SHELL-04 | Điều hướng dùng ngăn xếp toàn cục (`navigate(screen, id?)` đẩy vào stack, `goBack()` lấy ra phần tử cuối nếu stack còn > 1 phần tử). | ✅ |
| FR-SHELL-05 | Toast phản hồi sau các hành động chính, tự ẩn sau 3 giây. | ⚠️ Có lỗi: bộ đếm giờ tắt toast dùng chung 1 `ref` — nếu 2 toast được tạo liên tiếp trong vòng 3 giây, toast đầu có thể không được tự động dọn đúng lúc, có nguy cơ tồn đọng trên màn hình. |
| FR-SHELL-06 | Modal "+" và các bottom sheet khác phải đóng khi: bấm nút ✕ (nếu có tiêu đề), bấm ra ngoài overlay, hoặc nhấn phím Escape. | ✅ cho các sheet dùng chung component `BottomSheet`; ⚠️ một số modal khác (mood picker & add-countdown ở Home, add-bill ở Money...) tự viết lại overlay riêng, không tái sử dụng `BottomSheet`, dẫn đến hành vi có thể không đồng nhất (ví dụ thiếu phím Escape). |

### 4.3 Home / Dashboard

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-HOME-01 | Hiển thị số ngày yêu nhau tính từ 21/08/2023 theo công thức `floor((now - start)/86400000)`, kèm số năm/tháng/ngày chi tiết. | ✅ |
| FR-HOME-02 | Hiển thị "streak" (chuỗi ngày liên tiếp mở app), lưu tại `localStorage['palvin_streak']`; tăng 1 nếu lần trước mở là hôm qua, reset về 1 nếu bỏ cách ≥ 2 ngày. | ⚠️ Chỉ tính "số ngày mở app liên tiếp", không phải mức độ tương tác/checkin thật; không cập nhật realtime trong cùng phiên. |
| FR-HOME-03 | Hiển thị 2 nút hành động nhanh: "Gửi ôm" và "Đang nghĩ đến em" — mỗi lần bấm tạo 1 bản ghi `hugs`, 1 thông báo, 1 toast, và hiệu ứng hoạt hoạ 0.8s. | ✅ |
| FR-HOME-04 | Khối "Hôm nay của mình 🎲": với mỗi hạng mục (Ăn uống/Cafe/Bida/Gaming), bấm "Gợi ý" chọn ngẫu nhiên 1 địa điểm trong `favPlaces[cat]` để hiển thị. | ⚠️ Kết quả chọn chỉ lưu ở state cục bộ của màn hình — mất khi rời khỏi Home. |
| FR-HOME-05 | Hiển thị dải "Đếm ngược" (countdown) có thể thêm mới (emoji, tiêu đề, ngày, màu — bắt buộc tiêu đề + ngày) và xoá. | ✅ |
| FR-HOME-06 | Hiển thị mục "Ngày này năm ngoái": các memory có cùng tháng và lệch tối đa 1 ngày so với hôm nay, thuộc năm trước. | ⚠️ Có lỗi biên: logic so khớp tháng yêu cầu khớp *chính xác* tháng (không dung sai), và không xử lý vòng lặp cuối/đầu năm (VD 31/12 so với 01/01 không được coi là gần nhau). |
| FR-HOME-07 | Hiển thị & cập nhật cảm xúc trong ngày cho người dùng hiện tại qua bottom sheet 8 lựa chọn; hiển thị biểu đồ cột tâm trạng 7 ngày gần nhất theo thang điểm quy đổi từ emoji. | ✅ |
| FR-HOME-08 | Hiển thị 5 memory gần nhất dạng cuộn ngang, link "Xem tất cả" sang màn hình Memories. | ✅ |
| FR-HOME-09 | Hiển thị tối đa 3 sự kiện sắp tới (từ hôm nay trở đi, sắp xếp tăng dần theo ngày). Bấm vào 1 dòng sự kiện luôn điều hướng sang màn hình Calendar tổng quát (không mở đúng chi tiết sự kiện đã bấm). | ⚠️ Thiếu deep-link tới đúng sự kiện |
| FR-HOME-10 | Hiển thị vòng quay đĩa than phát nhạc từ `playlist` (tự chuyển bài mỗi 4 giây) nếu playlist không rỗng. | ✅ (thuần trang trí, không phát âm thanh thật) |

### 4.4 Feed (Bảng tin)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-FEED-01 | Hiển thị danh sách bài đăng mới nhất lên trước, mỗi bài gồm: avatar+tên tác giả, ngày, ảnh, địa điểm (nếu có), caption, số thích, danh sách bình luận, thanh hành động (thích/bình luận/thả cảm xúc/lưu). | ✅ |
| FR-FEED-02 | Bấm icon tim hoặc double-click ảnh: đổi trạng thái thích (like/unlike), cập nhật số đếm ±1, hiệu ứng tim bay lên khi chuyển sang "đã thích". | ⚠️ Double-click hoạt động như "toggle" hai chiều (có thể lỡ tay bỏ thích khi double-click ảnh đã thích), khác quy ước Instagram tiêu chuẩn (double-tap chỉ để thích, không bỏ thích). |
| FR-FEED-03 | Bấm icon bình luận: mở/đóng ô nhập bình luận cho đúng 1 bài tại một thời điểm; nhập nội dung (không rỗng sau khi trim) + Enter hoặc bấm "Post" để thêm bình luận mới (tác giả = `currentUser`, ngày = "Just now"). | ✅ |
| FR-FEED-04 | Bấm icon 😊: mở bảng chọn 6 emoji cảm xúc; chọn 1 emoji để bật/tắt cảm xúc đó cho bài viết, đếm tổng số cảm xúc và hiển thị tối đa 3 loại cảm xúc "nổi bật" — **thực chất là 3 loại đầu tiên có số đếm > 0 theo thứ tự khai báo, không phải 3 loại có số đếm cao nhất.** | ⚠️ Nhãn "top reactions" gây hiểu nhầm |
| FR-FEED-05 | Bấm icon lưu/gắn thẻ: bật/tắt trạng thái "đã lưu" của bài viết. | ✅ |
| FR-FEED-06 | Bấm vào ảnh bài viết: điều hướng sang màn hình chi tiết bài viết (`post-detail`). | ✅ |
| FR-FEED-07 | Dải "Stories" hiển thị avatar cố định của Alvin và Paoi kèm nút "+". | ⛔ Chưa cài đặt — không có sự kiện bấm nào được gắn, chỉ mang tính trang trí. |
| FR-FEED-08 | Nút "···" (tuỳ chọn khác) trên mỗi bài viết. | ⛔ Chưa cài đặt — không có hành động khi bấm. |

### 4.5 Chi tiết bài viết (Post Detail)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-PDET-01 | Hiển thị đầy đủ thông tin 1 bài viết theo `selectedId`, cho phép thích/bỏ thích, lưu/bỏ lưu, xem toàn bộ bình luận, thêm bình luận mới. | ✅ |
| FR-PDET-02 | Nếu không tìm thấy bài viết theo id (đã bị xoá hoặc id sai), màn hình phải hiển thị thông báo phù hợp. | ⚠️ Hiện tại trả về `null` (màn hình trắng), không có thông báo lỗi hay tự động quay lại. |

### 4.6 Tạo nội dung (Create Flow — modal "+")

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-CREATE-01 | **Post**: bắt buộc chọn 1 trong 5 ảnh mẫu + caption không rỗng; địa điểm tuỳ chọn. Đăng thành công → bài mới lên đầu Feed, đóng modal, toast "Post published.". | ✅ |
| FR-CREATE-02 | **Memory**: bắt buộc tiêu đề, ngày, 1 trong 5 ảnh mẫu; địa điểm/miêu tả tuỳ chọn (địa điểm rỗng mặc định "Unknown"). `people` luôn gán cứng `['Alvin','Paoi']`, không có UI chọn người liên quan dù kiểu dữ liệu hỗ trợ. Thành công → thêm vào đầu danh sách Memories + 1 thông báo hệ thống, toast "Memory added 🌸". | ✅ (với hạn chế: không chọn được người tham gia) |
| FR-CREATE-03 | **Love Note**: người nhận luôn tự động là người còn lại; bắt buộc nội dung không rỗng; chọn 1 trong 8 emoji tâm trạng. Thành công → thêm vào đầu Love Notes + 1 thông báo, toast "Love note sent 💌". | ✅ |
| FR-CREATE-04 | **Expense**: bắt buộc tiêu đề và số tiền hợp lệ (không âm/0 vẫn được chấp nhận vì chỉ kiểm tra `isNaN`); chọn 1 trong 8 danh mục, người trả (mặc định = `currentUser`), ngày (mặc định hôm nay), ghi chú tuỳ chọn. | ⚠️ Không chặn số tiền ≤ 0; đơn vị hiển thị "$" trong form nhưng ứng dụng hiển thị VNĐ ở màn hình Money. |
| FR-CREATE-05 | **Event**: bắt buộc tiêu đề và ngày; giờ/địa điểm/ghi chú tuỳ chọn dù kiểu dữ liệu `time` không optional. | ⚠️ Có thể tạo sự kiện với giờ rỗng. |
| FR-CREATE-06 | **Goal** (mục tiêu/ước mơ — khác với "Savings Goal" quỹ tiết kiệm): bắt buộc tiêu đề, chọn 1 trong 15 emoji (mặc định ✨). Thành công → thêm vào Future Us ở trạng thái chưa hoàn thành. | ✅ |
| FR-CREATE-07 | Modal "+" chỉ có 6 lựa chọn nêu trên; brief gốc yêu cầu thêm lựa chọn "📍 Place" nhưng lựa chọn này **không tồn tại** trong bản build hiện tại. | ⛔ Chưa cài đặt so với brief |
| FR-CREATE-08 | "Secret Note" (ghi chú hẹn giờ mở khoá): brief và cả dòng chú thích trong màn hình Love Notes ("Secret notes are written from the Create menu 🔐") đều ngụ ý có thể tạo từ menu "+", nhưng **không có bất kỳ hành động nào trong `context.tsx` để thêm mới `secretNotes`** — dữ liệu chỉ đến từ seed data cố định, không thể tạo/sửa/mở khoá thủ công qua UI. | ⛔ Chưa cài đặt (mâu thuẫn với chính văn bản trong app) |

### 4.7 Memories & Dòng thời gian

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-MEM-01 | Hiển thị lưới ảnh kỷ niệm, lọc theo năm cố định (`All, 2026, 2025, 2024, 2023`). | ⚠️ Danh sách năm lọc là hằng số cứng, không tự sinh theo dữ liệu thực tế — memory thuộc năm ngoài danh sách này (VD 2022, 2027) sẽ không có nút lọc riêng (vẫn thấy được ở "All"). |
| FR-MEM-02 | Bấm 1 memory → mở màn hình chi tiết đầy đủ (ảnh lớn, tiêu đề, ngày, địa điểm, mô tả dạng "câu chuyện", danh sách người liên quan, nút yêu thích). | ✅ |
| FR-MEM-03 | Cho phép bật/tắt "yêu thích" (favorite) một memory tại màn hình chi tiết. | ✅ |
| FR-MEM-04 | Nếu id memory không hợp lệ, màn hình chi tiết phải có phương án dự phòng (thông báo lỗi hoặc tự quay lại). | ⚠️ Hiện tại trả về `null` — màn hình trắng, người dùng chỉ thoát được bằng nút `‹` ở header (không nằm trong phần bị `return null`). |
| FR-MEM-05 | Trạng thái rỗng: hiển thị "No memories yet" + nút thêm memory khi bộ lọc hiện tại không có kết quả. | ✅ |
| FR-MEM-06 (Our Story) | Hiển thị dòng thời gian mối quan hệ theo năm. | ⚠️ Dữ liệu dòng thời gian là **hằng số cố định** (`TIMELINE_EVENTS`), hoàn toàn tách biệt khỏi dữ liệu `memories` thực tế — thêm/sửa/xoá memory không ảnh hưởng gì tới "Our Story". |
| FR-MEM-07 (Photo Collage) | Gom nhóm memory theo tháng-năm (`YYYY-MM` từ `memory.date`), hiển thị tối đa 4 ảnh/tháng kèm huy hiệu "+N" nếu nhiều hơn. | ✅ — đây là nguồn dữ liệu phái sinh đúng từ `memories` (khác với "Our Story" ở trên). |

### 4.8 Money — Tài chính chung

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-MON-01 | Màn hình Money có 4 tab: Thu chi, Quỹ (Savings Goals), Thống kê, Hóa đơn (Bills). | ✅ |
| FR-MON-02 | Tab Thu chi: lọc theo loại (Tất cả/Thu/Chi) và theo tháng (6 tháng cố định 03/2026–08/2026); nhóm giao dịch theo ngày, hiển thị tổng theo ngày (chỉ tính khoản chi); xoá giao dịch tức thời (không xác nhận). | ⚠️ Danh sách 6 tháng bị hardcode, không tự sinh theo ngày hệ thống; xoá không có bước xác nhận (khác các màn hình khác có "Xoá?" như Calendar). |
| FR-MON-03 | Tab Quỹ: hiển thị tổng đã tiết kiệm/mục tiêu toàn bộ + từng quỹ riêng (phần trăm, thanh tiến độ, hạn chót); cho nạp thêm tiền vào 1 quỹ, số dư luôn bị chặn không vượt quá mục tiêu (`Math.min(current+amount, target)`). | ✅ |
| FR-MON-04 | Tab Thống kê: tổng chi trong tháng, phần trăm thay đổi so với tháng trước, đóng góp theo từng người, **công thức bù trừ chi phí**: `diff = |tổng Alvin - tổng Paoi|`; người chi ít hơn "nợ" người kia đúng `diff/2` để cân bằng 50/50. Kèm biểu đồ theo danh mục và biểu đồ cột 6 tháng. | ✅ (đơn vị VNĐ) |
| FR-MON-05 | Tab Hóa đơn: theo dõi hoá đơn định kỳ theo ngày đến hạn trong tháng (`dueDay`); phân loại "Chưa thanh toán"/"Đã thanh toán"; đánh dấu đã trả (ghi ngày trả), bật/tắt nhắc nhở, xoá hoá đơn, thêm hoá đơn mới. | ⚠️ Logic tính "Quá hạn" so ngày trong tháng hiện tại mà **không xử lý việc lật tháng** — một hoá đơn có `dueDay = 5` khi hôm nay là ngày 28 sẽ hiển thị nhầm là "Quá hạn" dù thực chất đến hạn vào tháng sau. Ngoài ra nút xoá hoá đơn trên thẻ hiện đang **không hiển thị icon/nhãn** (nút rỗng, vẫn bấm được). |
| FR-MON-06 | Màn hình Monthly Stats (thống kê chi tiêu độc lập, đơn vị USD) là một cài đặt **khác, trùng lặp và không đồng bộ** với tab Thống kê của Money (VNĐ) cho cùng một nguồn dữ liệu `expenses`, kể cả không lọc khoản thu (income) ra khỏi tổng chi. | 🚫 Orphaned — màn hình được import trong `App.tsx` nhưng **không có case nào trong `ScreenRouter` trả về nó**; case `'stats'` thực tế trả về màn hình Money. Do đó `MonthlyStats.tsx` không thể được người dùng truy cập bằng bất kỳ thao tác nào trong bản build hiện tại. |

### 4.9 Love Notes / Love Letters / Secret Notes

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-NOTE-01 | Tab "Notes": danh sách note nhanh, đánh dấu "NEW" nếu chưa đọc và không phải người gửi là mình; bấm để mở rộng & tự đánh dấu đã đọc. | ✅ |
| FR-NOTE-02 | Tab "Letters": danh sách thư dài có giao diện giấy viết thư (5 kiểu nền, 2 kiểu font); soạn thư mới (bắt buộc tiêu đề + nội dung không rỗng); xoá thư có xác nhận. | ✅ |
| FR-NOTE-03 | Tab "Secret": chỉ hiển thị nội dung khi `unlockDate <= hôm nay`; trước đó hiển thị khoá 🔒. | ⚠️ Chỉ đọc — không có chức năng tạo Secret Note mới từ UI (xem FR-CREATE-08), dù dòng chú thích trong chính màn hình này khẳng định ngược lại. |
| FR-NOTE-04 | Nút "+" nổi mở form Love Note nhanh (ẩn khi đang ở tab Letters). | ✅ |

### 4.10 Calendar (Lịch chung)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-CAL-01 | Hiển thị lưới tháng, cho điều hướng tháng trước/sau; đánh dấu hôm nay, ngày đang chọn, và tối đa 2 chấm màu cho mỗi ngày có sự kiện. | ✅ |
| FR-CAL-02 | Chọn 1 ngày → hiển thị danh sách sự kiện ngày đó + nút thêm nhanh. | ✅ |
| FR-CAL-03 | Hiển thị tối đa 5 sự kiện sắp tới (từ hôm nay), sắp xếp tăng dần theo ngày. | ✅ |
| FR-CAL-04 | Xoá sự kiện yêu cầu xác nhận (Delete/No) trước khi xoá thật. | ✅ |
| FR-CAL-05 | Thêm sự kiện mới qua form dùng chung `AddEventForm` (bắt buộc tiêu đề + ngày). | ✅ |

### 4.11 Future Us (Mục tiêu chung)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-FUT-01 | Hiển thị thanh tiến độ tổng thể `%hoàn thành = số goal completed / tổng số goal`. | ✅ |
| FR-FUT-02 | Tách 2 khu vực: "Dreams to achieve" (chưa hoàn thành) và "Achieved" (đã hoàn thành, có ngày hoàn thành). | ✅ |
| FR-FUT-03 | Đánh dấu hoàn thành một mục tiêu kích hoạt hiệu ứng ăn mừng (confetti 2 giây) + toast "Goal completed! ❤️" — chỉ khi chuyển từ chưa→đã hoàn thành. | ✅ |
| FR-FUT-04 | Xoá mục tiêu tức thời, không có bước xác nhận. | ⚠️ Thiếu xác nhận (không nhất quán với Calendar) |
| FR-FUT-05 | Thêm mục tiêu mới qua `AddGoalForm` dùng chung với modal "+". | ✅ |

### 4.12 Us — Trung tâm cặp đôi & các mini-feature

Màn hình "Us" là một **router cục bộ độc lập** (không dùng ngăn xếp điều hướng toàn cục) với 13 mục menu. Đây là điểm khác biệt kiến trúc quan trọng cần lưu ý khi đọc bảng dưới: quay lại từ các mục này dùng nút "← Back" cục bộ riêng của từng mục, **không** dùng nút `‹` ở header ứng dụng (vì `screen` toàn cục vẫn giữ nguyên là `'us'`).

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-US-01 | Trang chính "Us": hero card (avatar 2 người, số ngày/năm yêu nhau), thống kê nhanh (Memories/Trips/Notes/Songs), menu 13 mục. | ✅ |
| FR-US-02 | **Our Story**: dòng thời gian tĩnh. | ⚠️ Xem FR-MEM-06 — dữ liệu hardcode, tách biệt `state.memories`. |
| FR-US-03 | **Our Favourites**: sửa nhanh Bài hát/Phim yêu thích (inline edit); quản lý 4 danh mục địa điểm yêu thích (Ăn uống/Cafe/Bida/Gaming) — thêm (tên bắt buộc) và xoá. | ✅ |
| FR-US-04 | **Our Places**: liệt kê địa điểm (quốc gia/vùng) kèm số memory liên quan, lọc memory theo địa điểm khi bấm vào. | ⚠️ Chỉ đọc — không có chức năng thêm địa điểm mới (`state.places` không có action tạo/sửa/xoá trong `context.tsx`). |
| FR-US-05 | **Playlist**: thêm bài hát (tiêu đề+nghệ sĩ bắt buộc, emoji+ghi chú tuỳ chọn), xoá bài hát. | ✅ |
| FR-US-06 | **Trip Planner**: danh sách chuyến đi (trạng thái planning/upcoming/completed), tạo mới (tiêu đề/điểm đến/ngày bắt đầu bắt buộc), xem chi tiết: theo dõi ngân sách (nạp thêm chi tiêu), checklist việc cần làm (thêm/tích hoàn thành), ghi chú, xoá chuyến đi. | ⚠️ Trạng thái chuyến đi (`status`) không có cách chuyển đổi qua UI sau khi tạo (luôn giữ nguyên `'planning'`); xoá chuyến đi không xác nhận. |
| FR-US-07 | **Time Capsule**: viết thư gửi tương lai, chọn người nhận (Alvin/Paoi/cả hai) + ngày mở khoá; chỉ mở được khi `unlockDate <= hôm nay`. | ⚠️ Không chặn chọn ngày mở khoá trong quá khứ (thư sẽ mở khoá ngay lập tức). |
| FR-US-08 | **Gift Wishlist**: mỗi người thêm món quà mong muốn; người còn lại có thể đánh dấu "Đã mua" (không phải chủ sở hữu mới thấy nút này); chủ sở hữu có thể xoá mục của mình. | ✅ |
| FR-US-09 | **Date Idea Jar**: "lắc hũ" chọn ngẫu nhiên 1 trong 20 ý tưởng hẹn hò có sẵn hoặc do người dùng tự thêm; lưu lịch sử 10 lượt rút gần nhất. | ⚠️ Toàn bộ dữ liệu (ý tưởng tự thêm, lịch sử rút) chỉ tồn tại trong state cục bộ của màn hình, **không dùng trường `AppState.dateIdeas`** đã được định nghĩa sẵn trong hệ thống — mất khi rời màn hình. |
| FR-US-10 | **Gratitude Journal**: mỗi người viết tối đa hiển thị 1 gợi nhắc/ngày (không chặn cứng ở tầng dữ liệu), xem thống kê số lần biết ơn mỗi người, lọc theo người viết. | ✅ (ràng buộc "1 lần/ngày" chỉ là gợi ý UI, không phải ràng buộc dữ liệu cứng) |
| FR-US-11 | **Date Permit**: nộp đơn xin phép đi chơi (danh mục, hoạt động, địa điểm, ngày giờ, lý do); người nhận duyệt/từ chối kèm ghi chú phản hồi; xem lại đơn đã nộp. Có 3 tab: Nộp đơn / Cần duyệt (kèm số đếm đơn chờ) / Đơn của tôi. | ✅ |
| FR-US-12 | **Photo Collage**: xem ảnh memory theo nhóm tháng, dữ liệu phái sinh từ `state.memories`. | ✅ |
| FR-US-13 | **Future Us / Our Calendar** (nhúng lại) truy cập được cả từ menu Us lẫn từ ScreenRouter toàn cục — 2 đường dẫn tới cùng 1 màn hình. | ✅ (trùng lặp đường dẫn nhưng không gây lỗi dữ liệu) |

### 4.13 Tìm kiếm (Search)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-SEARCH-01 | Tìm kiếm không phân biệt hoa/thường trên: caption bài viết & địa điểm, tiêu đề/địa điểm/mô tả memory, nội dung love note, tiêu đề savings goal, tiêu đề/địa điểm sự kiện, tên địa điểm (place). | ✅ |
| FR-SEARCH-02 | Kết quả nhóm theo loại nội dung, mỗi kết quả bấm vào điều hướng tới màn hình liên quan (Post/Memory có deep-link đúng id; Love Note/Event/Place chỉ điều hướng tới màn hình tổng quát). | ⚠️ Thiếu deep-link cho Love Note/Event/Place/Savings Goal. |
| FR-SEARCH-03 | Không tìm kiếm được trên: hoá đơn, chi tiêu, chuyến đi, mục tiêu (Goal/Future Us), bucket list, wishlist, biết ơn, playlist, capsule, love letter, đơn xin phép. | ⛔ Ngoài phạm vi hiện tại |
| FR-SEARCH-04 | Trạng thái rỗng khi chưa nhập ("Search PALVIN") và khi không có kết quả ("No results for ..."). | ✅ |

### 4.14 Thông báo (Notifications)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-NOTIF-01 | Liệt kê toàn bộ thông báo (mới nhất trước), phân biệt hình thức đã đọc/chưa đọc. | ✅ |
| FR-NOTIF-02 | Bấm 1 thông báo → đánh dấu đã đọc. Bấm "Đánh dấu tất cả đã đọc" → đánh dấu toàn bộ. | ✅ |
| FR-NOTIF-03 | Bấm vào thông báo phải điều hướng tới nội dung liên quan (bài viết, memory, love note...). | ⛔ Chưa cài đặt — thông báo hiện tại chỉ đổi trạng thái đọc, không deep-link. |
| FR-NOTIF-04 | Cho phép xoá từng thông báo/xoá tất cả. | ⛔ Chưa cài đặt |

### 4.15 Cài đặt (Settings)

| ID | Yêu cầu | Tình trạng |
|---|---|---|
| FR-SET-01 | Đổi ảnh đại diện qua chọn file ảnh. | ✅ |
| FR-SET-02 | Chuyển đổi góc nhìn Alvin/Paoi. | ✅ (xem lưu ý bảo mật ở FR-AUTH-07) |
| FR-SET-03 | Hiển thị thông tin liên kết đối tác (nếu đã liên kết qua `auth.ts`). | ✅ |
| FR-SET-04 | Sửa "Tên cặp đôi" / "Ngày kỷ niệm". | ⛔ Chưa cài đặt — nút "Edit" chỉ phát toast, không mở form thật, không có trường dữ liệu nào bị thay đổi. |
| FR-SET-05 | Bật/tắt 4 loại thông báo (Love notes/Memories/Expenses/Events). | ⚠️ Chỉ lưu ở state cục bộ màn hình, mất khi tải lại trang; không có logic nào trong ứng dụng thực sự đọc giá trị này để bật/tắt hành vi thông báo tương ứng. |
| FR-SET-06 | Bật/tắt chế độ tối (Dark mode) toàn ứng dụng. | ⚠️ Hoạt động ngay trong phiên (gán/thu hồi `data-theme="dark"`), nhưng **không được lưu trữ bền vững** — tải lại trang luôn quay về sáng vì `AppState` khởi tạo lại `darkMode:false`. |
| FR-SET-07 | Đăng xuất. | 🚫 Xem FR-AUTH-06 — hành động giả, không có hiệu lực thực. |

---

## 5. Yêu cầu phi chức năng

### 5.1 Hiệu năng
- Ứng dụng phải phản hồi tương tác người dùng (like, toggle, mở modal) tức thời (< 100ms) vì toàn bộ xử lý là cục bộ trên client, không có gọi mạng cho thao tác nghiệp vụ.
- Danh sách thông báo/feed hiện chưa có phân trang hay ảo hoá (virtualization); cần bổ sung nếu số lượng bản ghi tăng lớn trong tương lai.

### 5.2 Khả dụng & Trải nghiệm người dùng (Usability)
- Giao diện phải nhất quán theo bộ nhận diện Sakura Pink (§7 SDS có bảng màu chi tiết).
- Mọi hành động chính (thích, bình luận, lưu, thêm, sửa, xoá) phải có phản hồi tức thời qua UI/toast — nguyên tắc "no dead buttons" từ brief gốc; hiện còn vài điểm vi phạm nguyên tắc này (Stories avatar, nút "···", nút xoá hoá đơn không hiển thị icon) cần khắc phục.
- Ngôn ngữ hiển thị nên được chuẩn hoá về 1 ngôn ngữ nhất quán (hiện đang lẫn lộn Việt/Anh theo từng màn hình — xem §7).

### 5.3 Bảo mật
- Mật khẩu tài khoản hiện lưu **dạng plaintext** trong `localStorage` — cần băm (hash) trước khi lưu trữ nếu triển khai thật.
- Không có cơ chế hết hạn phiên, không có phân quyền theo tài khoản đã đăng nhập thực tế (currentUser tách biệt khỏi AuthProfile).
- Do dữ liệu chỉ nằm trên máy khách (`localStorage`/RAM), bất kỳ ai truy cập thiết bị/trình duyệt đều xem được toàn bộ nội dung riêng tư của cặp đôi.

### 5.4 Độ tin cậy & Lưu trữ dữ liệu
- **Không có persistence cho dữ liệu nghiệp vụ**: mọi thay đổi (bài viết, chi tiêu, ghi chú...) mất hoàn toàn khi tải lại trang. Đây là hạn chế nghiêm trọng nhất cần backend/CSDL thật để khắc phục (xem Chương 8).
- Chỉ hồ sơ tài khoản (`palvin_auth`) và streak (`palvin_streak`) tồn tại qua các lần tải trang, vì dùng `localStorage`.

### 5.5 Khả năng bảo trì & mở rộng
- Cần hợp nhất 2 hệ thống điều hướng hiện có (ngăn xếp toàn cục vs. sub-navigation cục bộ trong `Us.tsx`) để tránh nhầm lẫn khi thêm màn hình mới.
- Cần loại bỏ hoặc kết nối các module orphaned (CoupleTrivia, MoodTracker, MonthlyStats, BucketList, LoveLanguages) trước khi coi là sản phẩm hoàn chỉnh.
- Cần hợp nhất logic tính thống kê chi tiêu đang bị trùng lặp giữa Money.tsx và MonthlyStats.tsx.

### 5.6 Đa ngôn ngữ / địa phương hoá
- Hiện chưa có cơ chế i18n chính thức (không dùng thư viện dịch, chuỗi hardcode trực tiếp trong JSX bằng cả 2 ngôn ngữ). Cần chuẩn hoá nếu muốn hỗ trợ đa ngôn ngữ thật.

### 5.7 Tương thích thiết bị / trình duyệt
- Bản build hiện tại **hiển thị cố định trong khung mô phỏng iPhone 393×852px** căn giữa màn hình — đây là chế độ trình diễn (Figma Make preview), **chưa đáp ứng yêu cầu responsive thật** như brief gốc mô tả (mobile 390px / desktop 1440px với layout riêng, sidebar trên desktop). Cần làm lại phần khung ứng dụng (app shell) để responsive thật trước khi phát hành.

---

## 6. Ma trận trạng thái triển khai (Feature Status Matrix)

| Nhóm tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Feed, Post Detail, Create Post | ✅ Hoạt động | Có vài điểm UX nhỏ cần sửa (double-tap like, stories chết) |
| Memories, Memory Detail | ✅ Hoạt động | Photo Collage đúng; Our Story hardcode |
| Money (Thu chi/Quỹ/Thống kê/Hoá đơn) | ✅ Hoạt động, có bug tính hạn hoá đơn | |
| Monthly Stats | 🚫 Orphaned | Import nhưng không route tới được |
| Love Notes / Letters | ✅ Hoạt động | |
| Secret Notes | ⚠️ Chỉ đọc | Không tạo mới được |
| Calendar, Future Us | ✅ Hoạt động | Thiếu xác nhận xoá ở Future Us |
| Us hub + 8 mini-feature (Favourites/Places/Playlist/Trips/Capsule/Wishlist/DateIdea/Gratitude/Permit/Collage) | ✅ Hoạt động (qua sub-nav cục bộ) | Places chỉ đọc; DateIdea không dùng AppState chính thức |
| Couple Trivia | 🚫 Orphaned | Không có điểm vào nào trong UI |
| Mood Tracker (màn hình riêng) | 🚫 Orphaned | Dữ liệu nền (`state.moods`, `setMood`) vẫn được Home.tsx dùng trực tiếp |
| Bucket List (dữ liệu + action CRUD) | 🚫 Orphaned | Không màn hình nào hiển thị |
| Love Languages (dữ liệu + action) | 🚫 Orphaned | Không màn hình nào hiển thị |
| Search, Notifications | ✅ Hoạt động một phần | Thiếu deep-link |
| Settings | ⚠️ Một phần là stub | Edit couple info & notification toggle chưa có logic thật |
| Auth (Đăng ký/Đăng nhập/Liên kết) | 🚫 Orphaned ở tầng UI vào app | Logic nghiệp vụ đầy đủ, nhưng không gate được quyền truy cập |
| Đồng bộ dữ liệu / Backend | ⛔ Chưa tồn tại | Thư mục `backend/` rỗng |

---

## 7. Vấn đề & hạn chế đã biết (tổng hợp)

1. **Xác thực không gate quyền truy cập** — `App.tsx` khởi tạo `authed=true` cứng, không path nào set lại `false`; `AuthScreen` không thể truy cập trong luồng thực tế.
2. **"Đăng xuất" là hành động giả** — chỉ phát toast, không đổi trạng thái.
3. **Không có persistence** cho toàn bộ dữ liệu nghiệp vụ (mất khi F5), trừ tài khoản & ảnh đại diện & streak.
4. **3 màn hình orphaned hoàn toàn**: `CoupleTrivia.tsx`, `MoodTracker.tsx`, `MonthlyStats.tsx` (không có đường dẫn nào trong UI tới được).
5. **2 domain dữ liệu orphaned**: `bucketList` (12 mục seed + CRUD đầy đủ trong context nhưng không có UI), `loveLanguages` (action `saveLoveLanguage` tồn tại nhưng không UI nào gọi).
6. **`secretNotes` và `places` chỉ đọc** — có dữ liệu, hiển thị được, nhưng không có action tạo/sửa/xoá trong `context.tsx`.
7. **`Us.tsx` triển khai hệ thống điều hướng cục bộ thứ hai**, song song và độc lập với ngăn xếp điều hướng toàn cục — nút back header không hoạt động khi đang ở sâu trong các mini-feature của Us.
8. **2 cách tính thống kê chi tiêu không đồng bộ**: Money.tsx (VNĐ, loại trừ income, có phần Hoá đơn) và MonthlyStats.tsx (USD, không loại trừ income, orphaned).
9. **Ngôn ngữ hiển thị lẫn lộn Việt/Anh** xuyên suốt ứng dụng, kể cả trong cùng 1 màn hình (VD: Money.tsx tiếng Việt nhưng toast từ context lại tiếng Anh).
10. **Đơn vị tiền tệ không nhất quán**: VNĐ (Money.tsx) vs USD (form thêm chi tiêu, Monthly Stats) cho cùng field `Expense.amount`.
11. **Danh mục chi tiêu không đồng bộ** giữa form nhập liệu (8 danh mục) và bảng màu hiển thị thống kê (9 danh mục, gồm cả những danh mục không thể tạo được từ form).
12. **Lỗi tính hạn hoá đơn** không xử lý việc lật tháng (`dueDay` nhỏ hơn ngày hiện tại trong tháng bị hiển thị nhầm "Quá hạn").
13. **Toast dùng chung 1 timer** — có thể để lại toast cũ không tự ẩn khi bắn nhiều toast liên tiếp.
14. **"Our Story" là dữ liệu tĩnh**, tách biệt hoàn toàn khỏi `state.memories` thực tế — sửa/xoá memory không ảnh hưởng timeline này.
15. **3 nguồn dữ liệu độc lập cho cùng 1 ngày kỷ niệm** (`RELATIONSHIP_START` trong `data.ts`, chuỗi hiển thị hardcode ở `Us.tsx`, chuỗi hardcode ở `Settings.tsx`) — sửa 1 nơi không tự động cập nhật 2 nơi còn lại.
16. **Thiếu xác nhận trước khi xoá** ở một số nơi (Future Us goal, Money transaction, Trip) trong khi các nơi khác có xác nhận (Calendar event, Love Letter) — không nhất quán về UX pattern.
17. **Modal/bottom sheet triển khai không đồng nhất** — có nơi dùng chung `BottomSheet.tsx`, có nơi tự viết overlay riêng (Home's mood picker & add-countdown, Money's add-bill).
18. **App shell không responsive thật** — luôn hiển thị trong khung iPhone cố định 393×852px giữa màn hình, chưa đáp ứng yêu cầu desktop layout của brief gốc.
19. **Modal "+" thiếu tuỳ chọn "Place"** so với brief gốc, và không có đường quay lại menu 6 lựa chọn sau khi đã chọn 1 loại (chỉ có thể đóng hẳn modal).
20. **Thông báo không deep-link** tới nội dung liên quan, chỉ đổi trạng thái đã đọc.

---

## 8. Định hướng phát triển tương lai (ngoài phạm vi bản hiện tại)
- Xây dựng backend/API + CSDL thật để đồng bộ dữ liệu nghiệp vụ, thay thế `useState(initialState)` bằng nguồn dữ liệu bền vững (xem SDS Chương 11 cho đề xuất mapping).
- Hoàn thiện luồng xác thực thật (mã hoá mật khẩu, gate quyền truy cập bằng `authed` phản ánh đúng trạng thái đăng nhập, đăng xuất thật).
- Quyết định giữ/loại bỏ và hoàn thiện các module orphaned (Couple Trivia, Mood Tracker, Bucket List, Love Languages) hoặc gỡ bỏ khỏi mã nguồn.
- Chuẩn hoá ngôn ngữ và đơn vị tiền tệ toàn ứng dụng.
- Làm responsive thật theo đúng yêu cầu brief gốc (mobile 390px / desktop 1440px, sidebar trái trên desktop).
- Hợp nhất hai hệ thống điều hướng (global stack và Us.tsx local sub-nav) thành một kiến trúc điều hướng duy nhất.

---

## Phụ lục A — Tổng quan dữ liệu mẫu (seed data, `data.ts`)

| Thực thể | Số bản ghi mẫu | Ghi chú |
|---|---|---|
| Posts | 4 | Ngày mẫu 2026-08-18 → 2026-08-25 |
| Memories | 6 | Từ 2023 đến 2026 |
| Expenses | 6 | Không có bản ghi `type:'income'` mẫu |
| Savings Goals | 4 | Japan Trip, Anniversary Trip, New Camera, Emergency Fund |
| Bills | 7 | Tiền nhà, Điện, Nước, Internet, Netflix, Spotify, Bảo hiểm xe |
| Love Notes | 4 | |
| Secret Notes | 2 | 1 khoá đến 25/12/2026, 1 mở vào 21/08/2026 |
| Events | 5 | |
| Goals (Future Us) | 7 | 3 đã hoàn thành |
| Notifications | 5 | |
| Places | 3 | Vietnam, Japan, Beach |
| Trips | 1 | Japan Winter Trip |
| Capsules | 2 | |
| Countdowns | 3 | |
| Playlist | 4 bài | |
| Mood History | 7 ngày | |
| Wishes | 3 | |
| Bucket List | 12 | **Orphaned — không có UI hiển thị** |
| Love Letters | 1 | |
| Gratitude | 3 | |
| Fav Places (4 danh mục) | 4+4+2+3 | |
| Love Languages | 0 (rỗng `{}`) | **Orphaned** |
| Hugs, Date Requests, Date Ideas | 0 (mảng rỗng) | Sinh ra trong quá trình dùng |
