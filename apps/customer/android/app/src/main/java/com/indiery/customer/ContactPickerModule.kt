package com.indeiry

import android.app.Activity
import android.content.Intent
import android.provider.ContactsContract
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ContactPickerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingPromise: Promise? = null
  private val requestCode = 7642

  private val activityListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, code: Int, resultCode: Int, data: Intent?) {
      if (code != requestCode) return
      val promise = pendingPromise ?: return
      pendingPromise = null

      if (resultCode != Activity.RESULT_OK || data?.data == null) {
        promise.resolve(null)
        return
      }

      try {
        val uri = data.data ?: run {
          promise.resolve(null)
          return
        }
        context.contentResolver.query(
          uri,
          arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
          ),
          null,
          null,
          null
        )?.use { cursor ->
          if (!cursor.moveToFirst()) {
            promise.resolve(null)
            return
          }
          val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
          val phoneIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
          val result = Arguments.createMap().apply {
            putString("name", if (nameIndex >= 0) cursor.getString(nameIndex) ?: "" else "")
            putString("phone", if (phoneIndex >= 0) cursor.getString(phoneIndex) ?: "" else "")
          }
          promise.resolve(result)
        } ?: promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("CONTACT_PICK_FAILED", "Unable to read the selected contact", error)
      }
    }
  }

  init {
    context.addActivityEventListener(activityListener)
  }

  override fun getName(): String = "ContactPicker"

  @ReactMethod
  fun pickContact(promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("CONTACT_PICK_IN_PROGRESS", "A contact picker is already open")
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "The contact picker is not available right now")
      return
    }

    pendingPromise = promise
    try {
      val intent = Intent(
        Intent.ACTION_PICK,
        ContactsContract.CommonDataKinds.Phone.CONTENT_URI
      )
      activity.startActivityForResult(intent, requestCode)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("CONTACT_PICK_FAILED", "Unable to open contacts", error)
    }
  }
}
