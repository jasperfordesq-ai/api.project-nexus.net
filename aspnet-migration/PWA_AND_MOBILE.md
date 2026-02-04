# PWA, Service Worker & Capacitor Mobile App

## 1. Progressive Web App (PWA)

### Manifest Configuration

**File**: `httpdocs/manifest.json`

```json
{
  "name": "Project NEXUS",
  "short_name": "NEXUS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "shortcuts": [...],
  "share_target": {...}
}
```

### Service Worker Implementation

**File**: `httpdocs/sw.js` (~300 lines)

#### Cache Strategies

```javascript
// Cache version - increment on deploy
const CACHE_VERSION = 'nexus-v26';

// Three caching strategies implemented:

// 1. Cache-First (static assets)
const CACHE_FIRST_ASSETS = [
  '/assets/css/design-tokens.min.css',
  '/assets/css/nexus-core.min.css',
  '/assets/js/nexus-core.min.js',
  '/assets/icons/'
];

// 2. Network-First (API calls, dynamic content)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/feed/,
  /\/notifications/
];

// 3. Stale-While-Revalidate (images, avatars)
const STALE_REVALIDATE_PATTERNS = [
  /\/uploads\//,
  /\/avatars\//
];
```

#### Offline Support

```javascript
// Offline page served when network unavailable
const OFFLINE_PAGE = '/offline.html';
const FEDERATION_OFFLINE_PAGE = '/federation-offline.html';

// Navigation request handling
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_PAGE))
    );
  }
});
```

#### Precaching

```javascript
// Assets precached on SW install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/assets/css/design-tokens.min.css',
  '/assets/css/nexus-core.min.css',
  '/assets/js/nexus-core.min.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});
```

### ASP.NET Core Implementation

```csharp
// Program.cs - Serve PWA files
app.UseStaticFiles();

// Manifest endpoint
app.MapGet("/manifest.json", async context =>
{
    var tenant = context.RequestServices.GetRequiredService<ICurrentTenantService>();
    var manifest = new
    {
        name = tenant.GetSetting<string>("site_name") ?? "Project NEXUS",
        short_name = "NEXUS",
        start_url = "/",
        display = "standalone",
        background_color = "#ffffff",
        theme_color = tenant.GetSetting<string>("primary_color") ?? "#6366f1",
        icons = new[]
        {
            new { src = "/assets/icons/icon-192.png", sizes = "192x192", type = "image/png" },
            new { src = "/assets/icons/icon-512.png", sizes = "512x512", type = "image/png" }
        }
    };
    context.Response.ContentType = "application/manifest+json";
    await context.Response.WriteAsJsonAsync(manifest);
});

// Service Worker with cache busting
app.MapGet("/sw.js", async context =>
{
    var version = Configuration["App:Version"] ?? "1";
    var swContent = await File.ReadAllTextAsync("wwwroot/sw.js");
    swContent = swContent.Replace("{{VERSION}}", version);
    context.Response.ContentType = "application/javascript";
    await context.Response.WriteAsync(swContent);
});
```

---

## 2. Capacitor Mobile App

### Configuration

**File**: `capacitor/capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ie.projectnexus.app',
  appName: 'Project NEXUS',
  webDir: '../httpdocs',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'project-nexus.ie'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  }
};

export default config;
```

### Native Bridge Detection

```javascript
// Detect if running in Capacitor
const isCapacitor = () => {
  return window.Capacitor !== undefined;
};

const isMobileApp = () => {
  return isCapacitor() ||
         navigator.userAgent.includes('nexus-mobile') ||
         navigator.userAgent.includes('Capacitor');
};

// Platform-specific headers for API calls
const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (isCapacitor()) {
    headers['X-Capacitor-App'] = 'true';
    headers['X-Nexus-Mobile'] = 'true';
  }
  return headers;
};
```

### Deep Linking

```typescript
// Android: android/app/src/main/AndroidManifest.xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="project-nexus.ie" />
  <data android:scheme="nexus" android:host="app" />
</intent-filter>

// iOS: ios/App/App/Info.plist
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>nexus</string>
    </array>
  </dict>
</array>
```

### ASP.NET Core Mobile Detection

```csharp
public class MobileDetectionService : IMobileDetectionService
{
    public bool IsMobileApp(HttpContext context)
    {
        var userAgent = context.Request.Headers.UserAgent.ToString();
        var hasCapacitorHeader = context.Request.Headers.ContainsKey("X-Capacitor-App");
        var hasMobileHeader = context.Request.Headers.ContainsKey("X-Nexus-Mobile");

        return hasCapacitorHeader ||
               hasMobileHeader ||
               userAgent.Contains("Capacitor") ||
               userAgent.Contains("nexus-mobile");
    }

    public string GetPlatform(HttpContext context)
    {
        var userAgent = context.Request.Headers.UserAgent.ToString();

        if (userAgent.Contains("Android")) return "android";
        if (userAgent.Contains("iPhone") || userAgent.Contains("iPad")) return "ios";
        return "web";
    }
}
```

---

## 3. App Version Checking

### PHP Implementation

**File**: `src/Controllers/Api/AppController.php`

```php
public function checkVersion()
{
    $currentVersion = $_POST['version'] ?? '0.0.0';
    $platform = $_POST['platform'] ?? 'android';

    $minVersion = $this->getMinVersion($platform);
    $latestVersion = $this->getLatestVersion($platform);

    $needsUpdate = version_compare($currentVersion, $minVersion, '<');
    $updateAvailable = version_compare($currentVersion, $latestVersion, '<');

    return $this->jsonResponse([
        'needs_update' => $needsUpdate,
        'force_update' => $needsUpdate,
        'update_available' => $updateAvailable,
        'latest_version' => $latestVersion,
        'min_version' => $minVersion,
        'update_url' => $this->getStoreUrl($platform)
    ]);
}
```

### ASP.NET Core Implementation

```csharp
[ApiController]
[Route("api/app")]
public class AppController : ControllerBase
{
    private readonly IConfiguration _config;

    [HttpPost("check-version")]
    public IActionResult CheckVersion([FromBody] VersionCheckRequest request)
    {
        var minVersion = _config[$"App:MinVersion:{request.Platform}"] ?? "1.0.0";
        var latestVersion = _config[$"App:LatestVersion:{request.Platform}"] ?? "1.0.0";

        var needsUpdate = CompareVersions(request.Version, minVersion) < 0;
        var updateAvailable = CompareVersions(request.Version, latestVersion) < 0;

        return Ok(new
        {
            needs_update = needsUpdate,
            force_update = needsUpdate,
            update_available = updateAvailable,
            latest_version = latestVersion,
            min_version = minVersion,
            update_url = GetStoreUrl(request.Platform)
        });
    }

    private int CompareVersions(string v1, string v2)
    {
        var parts1 = v1.Split('.').Select(int.Parse).ToArray();
        var parts2 = v2.Split('.').Select(int.Parse).ToArray();

        for (int i = 0; i < Math.Max(parts1.Length, parts2.Length); i++)
        {
            var p1 = i < parts1.Length ? parts1[i] : 0;
            var p2 = i < parts2.Length ? parts2[i] : 0;
            if (p1 != p2) return p1.CompareTo(p2);
        }
        return 0;
    }

    private string GetStoreUrl(string platform) => platform switch
    {
        "android" => "https://play.google.com/store/apps/details?id=ie.projectnexus.app",
        "ios" => "https://apps.apple.com/app/project-nexus/id123456789",
        _ => "https://project-nexus.ie"
    };
}

public record VersionCheckRequest(string Version, string Platform);
```

---

## 4. Push Notification Registration

### Mobile Push Token Flow

```javascript
// In Capacitor app
import { PushNotifications } from '@capacitor/push-notifications';

// Request permission and get token
const registerPush = async () => {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }
};

// Listen for token
PushNotifications.addListener('registration', async (token) => {
  // Send token to backend
  await fetch('/api/push/register-device', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      token: token.value,
      platform: Capacitor.getPlatform()
    })
  });
});
```

### ASP.NET Core Device Registration

```csharp
[HttpPost("register-device")]
[Authorize]
public async Task<IActionResult> RegisterDevice([FromBody] DeviceRegistrationRequest request)
{
    var userId = User.GetUserId();

    // Remove old tokens for this user/platform
    await _context.DeviceTokens
        .Where(d => d.UserId == userId && d.Platform == request.Platform)
        .ExecuteDeleteAsync();

    // Add new token
    var deviceToken = new DeviceToken
    {
        UserId = userId,
        Token = request.Token,
        Platform = request.Platform,
        CreatedAt = DateTime.UtcNow
    };

    _context.DeviceTokens.Add(deviceToken);
    await _context.SaveChangesAsync();

    return Ok(new { success = true });
}
```

---

## 5. Migration Checklist

### PWA Migration

- [ ] Copy `manifest.json` to `wwwroot/`
- [ ] Copy `sw.js` to `wwwroot/`
- [ ] Update cache version on each deploy
- [ ] Configure offline page
- [ ] Test precaching works
- [ ] Verify push notification subscription

### Capacitor Migration

- [ ] Keep Capacitor config compatible with new backend
- [ ] Update `server.hostname` if URL changes
- [ ] Test deep linking still works
- [ ] Verify native plugin functionality
- [ ] Update API base URL in app config
- [ ] Test version checking endpoint
- [ ] Verify push token registration
