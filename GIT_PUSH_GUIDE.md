# GitHub 푸시 가이드

## 현재 디렉토리 확인 및 이동

```powershell
# INFLUX 디렉토리로 이동
cd c:\Users\user\Desktop\INFLUX

# 현재 위치 확인
pwd
```

## Git 상태 확인

```powershell
# Git 저장소인지 확인
git status

# 원격 저장소 확인
git remote -v

# 브랜치 확인
git branch
```

## Git 저장소가 아닌 경우 초기화

```powershell
# Git 저장소 초기화
git init

# 원격 저장소 추가 (이미 있으면 업데이트)
git remote add origin https://github.com/sin0724/INFLUX.git

# 또는 기존 원격 저장소 URL 업데이트
git remote set-url origin https://github.com/sin0724/INFLUX.git

# 브랜치를 main으로 설정
git branch -M main
```

## 변경사항 커밋 및 푸시

```powershell
# 모든 변경사항 추가
git add .

# 변경사항 확인
git status

# 커밋
git commit -m "광고주 화면 개선: 당근마켓 추가, 인스타그램 통합, 체험단 신청 기능"

# 원격 저장소 정보 가져오기
git fetch origin

# 푸시 (처음이면)
git push -u origin main

# 또는 기존 브랜치에 푸시
git push origin main
```

## 인증 문제 해결

만약 인증 오류가 발생하면:

### 방법 1: Personal Access Token 사용

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. 권한 선택: `repo` 체크
4. 토큰 생성 후 복사
5. 푸시 시 비밀번호 대신 토큰 입력

### 방법 2: GitHub Desktop 사용

1. GitHub Desktop 설치
2. File → Add Local Repository
3. `c:\Users\user\Desktop\INFLUX` 선택
4. GitHub Desktop에서 Commit & Push

## 강제 푸시 (주의: 필요한 경우만)

원격에 다른 변경사항이 있어 충돌이 발생하는 경우:

```powershell
# 원격 변경사항 가져오기
git fetch origin

# 병합
git merge origin/main --allow-unrelated-histories

# 충돌 해결 후
git add .
git commit -m "Merge remote changes"

# 푸시
git push origin main
```

## 문제 해결

### "not a git repository" 오류
```powershell
git init
git remote add origin https://github.com/sin0724/INFLUX.git
```

### "Authentication failed" 오류
- Personal Access Token 사용
- 또는 GitHub Desktop 사용

### "Updates were rejected" 오류
```powershell
git pull origin main --allow-unrelated-histories
git push origin main
```

