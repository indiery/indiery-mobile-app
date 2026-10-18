package com.indeiry.driver

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import android.util.Log
import org.json.JSONObject

class PartnerFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    try {
      val payload = parsePayload(remoteMessage.data)
      if (payload?.optString("event") == "order_offer") {
        val orderId = payload.optString("orderId")
        if (orderId.isBlank()) {
          Log.w(TAG, "Ignoring order offer without an order id")
        } else {
          Log.i(TAG, "Received order offer keys=${remoteMessage.data.keys}")
          OrderOverlayController.show(
            applicationContext,
            OrderOverlayPayload(
              orderId = orderId,
              orderNo = payload.optString("orderNo"),
              pickupLabel = payload.optString("pickupLabel"),
              dropLabel = payload.optString("dropLabel"),
              pickupDistanceKm = payload.optString("pickupDistanceKm"),
              tripDistanceKm = payload.optString("tripDistanceKm"),
              weightKg = payload.optString("weightKg"),
              goodsType = payload.optString("goodsType"),
              partnerEarnings = payload.optString("partnerEarnings"),
              offerExpiresAtMs = payload.optLong("offerExpiresAtMs", System.currentTimeMillis() + 45_000)
            )
          )
        }
      } else {
        Log.d(TAG, "Push is not an order offer; data keys=${remoteMessage.data.keys}")
      }
    } catch (error: Exception) {
      // The system notification should still be delivered if overlay rendering fails.
      Log.e(TAG, "Unable to display incoming order overlay", error)
    } finally {
      super.onMessageReceived(remoteMessage)
    }
  }

  /**
   * Expo normally serializes the custom `data` object in a JSON `body` field.
   * Merge that with top-level FCM data so direct FCM payloads work as well.
   */
  private fun parsePayload(data: Map<String, String>): JSONObject? {
    val payload = JSONObject()
    data.forEach { (key, value) ->
      if (key != "body") payload.put(key, value)
    }

    val serializedBody = data["body"]
    if (!serializedBody.isNullOrBlank()) {
      val body = runCatching { JSONObject(serializedBody) }.getOrNull()
      if (body != null) {
        val keys = body.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          payload.put(key, body.get(key))
        }
      }
    }

    val nestedData = payload.optJSONObject("data")
    if (nestedData != null) {
      val keys = nestedData.keys()
      while (keys.hasNext()) {
        val key = keys.next()
        if (!payload.has(key)) payload.put(key, nestedData.get(key))
      }
    }

    return payload.takeIf { it.has("event") || it.has("orderId") }
  }

  companion object {
    private const val TAG = "OrderOverlay"
  }
}
