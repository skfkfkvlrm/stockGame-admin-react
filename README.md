# 👩‍🏫 StockGame Admin React (Teacher & Admin Portal)

Vite + React 기반으로 구축된 **교사 및 관리자 전용 주식 모의투자 관제 포털 웹 애플리케이션**입니다.  
학생 포털([`stockGame_react`](https://github.com/skfkfkvlrm/stockGame_react))과 보안 및 인가 권한이 철저히 물리적으로 분리되어 있으며, 포트 `5174`에서 독립 구동됩니다.

[![GitHub Repo](https://img.shields.io/badge/GitHub-stockGame__admin__react-181717?logo=github)](https://github.com/skfkfkvlrm/stockGame_admin_react)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646C9A?logo=vite)](https://vitejs.dev/)
[![Port](https://img.shields.io/badge/Port-5174-orange)]()

---

## 📌 1. 포털 분리 및 보안 아키텍처

학생들이 관리자 화면에 접근하거나 조작하는 보안 사고를 원천 방지하기 위해 프론트엔드 레포지토리와 구동 포트를 완전히 분리하였습니다.

| 구분 | 학생 포털 (`stockGame_react`) | 관리자 포털 (`stockGame_admin_react`) |
|:---|:---|:---|
| **접속 대상** | 참여 학생 (학번 기반 로그인) | 담당 교사 및 시스템 관리자 (`ROLE_ADMIN`) |
| **기본 포트** | `http://localhost:5173` | `http://localhost:5174` |
| **회원가입 기능** | 일반 학생 회원가입 허용 (`/register`) | **회원가입 경로 전면 제거** (보안 백도어 원천 차단) |
| **인가 가드** | 학생 세션 인증 가드 | `ROLE_ADMIN` 관리자 권한 필수 검증 (`AdminRouteGuard`) |

---

## ✨ 2. 주요 관리 관제 기능 (`/admin`)

### ① 학생 관리 (Student Management)
- 전체 참여 학생 목록, 학년/반/번호, 총 보유 포인트 및 총순자산 실시간 조회.
- **포인트 즉시 지급 / 차감 모달**: 변동 사유(과제 완료, 벌점 등)와 함께 포인트 원자적 조정 및 원장 기록.
- **학생 상세 포트폴리오 조회 모달**: 학생별 보유 현금, 종목별 주식 보유량, 매입가, 평가 손익 현황 정밀 검사.

### ② 주식 종목 관리 (Stock & Market Management)
- **시장 개장 / 휴장 원터치 토글**: 시장 상태 변경 시 학생 화면에 즉시 실시간 동기화.
- **신규 종목 상장 (IPO)**: 종목명, 초기 공모가, 공모 발행 수량 입력 후 원터치 상장.
- **발행가 / 발행잔량 수정**: 발행 잔량 및 단가 실시간 교정 (음수 입력 원천 차단 가드 적용).
- **종목 상장폐지 (Delisting & Liquidation)**: 종목 퇴출 및 주식 청산.

### ③ 쿠폰 상품 관리 (Coupon Management)
- 학급 보상용 쿠폰(매점 이용권, 면제권 등) 등록 및 목록 조회.
- 쿠폰 판매 활성화/비활성화 상태 토글 및 일련번호(Serial Number) 관리.

---

## 🚀 3. 기술 스택

| 분류 | 기술 |
|---|---|
| **Core** | React 19, Vite 6 |
| **Routing** | React Router DOM v7 (Admin Protected Route) |
| **상태 관리** | Zustand (`useAuthStore`, `useMarketStore`) |
| **HTTP Client** | Axios (JWT 인터셉터 및 401 예외 처리) |
| **Real-time** | `@stomp/stompjs` + `sockjs-client` |
| **Charts** | ApexCharts (`react-apexcharts`) |
| **Icons & Toast** | `lucide-react`, `react-toastify` |

---

## 📁 4. 프로젝트 구조

```text
src/
├── api/                         # Axios 설정 및 관리자 토큰 인터셉터
├── features/
│   ├── admin/                   # 관리자 전용 기능 핵심
│   │   ├── components/          # AdminDashboard.jsx (학생·주식·쿠폰 탭)
│   │   └── store/               # useMarketStore.js (시장 온/오프 상태)
│   ├── auth/                    # 관리자 전용 로그인 (회원가입 기능 제거)
│   ├── core/                    # Admin Layout, Navbar, Guard
│   ├── stocks/                  # 관리자용 종목 편집 폼
│   └── points/                  # 포인트 지급/차감 모달
└── App.jsx                      # Protected Route (/admin 전용 가드)
```

---

## 🔒 5. 보안 수칙 준수 (`common_guardrails.md`)

- **음수 입력 차단**: 포인트 지급/차감 및 발행잔량 입력 필드에서 `-` 및 `e` 키 입력 방지 (`onKeyDown`).
- **권한 격리**: 일반 학생 계정 토큰으로 접근 시 즉시 세션 파기 및 로그인 화면으로 리다이렉트.
- **React Hook 순서 보장**: 모든 상태(`activeModalTab`, `isLoading` 등)는 컴포넌트 최상단에 선언하여 렌더링 무결성 유지.

---

## 📦 6. 실행 방법

```bash
# 의존성 패키지 설치
npm install

# 관리자 개발 서버 구동 (포트 5174 고정)
npm run dev

# 빌드 무결성 검증 (Hermes Gate)
npm run build
```

---

## 🔗 7. 관련 레포지토리
- 👨‍🎓 학생 포털 프론트엔드: [stockGame_react](https://github.com/skfkfkvlrm/stockGame_react)
- 🚀 차세대 Supabase 백엔드: [stockGame_supabase](https://github.com/skfkfkvlrm/stockGame_supabase)
- 🏛️ 레거시 보존 백엔드 (v1): [stockGame_mechanism](https://github.com/skfkfkvlrm/stockGame_mechanism)
- 📚 마스터 기획서 및 감사 보고서: [skfkfkvlrm-json-lib](https://github.com/skfkfkvlrm/skfkfkvlrm-json-lib)
