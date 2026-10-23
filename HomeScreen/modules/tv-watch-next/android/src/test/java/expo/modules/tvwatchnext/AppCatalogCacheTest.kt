package expo.modules.tvwatchnext

import org.junit.Assert.assertEquals
import org.junit.Test

class AppCatalogCacheTest {
  @Test fun resumesReuseDiscoveryAndArtwork() {
    val cache = AppCatalogCache<List<String>>()
    var loads = 0
    repeat(5) { assertEquals(listOf("YouTube"), cache.get { loads++; listOf("YouTube") }) }
    assertEquals(1, loads)
  }

  @Test fun severalPackageChangesProduceOneRebuild() {
    val cache = AppCatalogCache<String>()
    cache.get { "old" }
    repeat(3) { cache.invalidate() }
    var loads = 0
    repeat(2) { assertEquals("new", cache.get { loads++; "new" }) }
    assertEquals(1, loads)
  }

  @Test fun packageChangeDuringDiscoveryIsNotLost() {
    val cache = AppCatalogCache<String>()
    assertEquals("old", cache.get { cache.invalidate(); "old" })
    assertEquals("new", cache.get { "new" })
  }

  @Test fun failedDiscoveryCanBeRetried() {
    val cache = AppCatalogCache<String>()
    cache.get { "old" }
    cache.invalidate()
    try { cache.get { throw IllegalStateException("Package manager unavailable") } } catch (_: IllegalStateException) { }
    assertEquals("recovered", cache.get { "recovered" })
  }
}
