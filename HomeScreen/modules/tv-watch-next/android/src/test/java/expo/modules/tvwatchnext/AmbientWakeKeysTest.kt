package expo.modules.tvwatchnext

import android.view.KeyEvent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AmbientWakeKeysTest {
  @Test fun navigationKeysConsumeOneCompletePress() {
    val keys = AmbientWakeKeys()
    for (code in listOf(KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
      KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
      KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER)) {
      assertTrue(keys.press(code))
      assertTrue(keys.release(code))
      assertFalse(keys.release(code))
    }
  }

  @Test fun previewReleaseCanceledPressAndFocusLossDoNotWake() {
    val keys = AmbientWakeKeys()
    assertFalse(keys.release(KeyEvent.KEYCODE_DPAD_CENTER))
    keys.press(KeyEvent.KEYCODE_DPAD_RIGHT)
    assertFalse(keys.release(KeyEvent.KEYCODE_DPAD_RIGHT, canceled = true))
    keys.press(KeyEvent.KEYCODE_DPAD_LEFT)
    keys.clear()
    assertFalse(keys.release(KeyEvent.KEYCODE_DPAD_LEFT))
  }

  @Test fun systemAndMediaKeysAreNotIntercepted() {
    val keys = AmbientWakeKeys()
    for (code in listOf(KeyEvent.KEYCODE_HOME, KeyEvent.KEYCODE_BACK,
      KeyEvent.KEYCODE_POWER, KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)) {
      assertFalse(keys.handles(code))
      assertFalse(keys.press(code))
    }
  }
}
