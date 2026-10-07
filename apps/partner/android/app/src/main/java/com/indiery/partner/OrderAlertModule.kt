package com.indeiry.driver

import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OrderAlertModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var ringtone: Ringtone? = null

  override fun getName(): String = "OrderAlert"

  @ReactMethod
  fun start() {
    reactContext.runOnUiQueueThread {
      stopInternal()

      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      ringtone = RingtoneManager.getRingtone(reactContext, uri)?.apply {
        audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
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
