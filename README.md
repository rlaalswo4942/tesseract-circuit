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

1. 시드 난수로 큐브 전체 표면의 신장트리 생성 — "growing tree" 방식으로 매 단계 `mix` 확률만큼 Prim식(무작위 칸에서 확장, 덤불형·짧은 막다른 길)을, 나머지는 DFS식(긴 굽은 통로)을 골라 섞음. `mix`가 클수록 통로가 갑자기 덤불로 끊기는 변칙적인 구조가 됩니다(10×10 기준 막다른 칸 비율 mix 0 → 10%, 0.6 → 26%)
2. 임의 출발점에서 트리 경로가 조건(길이 범위, 정확한 필수 면 수, 면 전환·회전 수, 면 재방문 상한)을 만족하는 도착점 선택
3. 정답 경로에 매달린 가지(오답)를 `targetBranches`개, `branchDepth` 깊이까지 남김
4. (고레벨) 회로 셀 사이에 루프 간선 추가 — 추가할 때마다 전체 검증을 통과해야 유지
5. 검증: 최단 경로 길이, 필수 면 각각을 제거하면 출발–도착이 끊기는지(우회로 차단), 고립 회로 없음, 양방향 인접, 면 전환/회전/가지/막다른 길 수
6. 시작 전에 `면 전환 ≤ 필수 면 − 1 + 재방문` (면 전환은 새 면 진입 또는 재진입뿐)을 검사해 불가능한 설정은 즉시 거부
7. 최대 300회 시도 후 실패하면 원인별 횟수를 담아 예외 → `StageManager`가 고정형 미로로 대체

| Stage | 그리드 | 변칙성 mix | 최단 경로 | 필수 면 | 면 전환 | 가지 | 막다른 길 | 루프 | 재방문 | 회로 칸 | 난이도 점수 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Initiation | 5×5 | 0 | 11 | 2 | 1 | 3 | 3 | 0 | 0 | 18 | 35 |
| 2 Connection | 5×5 | 0.1 | 18 | 3 | 2 | 5 | 5 | 0 | 0 | 30 | 59.5 |
| 3 Relay | 6×6 | 0.15 | 20 | 3 | 2 | 8 | 8 | 0 | 0 | 39 | 74 |
| 4 Cross Circuit | 6×6 | 0.2 | 26 | 4 | 3 | 14 | 12 | 1 | 0 | 57 | 105.5 |
| 5 Junction | 7×7 | 0.25 | 32 | 4 | 4 | 14 | 12 | 1 | 1 | 62 | 121 |
| 6 Network | 7×7 | 0.3 | 45 | 5 | 4 | 20 | 18 | 1 | 0 | 88 | 161.5 |
| 7 Feedback Loop | 8×8 | 0.3 | 32 | 5 | 5 | 31 | 27 | 2 | 1 | 113 | 186 |
| 8 Parallel | 8×8 | 0.35 | 56 | 6 | 6 | 31 | 27 | 2 | 1 | 144 | 224.5 |
| 9 Full Circuit | 9×9 | 0.35 | 66 | 6 | 6 | 32 | 28 | 2 | 1 | 140 | 242 |
| 10 Capacitor | 9×9 | 0.4 | 47 | 6 | 7 | 49 | 43 | 3 | 2 | 191 | 282.5 |
| 11 Inductor | 9×9 | 0.4 | 54 | 6 | 6 | 56 | 50 | 3 | 1 | 195 | 308 |
| 12 Resonance | 10×10 | 0.45 | 60 | 6 | 7 | 59 | 53 | 3 | 2 | 220 | 330.5 |
| 13 Overload | 10×10 | 0.45 | 75 | 6 | 7 | 65 | 57 | 4 | 2 | 255 | 373 |
| 14 Short Circuit | 10×10 | 0.5 | 75 | 6 | 8 | 76 | 68 | 4 | 3 | 284 | 416 |
| 15 Phase Shift | 11×11 | 0.5 | 64 | 6 | 8 | 88 | 80 | 4 | 3 | 310 | 441.5 |
| 16 Interference | 11×11 | 0.5 | 95 | 6 | 9 | 96 | 86 | 5 | 4 | 404 | 520.5 |
| 17 Flux | 11×11 | 0.55 | 73 | 6 | 9 | 113 | 103 | 5 | 4 | 410 | 550.5 |
| 18 Singularity | 12×12 | 0.55 | 86 | 6 | 10 | 135 | 123 | 6 | 5 | 507 | 646 |
| 19 Tesseract | 12×12 | 0.6 | 80 | 6 | 10 | 163 | 151 | 6 | 5 | 614 | 738.5 |
| 20 Core Restoration | 12×12 | 0.6 | 97 | 6 | 10 | 210 | 196 | 7 | 5 | 792 | 929.5 |

(`npx vitest run tests/stages.test.js --silent=false` 로 출력되는 실제 값)

### 스테이지 추가

`src/data/stages.js`에 한 줄 추가하면 됩니다. 엔진 코드는 수정하지 않습니다.

```js
{ name: 'Overdrive', difficulty: 20, seed: 4242 },
```

새 난이도가 필요하면 `src/config/difficultyConfig.js`의 `ROWS` 표에 한 줄(N, 경로 길이, 필수 면, 면 전환, 가지, 깊이, 막다른 길, 회전, 재방문, 루프, mix)을 추가합니다. 1~20단계는 단계마다 시드 40개를 생성해 난이도 점수 중앙값에 가장 가까운 미로를 고정했습니다. `npm test`가 모든 스테이지의 생성 성공·조건 충족·실제 클리어 가능·난이도 점수 상승을 검사하므로, 실패하면 시드나 값을 조정하세요.

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
