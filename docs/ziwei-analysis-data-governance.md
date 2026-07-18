# Zi Wei Analysis — Data Governance

Định hướng cho sprint sau Phase 0. **Không tạo knowledge data mới trong Phase 0.**

## Record bắt buộc

Mỗi data record tương lai phải có:

| Field | Ý nghĩa |
| --- | --- |
| `id` | Định danh ổn định |
| `version` | Phiên bản schema/data |
| `status` | `draft` \| `experimental` \| `approved` \| `deprecated` |
| `schoolProfiles` | Trường phái áp dụng |
| `sourceIds` | Tham chiếu nguồn |
| `confidence` | Độ tin cậy có kiểm soát |
| `effectiveFrom` | Thời điểm có hiệu lực |
| `notes` | Ghi chú audit |

## Rule production

```text
draft không chạy production.
deprecated không chạy production.
```

Module experimental (ví dụ palace-overview V1) **được phép** load record
`experimental` khi chính module đó đang ở trạng thái experimental.
Chỉ `approved` mới là mặc định cho module production ổn định.

Không silent fallback sang hard-coded numbers khi knowledge invalid.

## Cấm

- Dùng comment `ĐỀ XUẤT` làm status duy nhất.
- CSV không version.
- Một bảng điểm sao dùng chung bắt buộc cho cả bốn module (`palace-overview`, `annual-axes`, `major-fortune`, `monthly-flow`).
