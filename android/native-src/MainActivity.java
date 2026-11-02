package com.techbroz.instaglass;

import android.annotation.TargetApi;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

/**
 * Private Insta Android shell (v1.5).
 * Adds a small native bridge for the privacy features:
 *  - fingerprint / face unlock for App Lock (Android BiometricPrompt, Android 9+). The phone keeps a random device key
 *    (made by the server) and hands it to the page only after a successful fingerprint; the server stores only its hash.
 *  - FLAG_SECURE: blocks screenshots + screen recording in locked chats, vanish chats, view-once, or everywhere if the user wants.
 */
public class MainActivity extends BridgeActivity {
    private static final String PREFS = "pi_lock";

    @Override
    protected void load() {
        // add the bridge BEFORE Capacitor loads the page, so window.PrivateInstaNative exists from the first page load
        try {
            WebView wv = findViewById(com.getcapacitor.android.R.id.webview);
            if (wv != null) wv.addJavascriptInterface(new NativeBridge(), "PrivateInstaNative");
        } catch (Exception ignored) { }
        super.load();
    }

    private SharedPreferences prefs() { return getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private void reply(final String cb, final boolean ok, final String payload) {
        final String js = "window['" + cb + "'] && window['" + cb + "'](" + ok + "," + JSONObject.quote(payload == null ? "" : payload) + ")";
        runOnUiThread(() -> { if (getBridge() != null) getBridge().getWebView().evaluateJavascript(js, null); });
    }

    @TargetApi(29)
    private boolean canAuthQ() {
        BiometricManager bm = getSystemService(BiometricManager.class);
        if (bm == null) return false;
        if (Build.VERSION.SDK_INT >= 30) return bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
        return bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
    }

    @TargetApi(28)
    private void showPrompt(final String cb) {
        BiometricPrompt prompt = new BiometricPrompt.Builder(this)
            .setTitle("Unlock Private Insta")
            .setSubtitle("Use your fingerprint")
            .setNegativeButton("Use PIN", getMainExecutor(), (dialog, which) -> reply(cb, false, "Use your PIN"))
            .build();
        prompt.authenticate(new CancellationSignal(), getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
            @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                reply(cb, true, prefs().getString("key", ""));
            }
            @Override public void onAuthenticationError(int code, CharSequence msg) {
                reply(cb, false, msg == null ? "Fingerprint cancelled" : msg.toString());
            }
        });
    }

    public class NativeBridge {
        @JavascriptInterface public boolean isBiometricAvailable() {
            if (Build.VERSION.SDK_INT < 28) return false;
            if (Build.VERSION.SDK_INT >= 29) return canAuthQ();
            return getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT);
        }
        @JavascriptInterface public boolean hasKey() { return prefs().contains("key"); }
        @JavascriptInterface public void saveKey(String json) { prefs().edit().putString("key", json == null ? "" : json).apply(); }
        @JavascriptInterface public void clearKey() { prefs().edit().remove("key").apply(); }
        @JavascriptInterface public String peekId() {
            try { return new JSONObject().put("deviceId", new JSONObject(prefs().getString("key", "{}")).optString("deviceId")).toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void setSecure(final boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            });
        }
        @JavascriptInterface public void authenticate(final String cb) {
            if (cb == null || !cb.matches("[A-Za-z0-9_]{1,40}")) return;
            if (!prefs().contains("key")) { reply(cb, false, "Fingerprint unlock is not set up on this phone"); return; }
            if (Build.VERSION.SDK_INT < 28) { reply(cb, false, "Fingerprint needs Android 9 or newer"); return; }
            runOnUiThread(() -> showPrompt(cb));
        }
    }
}
