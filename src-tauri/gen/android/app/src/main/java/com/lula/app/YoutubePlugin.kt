package com.lula.app

import android.app.Activity
import android.net.Uri
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import okhttp3.OkHttpClient
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.search.SearchInfo
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import java.io.File

@InvokeArg
internal class SearchArgs {
    lateinit var query: String
    var limit: Int = 20
}

@InvokeArg
internal class IdArgs {
    lateinit var videoId: String
    var limit: Int = 25
}

@InvokeArg
internal class ReadFileArgs {
    lateinit var uri: String
}

@InvokeArg
internal class WriteFileArgs {
    lateinit var uri: String
    lateinit var contents: String
}

/**
 * Native YouTube extraction for Android via NewPipeExtractor. Mirrors the
 * desktop `yt-dlp` commands so the frontend contract is identical.
 */
@TauriPlugin
class YoutubePlugin(private val activity: Activity) : Plugin(activity) {

    @Volatile
    private var initialized = false

    private fun ensureInit() {
        if (!initialized) {
            synchronized(this) {
                if (!initialized) {
                    NewPipe.init(YoutubeDownloader.getInstance())
                    initialized = true
                }
            }
        }
    }

    /** Run blocking extraction off the main thread; resolve/reject the invoke. */
    private fun runBg(invoke: Invoke, block: () -> JSObject) {
        Thread {
            try {
                ensureInit()
                invoke.resolve(block())
            } catch (e: Exception) {
                invoke.reject(e.message ?: e.toString())
            }
        }.start()
    }

    /** Like runBg but without NewPipe init (for plain file IO). */
    private fun runIO(invoke: Invoke, block: () -> JSObject) {
        Thread {
            try {
                invoke.resolve(block())
            } catch (e: Exception) {
                invoke.reject(e.message ?: e.toString())
            }
        }.start()
    }

    /** Read a SAF/content-uri file as UTF-8 text (the desktop uses std::fs). */
    @Command
    fun readTextFile(invoke: Invoke) {
        val args = invoke.parseArgs(ReadFileArgs::class.java)
        runIO(invoke) {
            val text = activity.contentResolver.openInputStream(Uri.parse(args.uri))
                ?.use { it.readBytes().toString(Charsets.UTF_8) }
                ?: throw RuntimeException("no se pudo abrir el archivo")
            JSObject().apply { put("contents", text) }
        }
    }

    /** Write UTF-8 text to a SAF/content-uri file. */
    @Command
    fun writeTextFile(invoke: Invoke) {
        val args = invoke.parseArgs(WriteFileArgs::class.java)
        runIO(invoke) {
            (activity.contentResolver.openOutputStream(Uri.parse(args.uri), "wt")
                ?: throw RuntimeException("no se pudo abrir el archivo para escribir"))
                .use { it.write(args.contents.toByteArray(Charsets.UTF_8)) }
            JSObject()
        }
    }

    @Command
    fun search(invoke: Invoke) {
        val args = invoke.parseArgs(SearchArgs::class.java)
        runBg(invoke) {
            val service = ServiceList.YouTube
            val qh = service.searchQHFactory.fromQuery(args.query)
            val info = SearchInfo.getInfo(service, qh)
            val songs = JSArray()
            var count = 0
            for (item in info.relatedItems) {
                if (item !is StreamInfoItem) continue
                songs.put(songJson(item))
                if (++count >= args.limit) break
            }
            JSObject().apply { put("songs", songs) }
        }
    }

    @Command
    fun radio(invoke: Invoke) {
        val args = invoke.parseArgs(IdArgs::class.java)
        runBg(invoke) {
            val info = StreamInfo.getInfo(ServiceList.YouTube, watchUrl(args.videoId))
            val songs = JSArray()
            var count = 0
            for (item in info.relatedItems) {
                if (item !is StreamInfoItem) continue
                if (videoId(item.url) == args.videoId) continue
                songs.put(songJson(item))
                if (++count >= args.limit) break
            }
            JSObject().apply { put("songs", songs) }
        }
    }

    @Command
    fun resolveStream(invoke: Invoke) {
        val args = invoke.parseArgs(IdArgs::class.java)
        runBg(invoke) {
            val info = StreamInfo.getInfo(ServiceList.YouTube, watchUrl(args.videoId))
            val audio = bestAudio(info) ?: throw RuntimeException("no hay stream de audio")
            JSObject().apply { put("url", audio.content) }
        }
    }

    @Command
    fun download(invoke: Invoke) {
        val args = invoke.parseArgs(IdArgs::class.java)
        runBg(invoke) {
            val info = StreamInfo.getInfo(ServiceList.YouTube, watchUrl(args.videoId))
            val audio = bestAudio(info) ?: throw RuntimeException("no hay stream de audio")
            val ext = audio.format?.suffix ?: "m4a"
            val dir = File(activity.filesDir, "downloads").apply { mkdirs() }
            val file = File(dir, "${args.videoId}.$ext")
            downloadTo(audio.content, file)
            JSObject().apply { put("path", file.absolutePath) }
        }
    }

    // ---------- helpers ----------

    private fun songJson(item: StreamInfoItem): JSObject {
        val id = videoId(item.url)
        return JSObject().apply {
            put("id", id)
            put("title", item.name ?: "Sin título")
            put("artist", (item.uploaderName ?: "Desconocido").removeSuffix(" - Topic"))
            put("thumbnail", thumbnail(item, id))
            val dur = item.duration
            if (dur >= 0) put("duration", dur)
        }
    }

    private fun thumbnail(item: StreamInfoItem, id: String): String {
        val best = item.thumbnails.maxByOrNull { it.height }
        return best?.url?.takeIf { it.isNotEmpty() }
            ?: "https://i.ytimg.com/vi/$id/hqdefault.jpg"
    }

    private fun bestAudio(info: StreamInfo): AudioStream? =
        info.audioStreams.maxByOrNull { it.bitrate }

    private fun watchUrl(videoId: String) = "https://www.youtube.com/watch?v=$videoId"

    private fun videoId(url: String): String =
        Uri.parse(url).getQueryParameter("v")
            ?: url.substringAfterLast("/").substringBefore("?")

    private fun downloadTo(url: String, file: File) {
        val client = OkHttpClient()
        val request = okhttp3.Request.Builder().url(url).build()
        client.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("descarga falló: HTTP ${resp.code}")
            file.outputStream().use { out -> resp.body?.byteStream()?.copyTo(out) }
        }
    }
}
