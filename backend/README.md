# PALVIN Backend — Supabase

Ứng dụng dùng **Supabase** làm backend: Postgres (database), Auth (đăng ký/đăng nhập theo username + xác nhận email). Không có server tự viết (Node/Express...) — frontend gọi thẳng Supabase qua `@supabase/supabase-js`.

**Nguyên tắc:** schema chỉ tạo tới đâu khi code thực sự dùng tới đó — không tạo trước bảng cho tính năng chưa wire vào Supabase. Hiện tại mới có đúng phần **đăng ký/đăng nhập/liên kết** (`0001_init.sql`). Khi làm tới tính năng khác (Feed, Memories, Money...) sẽ thêm file `0002_xxx.sql`, `0003_xxx.sql`... tương ứng, không sửa lại các file đã chạy.

## 1. Tạo project Supabase (bạn tự làm, ~2 phút)

1. Vào https://supabase.com → đăng ký/đăng nhập (free, không cần thẻ).
2. **New project** → đặt tên (VD `palvin`) → chọn vùng gần nhất (Singapore) → đặt mật khẩu database → Create.
3. Chờ ~1-2 phút để project khởi tạo xong.

## 2. Áp dụng schema

1. **(Chỉ khi project đã có dữ liệu test cũ / build lại từ đầu)** Vào **SQL Editor** → dán nội dung [`supabase/migrations/0000_reset.sql`](supabase/migrations/0000_reset.sql) → Run. File này xoá sạch bảng/hàm của `0001_init.sql`, **giữ nguyên `auth.users`** (không mất tài khoản đã tạo). Bỏ qua bước này nếu là project hoàn toàn mới.
2. Vào **SQL Editor** → **New query** → dán toàn bộ nội dung [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
3. Kiểm tra ở tab **Table Editor**: phải thấy các bảng `couples`, `profiles`, `partner_invites` (chỉ 3 bảng này ở giai đoạn hiện tại — các bảng khác sẽ xuất hiện dần khi có migration mới cho từng tính năng).

> Mỗi khi thêm tính năng mới cần bảng riêng, tạo file `0002_xxx.sql`, `0003_xxx.sql`... trong `supabase/migrations/` — không sửa lại các file đã chạy.

## 3. Lấy API keys

Project Settings (icon bánh răng) → **API**:
- `Project URL` → dán vào `VITE_SUPABASE_URL`
- `anon public` key → dán vào `VITE_SUPABASE_ANON_KEY`

## 4. Cấu hình frontend

```bash
cd frontend
cp .env.example .env.local
# mở .env.local, dán 2 giá trị lấy ở bước 3
npm install   # nếu chưa cài @supabase/supabase-js
npm run dev
```

Client đã được chuẩn bị sẵn tại [`frontend/src/lib/supabaseClient.ts`](../frontend/src/lib/supabaseClient.ts) — import `supabase` từ đó ở bất kỳ đâu cần gọi API.

## 5. Cấu hình Auth

1. **Authentication → Providers → Email** → bật "Enable Email provider".
2. **Authentication → Settings** → giữ **Confirm email = bật** (bắt buộc xác nhận qua email trước khi đăng nhập được).
3. **Authentication → URL Configuration** → đặt **Site URL** = `http://localhost:8443` (port dev mặc định của app, xem `vite.config.ts`) và thêm luôn `http://localhost:8443` vào **Redirect URLs** nếu có ô riêng. **Bắt buộc phải đúng port này** — nếu để sai (VD giá trị mặc định `localhost:3000` của Supabase), link xác nhận trong email sẽ dẫn tới trang không tồn tại thay vì quay lại app.
4. **Giữ "Enable Custom SMTP" ở trạng thái tắt** — dùng email mặc định của Supabase là đủ cho app 2 người dùng này (gửi được tới bất kỳ email nào, chỉ giới hạn số lượng gửi/giờ ở mức thấp nhưng đủ dùng). Không cần Resend/SendGrid hay domain riêng.
5. Không cần sửa Email Templates gì thêm — dùng nguyên mẫu mặc định (email chứa nút "Confirm email address").

## 6. Luồng đăng ký / đăng nhập / liên kết

- **Đăng ký**: cần Email thật (để nhận link xác nhận) + Tên đăng nhập (dùng làm username, ví dụ "Alvin"/"Paoi") + mật khẩu. Đăng ký xong app hiện màn "Kiểm tra email" → bấm link trong email → app tự đăng nhập ngay (không cần quay lại nhập lại tài khoản).
- **Đăng nhập**: chỉ cần Tên đăng nhập + mật khẩu (không cần nhớ email) — app tự tra email tương ứng qua hàm `email_for_username`.
- **Liên kết với nửa kia**: vào **Settings** trong app, nhập tên đăng nhập người muốn mời → Gửi lời mời. Người kia đăng nhập sẽ thấy chấm đỏ ở chuông thông báo, vào **Notifications** để Đồng ý/Từ chối. Chỉ sau khi đồng ý, tab "Us" mới mở khoá cho cả hai.

## 7. Mô hình dữ liệu (hiện tại)

- `couples`: 1 hàng = 1 cặp đôi (workspace dữ liệu dùng chung). Hiện chỉ có `id`/`created_at` — các cột khác (tên cặp đôi, ngày kỷ niệm, favorites, dark mode...) sẽ thêm khi làm tới màn hình dùng chúng.
- `profiles`: 1 hàng = 1 tài khoản Supabase Auth, có `couple_id` trỏ về `couples`. `display_name` vừa là tên hiển thị vừa là username đăng nhập (duy nhất, không phân biệt hoa/thường). **Không tham chiếu tên cụ thể nào** — hoạt động với bất kỳ username nào.
- `partner_invites`: hàng đợi lời mời liên kết (request/accept) — thay cho việc dán mã liên kết trực tiếp.

Các bảng cho Feed/Memories/Money/Love Notes/... **chưa tồn tại** — sẽ tạo trong migration riêng khi bắt đầu chuyển từng màn hình đó sang gọi Supabase thật. Khi thiết kế, mọi cột "ai làm việc này" sẽ luôn là khoá ngoại `uuid references profiles(id)`, không bao giờ check cứng theo tên.

## 8. Việc còn lại

Auth (đăng ký/đăng nhập/liên kết) đã gọi Supabase thật. **Toàn bộ dữ liệu nghiệp vụ** (posts, memories, expenses, bills...) **vẫn đang chạy bằng state cục bộ trong `context.tsx`**, chưa có bảng nào ở Supabase. Việc chuyển từng phần sang gọi Supabase thật (kèm tạo migration cho đúng phần đó) là các bước riêng tiếp theo, làm dần theo module khi bạn sẵn sàng.
