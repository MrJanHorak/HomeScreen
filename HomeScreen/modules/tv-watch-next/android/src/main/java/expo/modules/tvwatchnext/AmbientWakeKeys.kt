package expo.modules.tvwatchnext

import android.view.KeyEvent

/** Only an entire navigation press on the ambient view can wake it. */
internal class AmbientWakeKeys {
  private var pressed = -1

  fun handles(code: Int): Boolean = when (code) {
    KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
    KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
    KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> true
    else -> false
  }

  fun press(code: Int): Boolean {
    if (!handles(code)) return false
    pressed = code
    return true
  }

  fun release(code: Int, canceled: Boolean = false): Boolean {
    val wake = pressed == code && !canceled
    clear()
    return wake
  }

  fun clear() { pressed = -1 }
}
