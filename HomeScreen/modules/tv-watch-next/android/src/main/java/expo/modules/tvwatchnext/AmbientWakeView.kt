package expo.modules.tvwatchnext

import android.content.Context
import android.graphics.Rect
import android.view.KeyEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** A local focus/key target while ambient covers the dashboard; no Activity-wide key interception. */
class AmbientWakeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onWake by EventDispatcher()
  private val keys = AmbientWakeKeys()

  init {
    isFocusable = true
    isFocusableInTouchMode = true
    isClickable = true
    isSoundEffectsEnabled = false
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    post { if (isAttachedToWindow) requestFocus() }
  }

  override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
    super.onWindowFocusChanged(hasWindowFocus)
    // Preview can mount before the Settings modal's window has finished closing.
    if (hasWindowFocus) post { if (isAttachedToWindow) requestFocus() }
  }

  override fun onFocusChanged(gainFocus: Boolean, direction: Int, previouslyFocusedRect: Rect?) {
    super.onFocusChanged(gainFocus, direction, previouslyFocusedRect)
    if (!gainFocus) keys.clear()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean =
    keys.press(keyCode) || super.onKeyDown(keyCode, event)

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    if (!keys.handles(keyCode)) return super.onKeyUp(keyCode, event)
    // Consume the release too, so Select cannot open the restored dashboard item.
    if (keys.release(keyCode, event.isCanceled)) performClick()
    return true
  }

  override fun performClick(): Boolean {
    super.performClick()
    onWake(emptyMap())
    return true
  }
}
