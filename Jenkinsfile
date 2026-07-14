pipeline {
    agent any

    triggers {
        gitlab(
            triggerOnPush: true,
            triggerOnMergeRequest: false,
            branchFilterType: 'NameBasedFilter',
            includeBranchesSpec: 'master'
        )
    }

    parameters {
        gitParameter(
            name: 'BRANCH_NAME',
            type: 'PT_BRANCH',
            defaultValue: 'master',
            description: '빌드할 브랜치 선택',
            sortMode: 'DESCENDING_SMART',
            selectedValue: 'DEFAULT'
        )
        extendedChoice(
            name: 'BUILD_TARGETS',
            type: 'PT_CHECKBOX',
            value: 'host,manager,fca,aoe,ipron,ivr,stt,insight,taskboard,campaign,vel',
            defaultValue: 'host,manager,fca,aoe,ipron,ivr,stt,insight,taskboard,campaign,vel',
            visibleItemCount: 10,
            description: '빌드할 앱 선택 (host 포함 시 remote 앱들이 host/remotes/로 자동 복사됨)',
            multiSelectDelimiter: ','
        )
        booleanParam(
            name: 'SKIP_CACHE',
            defaultValue: false,
            description: 'Nx 캐시 무시하고 강제 재빌드 (캐시 결과가 의심스러울 때만 체크)'
        )
    }

    environment {
        // Git
        GIT_REPO_URL = '100.100.103.5/BT-ADMIN/BT-ADMIN-FE.git'
        GIT_CRED     = 'glpat-GDaTiVP7sRV1fXWorgbK'

        // Jenkins
        JENKINS_WORK_PATH = '/var/lib/jenkins/workspace/bt-admin-fe'

        // 빌드 정보
        TODAY_STRING = sh(script: 'date "+%Y%m%d%H%M"', returnStdout: true).trim()
    }

    options {
        skipDefaultCheckout()  // 자동 Checkout SCM 비활성화 (스테이지 진입 시 master 암묵 체크아웃 방지)
        disableConcurrentBuilds(abortPrevious: true)  // 새 빌드 트리거 시 진행 중 빌드 즉시 중단 (워크스페이스 공유 충돌·산출물 경합 방지)
    }

    stages {

        // =====================================================================
        // 1. Checkout
        // =====================================================================
        stage('Checkout') {
            steps {
                script {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "${params.BRANCH_NAME}"]],
                        userRemoteConfigs: [[
                            url: "http://${GIT_REPO_URL}",
                            credentialsId: "${GIT_CRED}"
                        ]]
                    ])

                    env.TAG = params.BRANCH_NAME
                        .replaceAll('^origin/', '')
                        .replaceAll('/', '-')

                    env.GIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.GIT_AUTHOR = sh(
                        script: "git log -1 --pretty=format:'%an <%ae>'",
                        returnStdout: true
                    ).trim()

                    env.GIT_AUTHOR_EMAIL = sh(
                        script: "git log -1 --pretty=format:'%ae'",
                        returnStdout: true
                    ).trim()

                    env.GIT_SUBJECT = sh(
                        script: "git log -1 --pretty=format:'%s'",
                        returnStdout: true
                    ).trim()

                    env.PKG_NAME = "btadmin-fe-${env.TAG}-${TODAY_STRING}.tgz"
                    echo "버전 정보: ${env.TAG}, 커밋: ${env.GIT_SHORT}, 패키지: ${env.PKG_NAME}"
                }
            }
        }

        // =====================================================================
        // 2. Node Build & Package
        // =====================================================================
        stage('Node Build & Package') {
            agent {
                docker {
                    image 'node:22-slim'
                    args '-v ${JENKINS_WORK_PATH}:${JENKINS_WORK_PATH} -u root'
                    reuseNode true  // 부모 노드 워크스페이스 재사용 (@2 분리 방지 → Checkout 결과 그대로 사용)
                }
            }
            steps {
                script {
                    // pnpm 설치
                    sh 'corepack enable && corepack prepare pnpm@10.29.2 --activate'

                    // dist 누적 방지 (이전 빌드 잔여물이 다음 tgz에 섞이는 문제 차단)
                    sh 'rm -rf dist'

                    // Webpack 캐시만 정리 (Nx 캐시는 유지 → 변경 없는 모듈은 캐시 hit으로 빠른 빌드)
                    sh 'rm -rf node_modules/.cache'

                    // SKIP_CACHE 옵션 선택 시 Nx 캐시도 함께 정리
                    if (params.SKIP_CACHE) {
                        echo "[INFO] SKIP_CACHE=true → Nx 캐시 전체 무효화"
                        sh 'rm -rf .nx node_modules/.nx'
                    }

                    // 의존성 설치 (node_modules 있으면 빠르게 통과)
                    sh 'pnpm install --frozen-lockfile'

                    // 빌드 대상 결정
                    def targets = params.BUILD_TARGETS.split(',').collect { it.trim() }
                    def projects = targets.join(',')

                    echo "=========================================="
                    echo " 빌드 대상: ${projects}"
                    echo "=========================================="

                    // Nx 빌드 (순차 빌드로 메모리 이슈 방지)
                    def cacheFlag = params.SKIP_CACHE ? '--skip-nx-cache' : ''
                    sh "npx nx run-many --target=build --projects=${projects} ${cacheFlag}"

                    // host 포함 시: remote 앱들을 host/remotes/로 복사
                    if (targets.contains('host')) {
                        def remotes = targets.findAll { it != 'host' }
                        if (remotes.size() > 0) {
                            sh 'mkdir -p dist/apps/host/remotes'
                            remotes.each { remote ->
                                if (fileExists("dist/apps/${remote}")) {
                                    sh "cp -r dist/apps/${remote} dist/apps/host/remotes/${remote}"
                                    echo "[OK] ${remote} → dist/apps/host/remotes/${remote}"
                                } else {
                                    echo "[WARN] dist/apps/${remote} 빌드 결과를 찾을 수 없습니다"
                                }
                            }
                        }
                    }

                    // 패키징: dist/apps/host/ → btadmin-fe-static.tgz
                    // BE에서 압축 해제 후 BT-ADMIN-BFF/src/main/resources/static/ 에 배치

                    // 빌드 산출물 정합성 검증 (Module Federation 핵심 파일 존재 확인)
                    // 캐시 hit으로 dist가 빈 채 통과되는 사고 차단 — latest 갱신 전 마지막 게이트
                    ['dist/apps/host/index.html', 'dist/apps/host/mf-manifest.json'].each { f ->
                        if (!fileExists(f)) {
                            error("[빌드 실패] ${f} 없음 — 빌드 비정상, latest 갱신 차단")
                        }
                    }
                    ['main.*.js', 'runtime.*.js'].each { glob ->
                        def found = sh(script: "ls dist/apps/host/${glob} 2>/dev/null | head -1", returnStdout: true).trim()
                        if (!found) {
                            error("[빌드 실패] dist/apps/host/${glob} 없음 — 빌드 비정상, latest 갱신 차단")
                        }
                    }
                    targets.findAll { it != 'host' }.each { remote ->
                        def remoteEntry = "dist/apps/host/remotes/${remote}/remoteEntry.js"
                        if (!fileExists(remoteEntry)) {
                            error("[빌드 실패] ${remoteEntry} 없음 — ${remote} remote 빌드 비정상")
                        }
                    }
                    echo "[OK] 빌드 산출물 정합성 검증 통과"

                    sh """
                        cd dist/apps/host
                        tar cvfz ${WORKSPACE}/${env.PKG_NAME} .
                    """

                    echo "=========================================="
                    echo " 패키지 생성 완료: ${env.PKG_NAME}"
                    echo "=========================================="
                }
            }
        }

        // =====================================================================
        // 3. 소유권 변경
        // =====================================================================
        // pipeline-level agent(BT_BOT_FE_PKG) 를 그대로 상속받아야 Node Build 가
        // 만든 tgz 와 같은 워크스페이스를 보게 됨. stage-level `agent any` 명시
        // 시 Jenkins 가 새 노드(@2) 를 할당해 워크스페이스 불일치로 tgz 미발견.
        stage('Change Ownership') {
            steps {
                script {
                    sh """
                        sudo chown -R jenkins:jenkins ${WORKSPACE}
                        ls -al ${WORKSPACE}/${env.PKG_NAME}
                    """
                }
            }
        }

        // =====================================================================
        // 4. 아티팩트 저장
        // =====================================================================
        stage('Publish to Shared') {
            steps {
                // 브랜치별 latest 사본을 공유 디렉토리에 덮어쓰기 (BE가 cp로 fetch)
                sh """
                    sudo mkdir -p /var/lib/jenkins/fe-artifacts
                    sudo cp ${env.PKG_NAME} /var/lib/jenkins/fe-artifacts/btadmin-fe-${env.TAG}-latest.tgz
                    sudo chown jenkins:jenkins /var/lib/jenkins/fe-artifacts/btadmin-fe-${env.TAG}-latest.tgz
                    sudo chmod 644 /var/lib/jenkins/fe-artifacts/btadmin-fe-${env.TAG}-latest.tgz
                    ls -la /var/lib/jenkins/fe-artifacts/
                """
            }
        }
    }

    post {
        success {
            echo "BT-ADMIN FE 빌드 성공: ${env.PKG_NAME}"
        }
        failure {
            echo "BT-ADMIN FE 빌드 실패"
        }
        always {
            // 빌드 결과 메일 발송 (성공·실패 모두)
            // 수신자 분기: 성공 → 커밋 작성자만 / 성공 아님(실패·불안정·중단 등) → 담당자 추가
            script {
                env.MAIL_RECIPIENTS = (currentBuild.currentResult == 'SUCCESS')
                    ? "${env.GIT_AUTHOR_EMAIL}"
                    : "${env.GIT_AUTHOR_EMAIL}, bizboxa_gbridgetec_c1_d104@bridgetec.co.kr"

                // 트리거 주체 판정 (수동 실행 / GitLab Push / 기타)
                def manualCause = currentBuild.getBuildCauses('hudson.model.Cause$UserIdCause')
                def gitlabCause = currentBuild.getBuildCauses('com.dabsquared.gitlabjenkins.cause.GitLabWebHookCause')
                if (manualCause) {
                    env.BUILD_TRIGGER = "수동 실행 (${manualCause[0].userName})"
                } else if (gitlabCause) {
                    env.BUILD_TRIGGER = 'GitLab Push'
                } else {
                    env.BUILD_TRIGGER = currentBuild.getBuildCauses()[0]?.shortDescription ?: '알 수 없음'
                }
            }
            emailext(
                to: "${env.MAIL_RECIPIENTS}",
                subject: "[${currentBuild.currentResult}]BT-ADMIN-FE ${env.TAG} (#${env.BUILD_NUMBER})",
                mimeType: 'text/plain',
                attachLog: true,
                body: """\
                    BT-ADMIN FE 빌드 결과 알림

                    - 결과      : ${currentBuild.currentResult}
                    - 트리거    : ${env.BUILD_TRIGGER}
                    - 소요 시간 : ${currentBuild.durationString.replace(' and counting', '')}
                    - 브랜치    : ${env.TAG}
                    - 빌드 대상 : ${params.BUILD_TARGETS}
                    - 캐시 무시 : ${params.SKIP_CACHE}
                    - 커밋      : ${env.GIT_SHORT}
                    - 커밋 메시지 : ${env.GIT_SUBJECT}
                    - 커밋자    : ${env.GIT_AUTHOR}
                    - 패키지    : ${env.PKG_NAME}
                    - 빌드 번호 : #${env.BUILD_NUMBER}
                    - 빌드 로그 : ${env.BUILD_URL}console
                    """.stripIndent()
            )

            // 빌드 실패 시 Change Ownership 스테이지가 스킵되므로 여기서도 한 번 더 복원.
            // docker -u root 로 생성된 파일이 워크스페이스에 남아 cleanWs 권한 에러 나는 문제 방지.
            // 실제 워크스페이스 경로(${WORKSPACE})를 사용 — JENKINS_WORK_PATH 는 실제 워크스페이스와 무관한 잔여 변수.
            sh 'sudo chown -R jenkins:jenkins ${WORKSPACE} || true'
            cleanWs(patterns: [
                [pattern: 'node_modules/**', type: 'EXCLUDE'],
                [pattern: '.git/**', type: 'EXCLUDE'],
                [pattern: '.nx/**', type: 'EXCLUDE']
            ])
        }
    }
}
