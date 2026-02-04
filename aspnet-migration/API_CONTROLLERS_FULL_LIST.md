# Complete API Controller Inventory

This document lists ALL 48 API controllers that require migration to ASP.NET Core.

## API Controllers by Category

### Authentication & Security (8 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `AuthController.php` | `V2/AuthController.cs` | P0 | 13 |
| `RegistrationApiController.php` | `V2/Auth/RegistrationController.cs` | P0 | 1 |
| `PasswordResetApiController.php` | `V2/Auth/PasswordResetController.cs` | P1 | 2 |
| `EmailVerificationApiController.php` | `V2/Auth/EmailVerificationController.cs` | P1 | 2 |
| `TotpApiController.php` | `V2/Auth/TotpController.cs` | P2 | 2 |
| `WebAuthnApiController.php` | `V2/Auth/WebAuthnController.cs` | P2 | 9 |
| `CsrfController.php` | `V2/Auth/CsrfController.cs` | P0 | 1 |
| `PusherAuthController.php` | `V2/Auth/PusherAuthController.cs` | P2 | 2 |

### Core User Features (6 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `UsersApiController.php` | `V2/UsersController.cs` | P0 | 6 |
| `ConnectionsApiController.php` | `V2/ConnectionsController.cs` | P1 | 6 |
| `NotificationsApiController.php` | `V2/NotificationsController.cs` | P1 | 8 |
| `SearchApiController.php` | `V2/SearchController.cs` | P2 | 2 |
| `UploadController.php` | `V2/UploadsController.cs` | P1 | 1 |
| `LayoutApiController.php` | `V2/LayoutController.cs` | P3 | 3 |

### Listings & Marketplace (2 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `ListingsApiController.php` | `V2/ListingsController.cs` | P0 | 7 |
| `ReviewsApiController.php` | `V2/ReviewsController.cs` | P2 | 7 |

### Wallet & Transactions (1 controller)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `WalletApiController.php` | `V2/WalletController.cs` | P0 | 6 |

### Social & Feed (2 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `SocialApiController.php` | `V2/FeedController.cs` | P1 | 15 |
| `PollsApiController.php` | `V2/PollsController.cs` | P2 | 6 |

### Messaging (2 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `MessagesApiController.php` | `V2/MessagesController.cs` | P0 | 8 |
| `VoiceMessageController.php` | `V2/VoiceMessagesController.cs` | P3 | 2 |

### Groups & Events (4 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `GroupsApiController.php` | `V2/GroupsController.cs` | P1 | 20 |
| `EventsApiController.php` | `V2/EventsController.cs` | P1 | 10 |
| `EventApiController.php` (Legacy) | `V1/EventsController.cs` | P3 | 2 |
| `GroupRecommendationController.php` | `V2/Groups/RecommendationsController.cs` | P3 | 4 |

### Goals & Gamification (4 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `GoalsApiController.php` | `V2/GoalsController.cs` | P2 | 8 |
| `GoalApiController.php` (Legacy) | `V1/GoalsController.cs` | P3 | 3 |
| `GamificationV2ApiController.php` | `V2/GamificationController.cs` | P2 | 15 |
| `GamificationApiController.php` (Legacy) | `V1/GamificationController.cs` | P3 | 10 |

### Volunteering (1 controller)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `VolunteerApiController.php` | `V2/VolunteeringController.cs` | P2 | 25 |

### Push & Real-time (1 controller)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `PushApiController.php` | `V2/PushController.cs` | P2 | 8 |

### Federation (1 controller)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `FederationApiController.php` | `V2/FederationController.cs` | P3 | 12 |

### Compliance & Legal (3 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `GdprApiController.php` | `V2/GdprController.cs` | P2 | 3 |
| `CookieConsentController.php` | `V2/CookieConsentController.cs` | P2 | 6 |
| `LegalDocumentController.php` | `V2/LegalController.cs` | P3 | 3 |

### AI & Content Generation (5 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `AiChatController.php` | `V2/Ai/ChatController.cs` | P3 | 6 |
| `AiContentController.php` | `V2/Ai/ContentController.cs` | P3 | 5 |
| `AiAdminContentController.php` | `V2/Ai/AdminContentController.cs` | P3 | 3 |
| `AiProviderController.php` | `V2/Ai/ProvidersController.cs` | P3 | 3 |
| `BaseAiController.php` | Base class | N/A | 0 |

### Utility & Config (4 controllers)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `MenuApiController.php` | `V2/MenusController.cs` | P3 | 5 |
| `AppController.php` | `V2/AppController.cs` | P2 | 3 |
| `OpenApiController.php` | Built-in Swagger | N/A | N/A |
| `CoreApiController.php` (Legacy) | `V1/CoreController.cs` | P3 | 5 |

### Admin API (4 controllers - separate admin area)

| PHP Controller | ASP.NET Controller | Priority | Endpoints |
|----------------|-------------------|----------|-----------|
| `AdminController.php` | `Admin/SearchController.cs` | P3 | 1 |
| `PermissionApiController.php` | `Admin/PermissionsController.cs` | P3 | 15 |
| `PageController.php` | `Admin/PagesController.cs` | P3 | 4 |
| `OrgWalletController.php` | `Admin/OrgWalletController.cs` | P3 | 3 |

---

## Summary by Priority

| Priority | Controllers | Endpoints | Description |
|----------|-------------|-----------|-------------|
| **P0** | 6 | ~45 | Critical for mobile app & core functionality |
| **P1** | 6 | ~65 | Important user features |
| **P2** | 12 | ~100 | Secondary features |
| **P3** | 16 | ~90 | Legacy, admin, AI features |

**Total: 48 controllers, ~400 endpoints**

---

## Migration Order Recommendation

### Wave 1 (P0) - Weeks 3-8
1. `AuthController` - Login, logout, token refresh
2. `UsersApiController` - Profile management
3. `ListingsApiController` - Marketplace core
4. `WalletApiController` - Time credit transactions
5. `MessagesApiController` - Private messaging
6. `RegistrationApiController` - User registration

### Wave 2 (P1) - Weeks 9-14
1. `SocialApiController` - Feed and posts
2. `GroupsApiController` - Community groups
3. `EventsApiController` - Events and RSVPs
4. `NotificationsApiController` - Alerts
5. `ConnectionsApiController` - Friend system
6. `UploadController` - File uploads

### Wave 3 (P2) - Weeks 15-22
1. `GamificationV2ApiController` - XP, badges, leaderboards
2. `GoalsApiController` - Personal goals
3. `PollsApiController` - Polls
4. `VolunteerApiController` - Volunteering module
5. `ReviewsApiController` - Trust system
6. `PushApiController` - Push notifications
7. `SearchApiController` - Global search
8. `WebAuthnApiController` - Passkey auth
9. `TotpApiController` - 2FA
10. `GdprApiController` - Privacy compliance
11. `CookieConsentController` - Cookie management
12. `AppController` - Mobile app version checks

### Wave 4 (P3) - Weeks 23-28
1. All legacy V1 controllers
2. AI controllers
3. Admin API controllers
4. Federation API
5. Utility controllers

---

## Controller Template

```csharp
// Nexus.Api/Controllers/V2/ListingsController.cs
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Application.Features.Listings.Commands;
using Nexus.Application.Features.Listings.Queries;

namespace Nexus.Api.Controllers.V2;

[ApiController]
[ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/listings")]
[Authorize]
public class ListingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ListingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get paginated listings
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Index([FromQuery] GetListingsQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get single listing by ID
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Show(int id)
    {
        var result = await _mediator.Send(new GetListingByIdQuery(id));
        return Ok(result);
    }

    /// <summary>
    /// Create new listing
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Store([FromBody] CreateListingCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(Show), new { id = result.Data }, result);
    }

    /// <summary>
    /// Update listing
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateListingCommand command)
    {
        command = command with { Id = id };
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Delete listing
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Destroy(int id)
    {
        await _mediator.Send(new DeleteListingCommand(id));
        return NoContent();
    }

    /// <summary>
    /// Get nearby listings
    /// </summary>
    [HttpGet("nearby")]
    [AllowAnonymous]
    public async Task<IActionResult> Nearby([FromQuery] GetNearbyListingsQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Upload listing image
    /// </summary>
    [HttpPost("{id:int}/image")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file)
    {
        var result = await _mediator.Send(new UploadListingImageCommand(id, file));
        return Ok(result);
    }
}
```
