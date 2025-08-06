GO ?= $(shell command -v go 2> /dev/null)
NPM ?= $(shell command -v npm 2> /dev/null)
CURL ?= $(shell command -v curl 2> /dev/null)
MANIFEST_FILE ?= plugin.json
GOPATH ?= $(shell go env GOPATH)
GO_TEST_FLAGS ?= -race
GO_BUILD_FLAGS ?=
MM_UTILITIES_DIR ?= ../mattermost-utilities

export GO111MODULE=on
export GOPROXY=https://proxy.golang.org,direct

# Определение версии плагина из манифеста
PLUGIN_ID := $(shell cat $(MANIFEST_FILE) | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
PLUGIN_VERSION := $(shell cat $(MANIFEST_FILE) | python3 -c 'import sys,json;print(json.load(sys.stdin)["version"])')

# Определение архитектуры
BUNDLE_NAME := $(PLUGIN_ID)-$(PLUGIN_VERSION).tar.gz
GOFLAGS ?= $(GO_BUILD_FLAGS)
ifdef MM_DEBUG
	GOFLAGS += -gcflags "all=-N -l"
endif

# Цели по умолчанию
all: check-style dist

# Проверка стиля кода
.PHONY: check-style
check-style: webapp/.npminstall gofmt govet golint

# Форматирование Go кода
.PHONY: gofmt
gofmt:
	@echo Checking if files are gofmt\'ed
	@if [ -n "$$(go fmt ./server/...)" ]; then \
		echo "gofmt failed on the files above, please run 'make gofmt-fix'"; \
		exit 1; \
	fi

# Исправление форматирования Go кода
.PHONY: gofmt-fix
gofmt-fix:
	go fmt ./server/...

# Проверка с помощью go vet
.PHONY: govet
govet:
	@echo Running go vet
	$(GO) vet ./server/...

# Проверка с помощью golint
.PHONY: golint
golint:
	@echo Running golint
	golint -set_exit_status ./server/...

# Установка зависимостей для веб-части
webapp/.npminstall: webapp/package.json
	@echo Getting dependencies using npm
	cd webapp && $(NPM) install
	touch $@

# Сборка веб-части
.PHONY: webapp
webapp: webapp/.npminstall
	cd webapp && $(NPM) run build

# Сборка серверной части
.PHONY: server
server:
	mkdir -p server/dist
	cd server && $(GO) build $(GOFLAGS) -o dist/plugin-linux-amd64 ./main.go
	cd server && env GOOS=darwin GOARCH=amd64 $(GO) build $(GOFLAGS) -o dist/plugin-darwin-amd64 ./main.go
	cd server && env GOOS=windows GOARCH=amd64 $(GO) build $(GOFLAGS) -o dist/plugin-windows-amd64.exe ./main.go

# Создание дистрибутива
.PHONY: dist
dist: server webapp
	rm -rf dist/
	mkdir -p dist/$(PLUGIN_ID)
	cp $(MANIFEST_FILE) dist/$(PLUGIN_ID)/
	cp -r server/dist dist/$(PLUGIN_ID)/server/
	cp -r webapp/dist dist/$(PLUGIN_ID)/webapp/
	cd dist && tar -czvf $(BUNDLE_NAME) $(PLUGIN_ID)
	@echo Plugin built at: dist/$(BUNDLE_NAME)

# Установка плагина (требует доступ к Mattermost)
.PHONY: deploy
deploy: dist
	./build/bin/pluginctl deploy $(PLUGIN_ID) dist/$(BUNDLE_NAME)

# Включение плагина
.PHONY: enable
enable:
	./build/bin/pluginctl enable $(PLUGIN_ID)

# Отключение плагина
.PHONY: disable
disable:
	./build/bin/pluginctl disable $(PLUGIN_ID)

# Сброс плагина (отключение и включение)
.PHONY: reset
reset: disable enable

# Очистка сборочных файлов
.PHONY: clean
clean:
	rm -rf dist/
	rm -rf server/dist/
	rm -rf webapp/dist/
	rm -rf webapp/.npminstall

# Тестирование серверной части
.PHONY: test
test:
	cd server && $(GO) test $(GO_TEST_FLAGS) ./...

# Тестирование веб-части
.PHONY: test-webapp
test-webapp: webapp/.npminstall
	cd webapp && $(NPM) run test

# Запуск всех тестов
.PHONY: test-all
test-all: test test-webapp

# Проверка зависимостей
.PHONY: check-deps
check-deps:
ifndef GO
	$(error go is not available. Please install Go)
endif
ifndef NPM
	$(error npm is not available. Please install Node.js and npm)
endif

# Помощь
.PHONY: help
help:
	@echo "Доступные команды:"
	@echo "  all             - Проверить стиль и создать дистрибутив"
	@echo "  check-style     - Проверить стиль кода"
	@echo "  gofmt           - Проверить форматирование Go кода"
	@echo "  gofmt-fix       - Исправить форматирование Go кода"
	@echo "  govet           - Запустить go vet"
	@echo "  golint          - Запустить golint"
	@echo "  webapp          - Собрать веб-часть"
	@echo "  server          - Собрать серверную часть"
	@echo "  dist            - Создать дистрибутив плагина"
	@echo "  deploy          - Установить плагин в Mattermost"
	@echo "  enable          - Включить плагин"
	@echo "  disable         - Отключить плагин"
	@echo "  reset           - Перезапустить плагин"
	@echo "  clean           - Очистить сборочные файлы"
	@echo "  test            - Запустить тесты серверной части"
	@echo "  test-webapp     - Запустить тесты веб-части"
	@echo "  test-all        - Запустить все тесты"
	@echo "  check-deps      - Проверить зависимости"
	@echo "  help            - Показать эту справку" 