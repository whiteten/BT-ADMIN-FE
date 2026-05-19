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
            value: 'host,manager,fca',
            defaultValue: 'host,manager,fca',
            visibleItemCount: 3,
            description: '빌드할 앱 선택 (host 포함 시 remote 앱들이 host/remotes/로 자동 복사됨)',
            multiSelectDelimiter: ','
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

                    env.PROJECT_VERSION = sh(
                        script: "git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo '1.0.0'",
                        returnStdout: true
                    ).trim()

                    env.PKG_NAME = "btadmin-fe-${env.TAG}-${TODAY_STRING}.tgz"
                    echo "버전 정보: ${env.TAG}, 프로젝트 버전: ${env.PROJECT_VERSION}, 패키지: ${env.PKG_NAME}"
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
                }
            }
            steps {
                script {
                    // pnpm 설치
                    sh 'corepack enable && corepack prepare pnpm@10.29.2 --activate'

                    // Nx 빌드 캐시 + Webpack 캐시 초기화 (node_modules는 유지하여 설치 속도 확보)
                    sh 'rm -rf .nx/cache'
                    sh 'rm -rf node_modules/.cache'

                    // 의존성 설치 (node_modules 있으면 빠르게 통과)
                    sh 'pnpm install --frozen-lockfile'

                    // 빌드 대상 결정
                    def targets = params.BUILD_TARGETS.split(',').collect { it.trim() }
                    def projects = targets.join(',')

                    echo "=========================================="
                    echo " 빌드 대상: ${projects}"
                    echo "=========================================="

                    // Nx 빌드 (순차 빌드로 메모리 이슈 방지)
                    sh "npx nx run-many --target=build --projects=${projects} --parallel=1"

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
                    if (!fileExists('dist/apps/host')) {
                        error("dist/apps/host 빌드 결과물이 없습니다!")
                    }

                    sh """
                        cd dist/apps/host
                        tar cvfz ${JENKINS_WORK_PATH}/${env.PKG_NAME} .
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
        stage('Change Ownership') {
            agent any
            steps {
                script {
                    sh """
                        sudo chown -R jenkins:jenkins ${JENKINS_WORK_PATH}
                        if [ -f ${JENKINS_WORK_PATH}/${env.PKG_NAME} ]; then
                            sudo mv ${JENKINS_WORK_PATH}/${env.PKG_NAME} .
                        fi
                        ls -al *.tgz
                    """
                }
            }
        }

        // =====================================================================
        // 4. 아티팩트 저장
        // =====================================================================
        stage('Publish to Shared') {
            agent any
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
            sh 'sudo chown -R jenkins:jenkins ${JENKINS_WORK_PATH} || true'
            cleanWs(patterns: [[pattern: 'node_modules/**', type: 'EXCLUDE']])
        }
    }
}
