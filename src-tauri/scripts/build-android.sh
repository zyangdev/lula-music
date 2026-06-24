#!/usr/bin/env bash
# Build de Lula para Android (APK) en Windows SIN modo desarrollador.
#
# `tauri android build` falla en Windows sin "Modo desarrollador" porque crea un
# symlink del .so a jniLibs (privilegio no disponible sin admin). Este script
# evita el symlink: compila el .so con cargo, lo COPIA a jniLibs y deja que
# Gradle empaquete (-x rustBuild..., para que no rehaga el symlink).
#
# Uso:   bash scripts/build-android.sh [arch] [debug|release]
#   arch: aarch64 (def) | armv7 | i686 | x86_64
#
# Si tienes "Modo desarrollador" de Windows activado, NO necesitas esto:
# basta `pnpm tauri android build --apk`.
set -euo pipefail

ARCH="${1:-aarch64}"
PROFILE="${2:-debug}"

# --- Toolchain (ajusta si cambian las rutas de scoop) ---
export JAVA_HOME="${JAVA_HOME:-/c/Users/yziwe/scoop/apps/temurin17-jdk/current}"
export ANDROID_HOME="${ANDROID_HOME:-/c/Users/yziwe/scoop/apps/android-clt/current}"
export NDK_HOME="${NDK_HOME:-$ANDROID_HOME/ndk/28.2.13676358}"
LLVM="${LLVM:-/c/Users/yziwe/scoop/apps/llvm/current}"
export LIBCLANG_PATH="${LIBCLANG_PATH:-$LLVM/bin}"
# bindgen (rquickjs en Android) necesita el sysroot del NDK y los includes de clang.
NDK_SYSROOT_WIN="$(cygpath -w "$NDK_HOME/toolchains/llvm/prebuilt/windows-x86_64/sysroot" 2>/dev/null || echo "$NDK_HOME/toolchains/llvm/prebuilt/windows-x86_64/sysroot")"
LLVM_INC_WIN="$(cygpath -w "$LLVM"/lib/clang/*/include 2>/dev/null | head -1 || true)"
export BINDGEN_EXTRA_CLANG_ARGS="--sysroot=${NDK_SYSROOT_WIN//\\//} -I${LLVM_INC_WIN//\\//}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# arch -> (rust target, abi dir, gradle flavor, prefijo del wrapper clang del NDK)
API=24   # = minSdk en build.gradle.kts
case "$ARCH" in
  aarch64) TARGET=aarch64-linux-android;   ABI=arm64-v8a;   FLAVOR=Arm64;  CLANG_PREFIX=aarch64-linux-android ;;
  armv7)   TARGET=armv7-linux-androideabi; ABI=armeabi-v7a; FLAVOR=Arm;    CLANG_PREFIX=armv7a-linux-androideabi ;;
  i686)    TARGET=i686-linux-android;      ABI=x86;         FLAVOR=X86;    CLANG_PREFIX=i686-linux-android ;;
  x86_64)  TARGET=x86_64-linux-android;    ABI=x86_64;      FLAVOR=X86_64; CLANG_PREFIX=x86_64-linux-android ;;
  *) echo "arch desconocida: $ARCH"; exit 1 ;;
esac

# Toolchain del NDK para que cargo/cc-rs compilen y enlacen el código C (quickjs).
NDK_BIN="$NDK_HOME/toolchains/llvm/prebuilt/windows-x86_64/bin"
CLANG="$NDK_BIN/${CLANG_PREFIX}${API}-clang.cmd"
TARGET_US="${TARGET//-/_}"
TARGET_UP="$(echo "$TARGET_US" | tr '[:lower:]' '[:upper:]')"
export "CC_${TARGET_US}=$CLANG"
export "CXX_${TARGET_US}=${CLANG/-clang.cmd/-clang++.cmd}"
export "AR_${TARGET_US}=$NDK_BIN/llvm-ar.exe"
export "CARGO_TARGET_${TARGET_UP}_LINKER=$CLANG"

PROFILE_CAP="$(tr '[:lower:]' '[:upper:]' <<< "${PROFILE:0:1}")${PROFILE:1}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # src-tauri
ROOT="$(dirname "$HERE")"

echo "==> frontend (pnpm build -> dist/)"
( cd "$ROOT" && pnpm build )

echo "==> cargo build ($TARGET, $PROFILE)"
CARGO_FLAGS=(--package lula --manifest-path "$HERE/Cargo.toml" --target "$TARGET" --features "tauri/custom-protocol" --lib)
[ "$PROFILE" = release ] && CARGO_FLAGS+=(--release)
( cd "$ROOT" && cargo build "${CARGO_FLAGS[@]}" )

SO="$HERE/target/$TARGET/$PROFILE/liblula_lib.so"
DEST="$HERE/gen/android/app/src/main/jniLibs/$ABI"
echo "==> copiando .so -> jniLibs/$ABI (evita symlink)"
mkdir -p "$DEST"
cp -f "$SO" "$DEST/liblula_lib.so"

echo "==> gradle assemble$FLAVOR$PROFILE_CAP (sin rustBuild)"
( cd "$HERE/gen/android" && ./gradlew.bat "assemble$FLAVOR$PROFILE_CAP" -x "rustBuild$FLAVOR$PROFILE_CAP" --console=plain )

echo "==> APK:"
find "$HERE/gen/android/app/build/outputs/apk" -name "*.apk" -newer "$SO" 2>/dev/null || \
  find "$HERE/gen/android/app/build/outputs/apk" -name "*$ARCH*$PROFILE*.apk" 2>/dev/null
