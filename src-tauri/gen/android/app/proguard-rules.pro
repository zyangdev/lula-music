# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Lula: extracción de YouTube (NewPipeExtractor + Rhino) ---
# NewPipeExtractor usa reflexión y Rhino (motor JS) para descifrar firmas;
# R8/minify no debe eliminar ni renombrar estas clases.
-keep class org.schabi.newpipe.extractor.** { *; }
-keep class org.mozilla.javascript.** { *; }
-keep class org.mozilla.classfile.** { *; }
-dontwarn org.schabi.newpipe.extractor.**
-dontwarn org.mozilla.javascript.**
-dontwarn javax.annotation.**
# El plugin Tauri se instancia por nombre vía JNI.
-keep class com.lula.app.YoutubePlugin { *; }
-keep class com.lula.app.YoutubeDownloader { *; }