package com.indeiry.driver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log

class OrderOverlayPreviewReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != "com.indeiry.driver.PREVIEW_ORDER_OVERLAY") return
    Log.i("OrderOverlay", "debug preview broadcast received")
    postTestOrderNotification(context)
    val pendingResult = goAsync()
    OrderOverlayController.show(
      context,
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
        offerExpiresAtMs = System.currentTimeMillis() + 90_000
      ),
      allowForeground = true
    )
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ pendingResult.finish() }, 5_000)
  }

  private fun postTestOrderNotification(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channelId = MainApplication.DRIVER_ORDER_ALERT_CHANNEL_ID
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(channelId) == null) {
      val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      val audio = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      manager.createNotificationChannel(NotificationChannel(channelId, "Incoming delivery requests", NotificationManager.IMPORTANCE_HIGH).apply {
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 700, 250, 700, 250, 900)
        setSound(sound, audio)
      })
    }
    val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, channelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).apply {
        setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        setVibrate(longArrayOf(0, 700, 250, 700, 250, 900))
      }
    }.setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Test order alert")
      .setContentText("New delivery request · IDY-4821")
      .setPriority(Notification.PRIORITY_HIGH)
      .setAutoCancel(true)
      .build()
    manager.notify(4821, notification)
    Log.i("OrderOverlay", "debug test notification posted on $channelId")
  }
}
