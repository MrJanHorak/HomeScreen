Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path $PSScriptRoot '..\assets'
$assetDirectory = [System.IO.Path]::GetFullPath($assetDirectory)

function Color([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function RoundedPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function FillRound($graphics, $brush, [single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
  $path = RoundedPath $x $y $width $height $radius
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

function DrawMark($graphics, [single]$x, [single]$y, [single]$size) {
  $state = $graphics.Save()
  $graphics.TranslateTransform($x, $y)
  $graphics.ScaleTransform($size / 200, $size / 200)
  $frame = [System.Drawing.SolidBrush]::new((Color 19 43 68))
  $tile = [System.Drawing.SolidBrush]::new((Color 28 62 88))
  $tileAccent = [System.Drawing.SolidBrush]::new((Color 33 77 100))
  $cyan = [System.Drawing.SolidBrush]::new((Color 56 189 248))
  $mint = [System.Drawing.SolidBrush]::new((Color 52 211 153))
  $amber = [System.Drawing.SolidBrush]::new((Color 251 191 36))
  $white = [System.Drawing.SolidBrush]::new((Color 240 249 255))
  $border = [System.Drawing.Pen]::new((Color 98 178 210), 3)
  $thin = [System.Drawing.Pen]::new((Color 133 225 255), 4)
  $thin.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $thin.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  try {
    FillRound $graphics $frame 5 5 190 190 35
    $outline = RoundedPath 5 5 190 190 35
    $graphics.DrawPath($border, $outline)
    $outline.Dispose()
    FillRound $graphics $tile 21 21 76 76 16
    FillRound $graphics $tileAccent 103 21 76 76 16
    FillRound $graphics $tileAccent 21 103 76 76 16
    FillRound $graphics $tile 103 103 76 76 16

    # Clock
    $graphics.DrawEllipse($thin, 41, 41, 36, 36)
    $graphics.DrawLine($thin, 59, 59, 59, 46)
    $graphics.DrawLine($thin, 59, 59, 69, 64)

    # Weather
    $graphics.FillEllipse($amber, 121, 38, 24, 24)
    $graphics.FillEllipse($white, 118, 60, 34, 17)
    $graphics.FillEllipse($white, 137, 54, 26, 23)
    $graphics.FillRectangle($white, 124, 66, 39, 11)

    # Calendar
    FillRound $graphics $white 39 124 40 36 5
    $graphics.FillRectangle($cyan, 39, 124, 40, 10)
    $graphics.FillRectangle($tileAccent, 48, 141, 8, 7)
    $graphics.FillRectangle($tileAccent, 62, 141, 8, 7)
    $graphics.FillRectangle($tileAccent, 48, 151, 8, 5)

    # Progress and activity
    $graphics.FillRectangle($mint, 119, 143, 10, 18)
    $graphics.FillRectangle($cyan, 136, 132, 10, 29)
    $graphics.FillRectangle($amber, 153, 122, 10, 39)
  } finally {
    foreach ($resource in @($frame, $tile, $tileAccent, $cyan, $mint, $amber, $white, $border, $thin)) {
      $resource.Dispose()
    }
    $graphics.Restore($state)
  }
}

function NewCanvas([int]$width, [int]$height, [bool]$transparent = $false) {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  if ($transparent) { $graphics.Clear([System.Drawing.Color]::Transparent) }
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function SaveCanvas($canvas, [string]$name) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save((Join-Path $assetDirectory $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

$banner = NewCanvas 640 360
$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 0, 640, 360), (Color 8 19 37), (Color 20 54 78),
  [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$banner.Graphics.FillRectangle($background, 0, 0, 640, 360)
$background.Dispose()
$glow = [System.Drawing.SolidBrush]::new((Color 56 189 248 18))
$banner.Graphics.FillEllipse($glow, 385, -120, 330, 330)
$banner.Graphics.FillEllipse($glow, -95, 190, 330, 330)
$glow.Dispose()
DrawMark $banner.Graphics 49 84 192
$titleBrush = [System.Drawing.SolidBrush]::new((Color 240 249 255))
$subtitleBrush = [System.Drawing.SolidBrush]::new((Color 148 200 224))
$titleFont = [System.Drawing.Font]::new('Segoe UI', 43, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = [System.Drawing.Font]::new('Segoe UI', 19, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$banner.Graphics.DrawString('HomeScreen', $titleFont, $titleBrush, 265, 126)
$banner.Graphics.DrawString('Your day at a glance', $subtitleFont, $subtitleBrush, 269, 192)
$titleFont.Dispose()
$subtitleFont.Dispose()
$titleBrush.Dispose()
$subtitleBrush.Dispose()
SaveCanvas $banner 'tv-banner.png'

$icon = NewCanvas 1024 1024
$iconBackground = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 0, 1024, 1024), (Color 8 19 37), (Color 24 67 91),
  [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$icon.Graphics.FillRectangle($iconBackground, 0, 0, 1024, 1024)
$iconBackground.Dispose()
DrawMark $icon.Graphics 192 192 640
SaveCanvas $icon 'icon.png'

$foreground = NewCanvas 1024 1024 $true
DrawMark $foreground.Graphics 202 202 620
SaveCanvas $foreground 'android-icon-foreground.png'

$splash = NewCanvas 360 360 $true
DrawMark $splash.Graphics 30 30 300
SaveCanvas $splash 'homescreen-splash.png'
