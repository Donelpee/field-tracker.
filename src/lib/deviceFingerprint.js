/**
 * Device Identifier Generator
 * 
 * Generates a stable, invisible device ID from browser/phone properties.
 * This has NOTHING to do with biometric fingerprints — staff still log in
 * with email and password as usual. This just silently identifies which
 * device/browser they are using (screen size, browser type, timezone, etc.)
 */

async function getCanvasSignature() {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 200
    canvas.height = 50

    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('FieldTracker:device', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('FieldTracker:device', 4, 17)

    return canvas.toDataURL()
  } catch {
    return 'canvas-not-supported'
  }
}

async function hashString(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a stable device identifier.
 * Combines multiple browser/device signals into a single unique ID.
 * @returns {Promise<string>} A unique device ID string
 */
export async function getDeviceId() {
  const canvasSig = await getCanvasSignature()

  const signals = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    canvasSig,
  ]

  const raw = signals.join('|||')
  return hashString(raw)
}
