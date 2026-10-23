package expo.modules.tvwatchnext

import android.content.Context
import android.content.Intent
import android.media.tv.TvContract
import android.media.tv.TvInputManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.provider.Settings

/** Standard Android TV controls; unavailable OEM features are omitted. */
internal class TvSystemControls(private val context: Context) {
  fun status(): Map<String, Any> {
    val network = runCatching {
      val manager = context.getSystemService(ConnectivityManager::class.java)
      val caps = manager?.getNetworkCapabilities(manager.activeNetwork)
      when {
        caps == null -> "Offline"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
        else -> "Connected"
      }
    }.getOrDefault("Unavailable")
    return mapOf("network" to network, "inputs" to inputs())
  }

  private fun inputs(): List<Map<String, String>> = runCatching {
    val manager = context.getSystemService(TvInputManager::class.java) ?: return emptyList()
    manager.tvInputList.filter { it.isPassthroughInput && !it.isHidden(context) }.map { input ->
      val state = when (manager.getInputState(input.id)) {
        TvInputManager.INPUT_STATE_CONNECTED -> "Connected"
        TvInputManager.INPUT_STATE_CONNECTED_STANDBY -> "Standby"
        else -> "Disconnected"
      }
      mapOf("id" to input.id,
        "label" to (input.loadCustomLabel(context) ?: input.loadLabel(context)).toString(), "state" to state)
    }.sortedBy { it["label"] }
  }.getOrDefault(emptyList())

  fun openSettings(section: String): Boolean {
    val action = when (section) {
      "network" -> Settings.ACTION_WIFI_SETTINGS
      "device" -> Settings.ACTION_SETTINGS
      else -> return false
    }
    return open(Intent(action)) || (section == "network" && open(Intent(Settings.ACTION_WIRELESS_SETTINGS)))
  }

  fun openInput(id: String): Boolean {
    if (inputs().none { it["id"] == id }) return false
    return open(Intent(Intent.ACTION_VIEW).setDataAndType(
      TvContract.buildChannelUriForPassthroughInput(id), "vnd.android.cursor.item/channel"))
  }

  private fun open(intent: Intent): Boolean = runCatching {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    true
  }.getOrDefault(false)
}
