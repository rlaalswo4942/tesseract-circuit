# Third-Party Notices

## 배포본에 포함되는 것

### three.js 0.186.1
- 출처: https://github.com/mrdoob/three.js — https://threejs.org/
- 라이선스: MIT — Copyright © 2010-2026 three.js authors
- 사용: WebGL 렌더링, BoxGeometry/EdgesGeometry/IcosahedronGeometry/OctahedronGeometry, Raycaster, ShaderMaterial,
  addons `OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass` (모두 three 패키지에 포함, 같은 MIT 라이선스)
- 전문: `node_modules/three/LICENSE`

> MIT 라이선스는 배포 시 저작권 고지와 라이선스 문구 포함을 요구합니다. 빌드 산출물(`dist/assets/*.js`)에는 three.js 코드가 번들되며, 이 문서가 그 고지입니다.

## 개발/테스트 전용 (배포본에 포함되지 않음)

| 패키지 | 버전 | 라이선스 | 용도 |
|---|---|---|---|
| vite | 8.3.5 | MIT | 개발 서버·빌드 |
| vitest | 5.0.5 | MIT | 단위 테스트 |
| playwright-core | 1.64.1 | Apache-2.0 | 로컬 Chrome E2E·성능 측정 |

## 검토했으나 사용하지 않은 자료

| 자료 | 판단 |
|---|---|
| Khronos glTF Sample Assets — BoxVertexColors (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BoxVertexColors) | 정점 색상만 다른 단순 큐브라 `BoxGeometry` 대비 시각적 이점이 없고, GLB 로딩·경로 오류 위험만 늘어 미채택. 외부 3D 모델 파일 0개. |
| Poly Haven (https://polyhaven.com/) | 환경맵·텍스처는 어두운 배경의 발광 디자인에 불필요하고 용량만 증가해 미사용. |
| pmndrs/postprocessing (https://github.com/pmndrs/postprocessing) | three 내장 `UnrealBloomPass`로 충분해 의존성 추가하지 않음. |

외부 에셋을 사용하지 않으므로 게임 실행 중 외부 서버 요청은 없습니다. 큐브 외형(반투명 외벽, 새겨진 그리드, 림 발광, 코어, 입자, 회로)은 모두 이 프로젝트의 셰이더 코드로 생성합니다.
