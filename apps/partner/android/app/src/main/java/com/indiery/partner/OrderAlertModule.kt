package com.indeiry.driver

import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class OrderAlertModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var ringtone: Ringtone? = null

  override fun getName(): String = "OrderAlert"

  @ReactMethod
  fun start() {
    reactContext.runOnUiQueueThread {
      stopInternal()

      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ringtone = RingtoneManager.getRingtone(reactContext, uri)?.apply {
        audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          isLooping = true
          volume = 1.0f
        }
        play()
      }

      val pattern = longArrayOf(0, 700, 250, 700, 250, 900, 400)
      val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        reactContext.getSystemService(VibratorManager::class.java).defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        reactContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(pattern, 0)
      }
    }
  }

  @ReactMethod
  fun stop() {
    reactContext.runOnUiQueueThread { stopInternal() }
  }

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    promise.resolve(OrderOverlayController.canDrawOverlays(reactContext))
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(reactContext)) return
    reactContext.startActivity(Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}")
    ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
  }

  @ReactMethod
  fun hideOrderOverlay() {
    OrderOverlayController.hide()
  }

  @ReactMethod
  fun showPreviewOverlay() {
    if (!BuildConfig.DEBUG) return
    OrderOverlayController.show(
      reactContext,
      OrderOverlayPayload(
        orderId = "preview-order",
        orderNo = "IDY-4821",
        pickupLabel = "Sector 18 Metro Station, Noida",
        dropLabel = "DLF Cyber City, Gurugram",
        pickupDistanceKm = "1.8",
        tripDistanceKm = "31.4",
        weightKg = "12",
        goodsType = "Parcel",
        partnerEarnings = "428",
        offerExpiresAtMs = System.currentTimeMillis() + 30_000
      ),
      allowForeground = true
    )
  }

  private fun stopInternal() {
    ringtone?.stop()
    ringtone = null
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      reactContext.getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      reactContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator.cancel()
  }

  override fun invalidate() {
    stopInternal()
    super.invalidate()
  }
}
