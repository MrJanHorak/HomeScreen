package expo.modules.tvwatchnext

import java.util.concurrent.atomic.AtomicLong

/** Package changes invalidate the snapshot; a normal resume reuses it. See THIRD_PARTY_NOTICES.md. */
internal class AppCatalogCache<T> {
  private val revision = AtomicLong()
  private var loadedRevision = -1L
  private var snapshot: T? = null

  fun invalidate() { revision.incrementAndGet() }

  @Synchronized
  fun get(load: () -> T): T {
    val currentRevision = revision.get()
    if (loadedRevision == currentRevision) {
      @Suppress("UNCHECKED_CAST")
      return snapshot as T
    }
    val result = load()
    snapshot = result
    // An invalidation during discovery must survive this write.
    loadedRevision = currentRevision
    return result
  }
}
