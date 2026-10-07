package com.indeiry.driver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Application
import android.content.res.Configuration
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  companion object {
    const val DRIVER_ORDER_ALERT_CHANNEL_ID = "driver-order-alerts-v2"
  }

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(OrderAlertPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    createDriverOrderAlertChannel()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  private fun createDriverOrderAlertChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    val channel = NotificationChannel(
      DRIVER_ORDER_ALERT_CHANNEL_ID,
      "Incoming delivery requests",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Rings and vibrates when a new delivery request is available"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 700, 250, 700, 250, 900)
      enableLights(true)
      setSound(ringtoneUri, audioAttributes)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
