package com.indeiry.driver

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import org.json.JSONObject

class PartnerFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)
    val payload = runCatching { JSONObject(remoteMessage.data["body"] ?: "{}") }.getOrNull() ?: return
    if (payload.optString("event") != "order_offer") return

    OrderOverlayController.show(
      applicationContext,
      OrderOverlayPayload(
        orderId = payload.optString("orderId"),
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
}
