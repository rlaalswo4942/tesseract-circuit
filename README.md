# TESSERACT CIRCUIT

**플레이: https://rlaalswo4942.github.io/tesseract-circuit/**

반투명 에너지 큐브의 **여섯 면이 하나로 이어진 회로 미로**를 따라 출발점에서 도착점까지 전기를 연결하는 3D 웹 퍼즐 게임입니다. Three.js + Vite, 서버·로그인·DB 없이 정적 호스팅(GitHub Pages)으로 동작합니다.

## 실행

```bash
npm ci            # 의존성 설치 (package-lock.json 기준)
npm run dev       # 개발 서버 http://localhost:5173
npm test          # 단위 테스트 (Vitest, 렌더러 없이 게임 로직 검증)
npm run build     # dist/ 정적 빌드
npm run e2e       # 빌드본을 설치된 Chrome으로 E2E + 성능 측정 (Windows 기본 경로, CHROME=경로 로 변경)
```

개발자 성능 패널: URL에 `?debug` 를 붙이거나 게임 중 `` ` `` 키. FPS·p95·드로우콜·삼각형·스테이지·프리셋·경로 길이와 레이어(shell/edges/core/particles/circuit/path) 표시 토글을 제공합니다.

## 조작

| 입력 | 동작 |
|---|---|
| 드래그 / 한 손가락 드래그 | 큐브 회전 |
| 클릭 / 탭 | 현재 끝점과 연결된 회로로 확장 |
| 이미 지난 경로 클릭 | 그 칸 포함 이후 경로 회수 (출발점 클릭 = 출발점만 남김) |
| 휠 / 두 손가락 | 확대·축소 |

포인터 이동이 7px(`CONFIG.dragThresholdPx`)을 넘거나 두 번째 손가락이 닿으면 회전으로 간주해 선택하지 않습니다.

## 구조

```text
src/
  config/      gameConfig.js (시각·입력 상수) · difficultyConfig.js (난이도 프리셋)
  data/        stages.js (스테이지 = 프리셋 + 시드, 고정형 대체 미로)
  maze/        CubeTopology (6면 좌표·경계 연결) · MazeGraph · MazeGenerator · MazeValidator · DifficultyEvaluator
  core/        PathManager (확장/회수 규칙) · StageManager · GameState (localStorage) · GameController
  rendering/   SceneManager · CubeRenderer · CircuitRenderer · EnergyEffects · QualityManager
  input/       InputController (클릭/드래그 구분, 레이캐스트)
  ui/          UIController · PerformancePanel
tests/         topology · maze · path · stages · state (Vitest) + e2e/e2e.mjs (Chrome)
```

- **게임 상태와 렌더링 분리**: `maze/`, `core/PathManager`는 DOM·Three.js를 전혀 import하지 않습니다. 렌더러는 `path` 배열을 받아 그릴 뿐 규칙을 판정하지 않습니다.
- **6면 연결**: 셀 중심을 큐브 표면의 3D 좌표(셀 단위)로 두고, 이동 방향 `d`로 면을 벗어나면 이웃 = `p + d/2 − n/2`(법선이 `d`인 면). 공유 모서리 경유점 `p + d/2`는 양쪽 면에서 같은 값이 나오므로 대응 테이블 없이 방향 반전 모서리까지 정확합니다(테스트로 양방향·경유점 일치 검증).
- **모서리 통과 회로**: 셀 중심 → 모서리 경유점 → 다음 면 셀 중심, 각 구간은 자기 면 위에 놓인 리본이라 큐브 내부를 관통하지 않습니다.
- **에너지 몸체**: 모든 한 칸 이동의 길이가 정확히 1이므로 경로 k번째 칸의 호 길이 = k. 셰이더가 `uLen` 이후 픽셀을 버리므로 확장/회수 애니메이션은 uniform 하나만 움직입니다. 경로가 바뀌면 달라진 칸 이후 버퍼만 부분 업로드합니다.
- **클릭 판정**: 큐브 외벽 박스(FrontSide)에 레이캐스트 → 가장 가까운 앞면만 맞음 → 로컬 좌표를 셀로 환산. 뒷면 회로가 앞면을 통과해 선택되지 않습니다(E2E로 확인).

## 미로 생성과 난이도

1. 시드 난수로 큐브 전체 표면의 DFS 신장트리 생성
2. 임의 출발점에서 트리 경로가 조건(길이 범위, 정확한 필수 면 수, 면 전환·회전 수, 면 재방문 상한)을 만족하는 도착점 선택
3. 정답 경로에 매달린 가지(오답)를 `targetBranches`개, `branchDepth` 깊이까지 남김
4. (고레벨) 회로 셀 사이에 루프 간선 추가 — 추가할 때마다 전체 검증을 통과해야 유지
5. 검증: 최단 경로 길이, 필수 면 각각을 제거하면 출발–도착이 끊기는지(우회로 차단), 고립 회로 없음, 양방향 인접, 면 전환/회전/가지/막다른 길 수
6. 최대 300회 시도 후 실패하면 원인별 횟수를 담아 예외 → `StageManager`가 고정형 미로로 대체

| Stage | 그리드 | 최단 경로 | 필수 면 | 면 전환 | 회전 | 가지 | 막다른 길 | 루프 | 회로 칸 | 난이도 점수 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 Initiation | 4×4 | 9 | 2 | 1 | 6 | 2 | 2 | 0 | 14 | 30 |
| 2 Connection | 4×4 | 12 | 3 | 2 | 6 | 5 | 5 | 0 | 25 | 50.5 |
| 3 Cross Circuit | 5×5 | 22 | 4 | 3 | 12 | 10 | 10 | 0 | 45 | 88 |
| 4 Network | 5×5 | 29 | 5 | 5 | 19 | 13 | 11 | 1 | 59 | 121 |
| 5 Full Circuit | 6×6 | 34 | 6 | 5 | 22 | 19 | 15 | 2 | 90 | 150.5 |
| 6 Core Restoration | 6×6 | 42 | 6 | 8 | 23 | 26 | 20 | 3 | 216 | 198.5 |

(`npx vitest run tests/stages.test.js --silent=false` 로 출력되는 실제 값)

### 스테이지 추가

`src/data/stages.js`에 한 줄 추가하면 됩니다. 엔진 코드는 수정하지 않습니다.

```js
{ name: 'Overload', difficulty: 'coreRestoration', seed: 77 },
```

새 난이도가 필요하면 `src/config/difficultyConfig.js`에 프리셋을 추가합니다. `npm test`가 모든 스테이지의 생성 성공·조건 충족·실제 클리어 가능·난이도 점수 상승을 검사하므로, 실패하면 시드나 값을 조정하세요.

## 그래픽 품질

| 프리셋 | 해상도 상한 | Bloom | 입자 | 대기 애니메이션 |
|---|---|---|---|---|
| Low | DPR 0.8 | ✕ | ✕ | ✕ (변화 없으면 렌더링 생략) |
| Medium | DPR 1.5 | ✕ | ✕ | ○ |
| High | DPR 2 | ○ (three 내장 UnrealBloomPass) | ○ | ○ |

자동 모드: 2초 창의 평균 FPS가 기준(High 45 / Medium 28) 미만인 창이 2번 연속이면 한 단계 낮춤, 변경 후 5초 대기, 자동 상향은 하지 않아 오르내림이 없습니다. 품질은 게임 규칙·미로 데이터에 영향을 주지 않습니다.

## 배포 (GitHub Pages)

`vite.config.js`의 `base`가 `./`(상대 경로)라 `https://USER.github.io/` 와 `https://USER.github.io/REPO/` 양쪽에서 그대로 동작합니다. 절대 경로가 필요하면 `BASE_PATH=/repo/ npm run build`.

1. GitHub 저장소에 push (`main` 브랜치)
2. Settings → Pages → Source: **GitHub Actions**
3. `.github/workflows/deploy.yml`이 `npm ci → npm test → npm run build → Pages 배포`를 수행. 테스트나 빌드가 실패하면 배포 단계로 가지 않습니다.

## 검증 결과 / 미검증 항목

[PERFORMANCE.md](PERFORMANCE.md) 참고.
