package com.indeiry.driver

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.max
import kotlin.math.roundToInt

data class OrderOverlayPayload(
  val orderId: String,
  val orderNo: String,
  val pickupLabel: String,
  val dropLabel: String,
  val pickupDistanceKm: String,
  val tripDistanceKm: String,
  val weightKg: String,
  val goodsType: String,
  val partnerEarnings: String,
  val offerExpiresAtMs: Long
)

object OrderOverlayController {
  private val handler = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var overlayView: View? = null
  private var countdownRunnable: Runnable? = null

  fun canDrawOverlays(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

  fun isAppForeground(context: Context): Boolean {
    val info = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(info)
    return info.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  fun show(context: Context, payload: OrderOverlayPayload, allowForeground: Boolean = false) {
    val overlayPermission = canDrawOverlays(context)
    val foreground = isAppForeground(context)
    Log.i("OrderOverlay", "show requested permission=$overlayPermission foreground=$foreground allowForeground=$allowForeground")
    if (!overlayPermission || (!allowForeground && foreground)) return
    handler.post {
      // We're already on the main thread. Calling hide() here posts another
      // runnable which could remove this newly-added card after it is attached.
      hideOnMainThread()
      val appContext = context.applicationContext
      val manager = appContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
      val card = createCard(appContext, payload)
      val screenWidth = appContext.resources.displayMetrics.widthPixels
      val params = WindowManager.LayoutParams(
        screenWidth - appContext.dp(20),
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION")
          WindowManager.LayoutParams.TYPE_PHONE
        },
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
        android.graphics.PixelFormat.TRANSLUCENT
      ).apply {
        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        y = appContext.statusBarHeight() + appContext.dp(10)
      }

      windowManager = manager
      overlayView = card
      try {
        manager.addView(card, params)
        Log.i("OrderOverlay", "sample/order card attached")
      } catch (error: Exception) {
        Log.e("OrderOverlay", "could not attach order card", error)
        return@post
      }
      card.translationY = -appContext.dp(360).toFloat()
      card.alpha = 0f
      card.animate().translationY(0f).alpha(1f).setDuration(260).start()
    }
  }

  fun hide() {
    handler.post { hideOnMainThread() }
  }

  private fun hideOnMainThread() {
    countdownRunnable?.let(handler::removeCallbacks)
    countdownRunnable = null
    val view = overlayView
    val manager = windowManager
    overlayView = null
    windowManager = null
    if (view != null && manager != null) {
      view.animate().cancel()
      view.animate().translationY(-view.height.toFloat()).alpha(0f).setDuration(180)
        .withEndAction { runCatching { manager.removeViewImmediate(view) } }
        .start()
    }
  }

  private fun createCard(context: Context, payload: OrderOverlayPayload): View {
    val green = Color.parseColor("#059669")
    val greenLight = Color.parseColor("#ECFDF5")
    val ink = Color.parseColor("#0F172A")
    val muted = Color.parseColor("#64748B")
    val line = Color.parseColor("#D1FAE5")

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(context.dp(16), context.dp(14), context.dp(16), context.dp(14))
      background = roundedBackground(Color.WHITE, context.dp(22).toFloat(), line, context.dp(1))
      elevation = context.dp(14).toFloat()
    }

    val header = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val icon = ImageView(context).apply {
      setImageResource(R.mipmap.ic_launcher)
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = roundedBackground(greenLight, context.dp(13).toFloat())
    }
    header.addView(icon, LinearLayout.LayoutParams(context.dp(44), context.dp(44)).apply {
      marginEnd = context.dp(11)
    })
    val headerCopy = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    headerCopy.addView(label(context, "New delivery request", 17f, ink, true))
    headerCopy.addView(label(context, "Order #${payload.orderNo}", 11f, muted, false))
    header.addView(headerCopy, LinearLayout.LayoutParams(0, WindowManager.LayoutParams.WRAP_CONTENT, 1f))
    val close = label(context, "×", 26f, muted, false).apply {
      gravity = Gravity.CENTER
      setOnClickListener { hide() }
    }
    header.addView(close, LinearLayout.LayoutParams(context.dp(38), context.dp(38)))
    card.addView(header)

    val countdown = label(context, "", 11f, green, true).apply {
      setPadding(0, context.dp(8), 0, context.dp(7))
    }
    card.addView(countdown)
    startCountdown(countdown, payload.offerExpiresAtMs)

    card.addView(routeRow(context, "PICKUP", payload.pickupLabel, green, ink, greenLight))
    card.addView(routeRow(context, "DROP", payload.dropLabel, Color.parseColor("#EF4444"), ink, Color.parseColor("#FEF2F2")))

    val chips = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, context.dp(9), 0, context.dp(9))
    }
    val chipValues = listOf(
      payload.pickupDistanceKm.takeIf { it.isNotBlank() }?.let { "$it km pickup" },
      payload.tripDistanceKm.takeIf { it.isNotBlank() }?.let { "$it km trip" },
      payload.weightKg.takeIf { it.isNotBlank() }?.let { "$it kg" }
    ).filterNotNull()
    chipValues.forEachIndexed { index, value ->
      chips.addView(chip(context, value, green, greenLight), LinearLayout.LayoutParams(0, context.dp(30), 1f).apply {
        if (index > 0) marginStart = context.dp(6)
      })
    }
    card.addView(chips)

    val earnings = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(context.dp(12), context.dp(10), context.dp(12), context.dp(10))
      background = roundedBackground(greenLight, context.dp(13).toFloat())
    }
    earnings.addView(label(context, payload.goodsType.ifBlank { "Delivery" }, 12f, muted, true), LinearLayout.LayoutParams(0, WindowManager.LayoutParams.WRAP_CONTENT, 1f))
    earnings.addView(label(context, "₹${payload.partnerEarnings}", 18f, green, true))
    card.addView(earnings)

    val actions = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, context.dp(12), 0, 0)
    }
    val skip = actionButton(context, "Skip", ink, Color.WHITE, Color.parseColor("#CBD5E1")).apply {
      // Keep the driver in whatever app is currently open. This dismisses the
      // outside-app offer card; it does not open the partner app.
      setOnClickListener { hide() }
    }
    val accept = actionButton(context, "Accept order", Color.WHITE, green, green).apply {
      setOnClickListener { openOrder(context, payload.orderId, "accept") }
    }
    actions.addView(skip, LinearLayout.LayoutParams(0, context.dp(48), 0.36f).apply { marginEnd = context.dp(8) })
    actions.addView(accept, LinearLayout.LayoutParams(0, context.dp(48), 0.64f))
    card.addView(actions)
    return SwipeToSkipFrame(context) { hide() }.apply {
      addView(card, FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      ))
    }
  }

  private class SwipeToSkipFrame(
    context: Context,
    private val onSwipeToSkip: () -> Unit
  ) : FrameLayout(context) {
    private var downX = 0f
    private var downY = 0f
    private var swipeDistance = 0f

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          swipeDistance = 0f
          return false
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (dx < -context.dp(18) && kotlin.math.abs(dx) > kotlin.math.abs(dy) * 1.2f) {
            swipeDistance = dx
            return true
          }
        }
      }
      return false
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
      when (event.actionMasked) {
        MotionEvent.ACTION_MOVE -> {
          swipeDistance = event.rawX - downX
          translationX = swipeDistance
          alpha = (1f - kotlin.math.abs(swipeDistance) / width.coerceAtLeast(1)).coerceAtLeast(0.35f)
          return true
        }
        MotionEvent.ACTION_UP -> {
          if (swipeDistance < -context.dp(96)) {
            onSwipeToSkip()
          } else {
            animate().translationX(0f).alpha(1f).setDuration(160).start()
          }
          return true
        }
        MotionEvent.ACTION_CANCEL -> {
          animate().translationX(0f).alpha(1f).setDuration(160).start()
          return true
        }
      }
      return true
    }
  }

  private fun startCountdown(view: TextView, expiresAtMs: Long) {
    val runnable = object : Runnable {
      override fun run() {
        val seconds = max(0, ((expiresAtMs - System.currentTimeMillis() + 999) / 1000).toInt())
        view.text = "Offer expires in ${seconds}s"
        if (seconds <= 0) hide() else handler.postDelayed(this, 1000)
      }
    }
    countdownRunnable = runnable
    handler.post(runnable)
  }

  private fun openOrder(context: Context, orderId: String, action: String) {
    hide()
    val uri = Uri.Builder()
      .scheme("indierypartner")
      .authority("order-offer")
      .appendQueryParameter("orderId", orderId)
      .appendQueryParameter("action", action)
      .build()
    context.startActivity(Intent(Intent.ACTION_VIEW, uri).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    })
  }

  private fun routeRow(context: Context, eyebrow: String, value: String, accent: Int, ink: Int, backgroundColor: Int): View {
    val row = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.TOP
      setPadding(context.dp(10), context.dp(9), context.dp(10), context.dp(9))
      background = roundedBackground(backgroundColor, context.dp(13).toFloat())
    }
    val dot = TextView(context).apply {
      text = "●"
      textSize = 15f
      setTextColor(accent)
      gravity = Gravity.TOP
    }
    row.addView(dot, LinearLayout.LayoutParams(context.dp(24), WindowManager.LayoutParams.WRAP_CONTENT))
    val copy = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    copy.addView(label(context, eyebrow, 9f, accent, true))
    copy.addView(label(context, value, 13f, ink, true).apply { maxLines = 2 })
    row.addView(copy, LinearLayout.LayoutParams(0, WindowManager.LayoutParams.WRAP_CONTENT, 1f))
    return row.apply {
      if (eyebrow == "DROP") (layoutParams as? LinearLayout.LayoutParams)?.topMargin = context.dp(6)
    }
  }

  private fun chip(context: Context, value: String, color: Int, backgroundColor: Int) =
    label(context, value, 10f, color, true).apply {
      gravity = Gravity.CENTER
      background = roundedBackground(backgroundColor, context.dp(10).toFloat())
    }

  private fun actionButton(context: Context, value: String, textColor: Int, backgroundColor: Int, borderColor: Int) =
    label(context, value, 13f, textColor, true).apply {
      gravity = Gravity.CENTER
      background = roundedBackground(backgroundColor, context.dp(14).toFloat(), borderColor, context.dp(1))
    }

  private fun label(context: Context, value: String, size: Float, color: Int, bold: Boolean) = TextView(context).apply {
    text = value
    textSize = size
    setTextColor(color)
    typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
  }

  private fun roundedBackground(color: Int, radius: Float, strokeColor: Int? = null, strokeWidth: Int = 0) =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = radius
      if (strokeColor != null && strokeWidth > 0) setStroke(strokeWidth, strokeColor)
    }

  private fun Context.dp(value: Int) = (value * resources.displayMetrics.density).roundToInt()

  private fun Context.statusBarHeight(): Int {
    val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
    return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else dp(24)
  }
}
