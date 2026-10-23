package expo.modules.tvwatchnext

import android.content.Intent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.media.tv.TvContract
import android.os.Build
import android.provider.BaseColumns
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class TvWatchNextModule : Module() {
  private val readTvListings = "android.permission.READ_TV_LISTINGS"
  private val apps = AppCatalogCache<List<Map<String, String?>>>()
  private var receiverContext: Context? = null
  private val packageReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      apps.invalidate()
      sendEvent("onAppsChanged", emptyMap<String, Any>())
    }
  }

  private fun launchableApps(): List<Map<String, String?>> = apps.get {
    val context = requireNotNull(appContext.reactContext)
    val manager = context.packageManager
    val found = linkedMapOf<String, Map<String, String?>>()
    for (category in listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
      val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
      @Suppress("DEPRECATION")
      val matches = manager.queryIntentActivities(intent, 0)
      for (match in matches) {
        val activity = match.activityInfo ?: continue
        val packageName = activity.packageName
        if (packageName == context.packageName || found.containsKey(packageName)) continue
        val label = manager.getApplicationLabel(activity.applicationInfo).toString()
        val imageUri = runCatching {
          val drawable = activity.loadBanner(manager)
            ?: activity.applicationInfo.loadBanner(manager)
            ?: activity.applicationInfo.loadIcon(manager)
          thumbnail(drawable)
        }.getOrNull()
        found[packageName] = mapOf("packageName" to packageName, "label" to label, "imageUri" to imageUri)
      }
    }
    found.values.sortedBy { it["label"]?.lowercase() ?: "" }
  }

  private fun thumbnail(drawable: Drawable): String {
    val width = 160
    val height = 90
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val intrinsicWidth = drawable.intrinsicWidth.coerceAtLeast(1)
    val intrinsicHeight = drawable.intrinsicHeight.coerceAtLeast(1)
    val scale = minOf(width.toFloat() / intrinsicWidth, height.toFloat() / intrinsicHeight)
    val imageWidth = (intrinsicWidth * scale).toInt()
    val imageHeight = (intrinsicHeight * scale).toInt()
    drawable.setBounds((width - imageWidth) / 2, (height - imageHeight) / 2,
      (width + imageWidth) / 2, (height + imageHeight) / 2)
    drawable.draw(Canvas(bitmap))
    val output = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
    bitmap.recycle()
    return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
  }

  override fun definition() = ModuleDefinition {
    Name("TvWatchNext")
    Events("onAppsChanged")

    OnCreate {
      val context = requireNotNull(appContext.reactContext).applicationContext
      val filter = IntentFilter().apply {
        addAction(Intent.ACTION_PACKAGE_ADDED)
        addAction(Intent.ACTION_PACKAGE_REMOVED)
        addAction(Intent.ACTION_PACKAGE_REPLACED)
        addAction(Intent.ACTION_PACKAGE_CHANGED)
        addDataScheme("package")
      }
      if (Build.VERSION.SDK_INT >= 33) {
        context.registerReceiver(packageReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        context.registerReceiver(packageReceiver, filter)
      }
      receiverContext = context
    }

    OnDestroy {
      receiverContext?.unregisterReceiver(packageReceiver)
      receiverContext = null
      apps.invalidate()
    }

    AsyncFunction("getLaunchableApps") {
      launchableApps()
    }

    AsyncFunction("refreshLaunchableApps") {
      apps.invalidate()
      launchableApps()
    }

    AsyncFunction("getTvSystemStatus") {
      TvSystemControls(requireNotNull(appContext.reactContext)).status()
    }

    AsyncFunction("openTvSettings") { section: String ->
      TvSystemControls(requireNotNull(appContext.reactContext)).openSettings(section)
    }

    AsyncFunction("openTvInput") { id: String ->
      TvSystemControls(requireNotNull(appContext.reactContext)).openInput(id)
    }

    AsyncFunction("launchApp") { packageName: String ->
      val context = requireNotNull(appContext.reactContext)
      val manager = context.packageManager
      val intent = manager.getLeanbackLaunchIntentForPackage(packageName)
        ?: manager.getLaunchIntentForPackage(packageName)
        ?: return@AsyncFunction false
      runCatching {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }.isSuccess
    }

    AsyncFunction("getContinueWatching") {
      val context = requireNotNull(appContext.reactContext)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return@AsyncFunction emptyList<Map<String, Any?>>()
      }
      if (context.checkSelfPermission(readTvListings) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("READ_TV_LISTINGS permission is required")
      }

      val columns = arrayOf(
        BaseColumns._ID,
        TvContract.WatchNextPrograms.COLUMN_TITLE,
        TvContract.WatchNextPrograms.COLUMN_PACKAGE_NAME,
        TvContract.WatchNextPrograms.COLUMN_WATCH_NEXT_TYPE,
        TvContract.WatchNextPrograms.COLUMN_LAST_ENGAGEMENT_TIME_UTC_MILLIS,
        TvContract.WatchNextPrograms.COLUMN_LAST_PLAYBACK_POSITION_MILLIS,
        TvContract.WatchNextPrograms.COLUMN_DURATION_MILLIS,
        TvContract.WatchNextPrograms.COLUMN_POSTER_ART_URI,
        TvContract.WatchNextPrograms.COLUMN_EPISODE_TITLE,
        TvContract.WatchNextPrograms.COLUMN_SEASON_DISPLAY_NUMBER,
        TvContract.WatchNextPrograms.COLUMN_EPISODE_DISPLAY_NUMBER
      )
      val result = mutableListOf<Map<String, Any?>>()
      context.contentResolver.query(TvContract.WatchNextPrograms.CONTENT_URI, columns, null, null, null)?.use { cursor ->
        fun string(name: String): String? = cursor.getColumnIndex(name).takeIf { it >= 0 && !cursor.isNull(it) }?.let(cursor::getString)
        fun long(name: String): Long? = cursor.getColumnIndex(name).takeIf { it >= 0 && !cursor.isNull(it) }?.let(cursor::getLong)

        while (cursor.moveToNext()) {
          val type = long(TvContract.WatchNextPrograms.COLUMN_WATCH_NEXT_TYPE)?.toInt()
          val title = string(TvContract.WatchNextPrograms.COLUMN_TITLE)
          if (type != TvContract.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE || title.isNullOrBlank()) continue
          val packageName = string(TvContract.WatchNextPrograms.COLUMN_PACKAGE_NAME)
          val appName = packageName?.let { name ->
            runCatching {
              val info = context.packageManager.getApplicationInfo(name, 0)
              context.packageManager.getApplicationLabel(info).toString()
            }.getOrNull()
          }
          result.add(mapOf(
            "id" to (long(BaseColumns._ID) ?: continue),
            "title" to title,
            "packageName" to packageName,
            "appName" to appName,
            "lastEngagementMs" to long(TvContract.WatchNextPrograms.COLUMN_LAST_ENGAGEMENT_TIME_UTC_MILLIS),
            "positionMs" to long(TvContract.WatchNextPrograms.COLUMN_LAST_PLAYBACK_POSITION_MILLIS),
            "durationMs" to long(TvContract.WatchNextPrograms.COLUMN_DURATION_MILLIS),
            "posterUri" to string(TvContract.WatchNextPrograms.COLUMN_POSTER_ART_URI),
            "episodeTitle" to string(TvContract.WatchNextPrograms.COLUMN_EPISODE_TITLE),
            "season" to string(TvContract.WatchNextPrograms.COLUMN_SEASON_DISPLAY_NUMBER),
            "episode" to string(TvContract.WatchNextPrograms.COLUMN_EPISODE_DISPLAY_NUMBER)
          ))
        }
      }
      result.sortedByDescending { (it["lastEngagementMs"] as? Long) ?: 0L }
    }

    AsyncFunction("openProgram") { id: Double ->
      val context = requireNotNull(appContext.reactContext)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@AsyncFunction false
      val uri = TvContract.buildWatchNextProgramUri(id.toLong())
      val columns = arrayOf(TvContract.WatchNextPrograms.COLUMN_INTENT_URI)
      val intentUri = context.contentResolver.query(uri, columns, null, null, null)?.use { cursor ->
        if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getString(0) else null
      } ?: return@AsyncFunction false
      val intent = Intent.parseUri(intentUri, Intent.URI_INTENT_SCHEME)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }
  }
}
