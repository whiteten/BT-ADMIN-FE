# FE 전용 정적 웹서버 (nginx) — 개발/검증 클러스터용.
#
# 왜 필요한가:
#   기본 배포 형태는 FE 번들을 BFF jar 의 static/ 에 심는 것이다(사이트 납품 산출물).
#   그 방식은 BFF 이미지마다 FE 복사본이 따로 박혀서, webflux BFF / 서블릿 BFF /
#   네임스페이스별 BFF 가 각각 다른 시점의 프론트를 들고 있게 된다.
#   이 이미지는 FE 를 한 번만 굽고, 바라볼 BFF 만 ConfigMap(BFF_UPSTREAM)으로 갈아끼운다.
#
# 주의: 납품 산출물은 여전히 BFF 내장 방식이다. 이 이미지는 그 대체가 아니라 검증용이다.
#
# 빌드 컨텍스트 = FE 레포 루트. 사전에 `pnpm build all` 로 dist/deploy 가 만들어져 있어야 한다.
#   docker build -f docker/fe-server/Dockerfile -t whiteten/bt-admin-fe:latest .
FROM nginx:1.27-alpine

# dist/deploy = host 번들(루트) + remotes/<app>/
COPY dist/deploy/ /usr/share/nginx/html/

# nginx:alpine 은 /etc/nginx/templates/*.template 를 envsubst 처리 후 conf.d 로 복사한다.
# (컨테이너에 정의된 env 이름만 치환하므로 $host, $remote_addr 등 nginx 변수는 보존된다)
COPY docker/fe-server/default.conf.template /etc/nginx/templates/default.conf.template

# 기본 업스트림 = 서블릿 BFF. ConfigMap 으로 덮어쓴다.
ENV BFF_UPSTREAM=http://bt-admin-bff-servlet:8080

EXPOSE 80
