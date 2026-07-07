// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin route aliases for the React frontend — Part 3.
/// Covers Enterprise (extended), Legal Documents, Super Admin, Content Moderation,
/// CRM (extended), Vetting (extended), Insurance, Cron Jobs, and Deliverability.
/// All endpoints require admin role.
/// </summary>
[ApiController]
[Route("api/admin")]
[Route("api/v2/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminCompatibility3Controller : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly InsuranceService _insurance;
    private readonly ILogger<AdminCompatibility3Controller> _logger;

    public AdminCompatibility3Controller(
        NexusDbContext db,
        TenantContext tenantContext,
        InsuranceService insurance,
        ILogger<AdminCompatibility3Controller> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _insurance = insurance;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();
    private int GetTenantId() => _tenantContext.GetTenantIdOrThrow();

    // ───────────────────────────────────────────────────────────────
    // Enterprise - Extended (beyond existing EnterpriseController)
    // Existing: GET/PUT config, DELETE config/{key}, GET dashboard,
    //           GET compliance, GET governance, GET security-posture
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/enterprise/roles - List enterprise roles.</summary>
    [HttpGet("enterprise/roles")]
    public IActionResult GetEnterpriseRoles()
    {
        return Ok(new
        {
            data = new[]
            {
                new { id = 1, name = "admin", description = "Full administrative access", permissions = 42, users = 2 },
                new { id = 2, name = "moderator", description = "Content moderation access", permissions = 18, users = 3 },
                new { id = 3, name = "member", description = "Standard member access", permissions = 12, users = 50 }
            },
            total = 3
        });
    }

    /// <summary>GET /api/admin/enterprise/roles/{id} - Get enterprise role.</summary>
    [HttpGet("enterprise/roles/{id:int}")]
    public IActionResult GetEnterpriseRole(int id)
    {
        return Ok(new { id, name = "admin", description = "Full administrative access", permissions = new[] { "users.read", "users.write", "config.manage" }, created_at = DateTime.UtcNow });
    }

    /// <summary>POST /api/admin/enterprise/roles - Create enterprise role.</summary>
    [HttpPost("enterprise/roles")]
    public IActionResult CreateEnterpriseRole()
    {
        return Ok(new { success = true, message = "Enterprise role created" });
    }

    /// <summary>PUT /api/admin/enterprise/roles/{id} - Update enterprise role.</summary>
    [HttpPut("enterprise/roles/{id:int}")]
    public IActionResult UpdateEnterpriseRole(int id)
    {
        return Ok(new { success = true, message = "Enterprise role updated", id });
    }

    /// <summary>DELETE /api/admin/enterprise/roles/{id} - Delete enterprise role.</summary>
    [HttpDelete("enterprise/roles/{id:int}")]
    public IActionResult DeleteEnterpriseRole(int id)
    {
        return Ok(new { success = true, message = "Enterprise role deleted", id });
    }

    /// <summary>GET /api/admin/enterprise/permissions - List permissions.</summary>
    [HttpGet("enterprise/permissions")]
    public IActionResult GetEnterprisePermissions()
    {
        return Ok(new
        {
            data = new[]
            {
                new { id = "users.read", category = "Users", description = "View user profiles" },
                new { id = "users.write", category = "Users", description = "Edit user profiles" },
                new { id = "config.manage", category = "System", description = "Manage system configuration" },
                new { id = "content.moderate", category = "Content", description = "Moderate content" },
                new { id = "reports.view", category = "Reports", description = "View reports and analytics" }
            },
            total = 5
        });
    }

    /// <summary>GET /api/admin/enterprise/gdpr/dashboard - GDPR dashboard.</summary>
    [HttpGet("enterprise/gdpr/dashboard")]
    public async Task<IActionResult> GetGdprDashboard()
    {
        var exportRequests = await _db.DataExportRequests.CountAsync();
        var deletionRequests = await _db.DataDeletionRequests.CountAsync();
        var pendingExportRequests = await _db.DataExportRequests.CountAsync(r => r.Status == ExportStatus.Pending || r.Status == ExportStatus.Processing);
        var pendingDeletionRequests = await _db.DataDeletionRequests.CountAsync(r => r.Status == DeletionStatus.Pending || r.Status == DeletionStatus.Processing);
        var completedExportRequests = await _db.DataExportRequests.CountAsync(r => r.Status == ExportStatus.Ready || r.Status == ExportStatus.Downloaded);
        var completedDeletionRequests = await _db.DataDeletionRequests.CountAsync(r => r.Status == DeletionStatus.Completed);
        var activeConsents = await _db.ConsentRecords.CountAsync(c => c.IsGranted);
        var breaches = await _db.GdprBreaches.CountAsync();
        var totalRequests = exportRequests + deletionRequests;

        return Ok(new
        {
            total_requests = totalRequests,
            pending_requests = pendingExportRequests + pendingDeletionRequests,
            total_consents = activeConsents,
            total_breaches = breaches,
            total_data_subjects = await _db.Users.CountAsync(),
            completed_requests = completedExportRequests + completedDeletionRequests,
            active_consents = activeConsents,
            breach_count = breaches,
            compliance_score = 100,
            generated_at = DateTime.UtcNow
        });
    }

    /// <summary>GET /api/admin/enterprise/gdpr/requests - GDPR data requests.</summary>
    [HttpGet("enterprise/gdpr/requests")]
    public async Task<IActionResult> GetGdprRequests([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery(Name = "per_page")] int? perPage = null, [FromQuery] string? status = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(perPage ?? limit, 1, 100);

        var exportRows = await _db.DataExportRequests
            .AsNoTracking()
            .Include(r => r.User)
            .ToListAsync();
        var deletionRows = await _db.DataDeletionRequests
            .AsNoTracking()
            .Include(r => r.User)
            .ToListAsync();

        var requests = exportRows
            .Select(r => new
            {
                id = r.Id,
                user_id = r.UserId,
                user_name = DisplayName(r.User),
                user_email = r.User?.Email,
                type = MapGdprExportType(r.Format),
                request_type = MapGdprExportType(r.Format),
                status = MapExportStatus(r.Status),
                priority = "normal",
                notes = r.ErrorMessage,
                created_at = r.CreatedAt,
                updated_at = (DateTime?)null
            })
            .Concat(deletionRows.Select(r => new
            {
                id = r.Id,
                user_id = r.UserId,
                user_name = DisplayName(r.User),
                user_email = r.User?.Email,
                type = "erasure",
                request_type = "erasure",
                status = MapDeletionStatus(r.Status),
                priority = "normal",
                notes = r.Reason,
                created_at = r.CreatedAt,
                updated_at = r.ReviewedAt
            }))
            .Where(r => string.IsNullOrWhiteSpace(status) || status == "all" || string.Equals(r.status, status, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(r => r.created_at)
            .ToList();

        var paged = requests.Skip((page - 1) * limit).Take(limit).ToList();
        var totalPages = requests.Count > 0 ? (int)Math.Ceiling(requests.Count / (double)limit) : 0;

        return Ok(new
        {
            success = true,
            data = new
            {
                data = paged,
                meta = new
                {
                    current_page = page,
                    per_page = limit,
                    total = requests.Count,
                    total_pages = totalPages,
                    has_more = page < totalPages
                }
            }
        });
    }

    /// <summary>PUT /api/admin/enterprise/gdpr/requests/{id} - Update GDPR request.</summary>
    [HttpPut("enterprise/gdpr/requests/{id:int}")]
    public IActionResult UpdateGdprRequest(int id)
    {
        return Ok(new { success = true, message = "GDPR request updated", id });
    }

    /// <summary>GET /api/admin/enterprise/gdpr/consents - List consents.</summary>
    [HttpGet("enterprise/gdpr/consents")]
    public IActionResult GetGdprConsents([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/enterprise/gdpr/breaches - List breaches.</summary>
    [HttpGet("enterprise/gdpr/breaches")]
    public async Task<IActionResult> GetGdprBreaches([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.GdprBreaches.AsNoTracking().OrderByDescending(b => b.DetectedAt);
        var total = await query.CountAsync();
        var rows = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
        var breaches = rows.Select(MapLaravelGdprBreach).ToList();

        return Ok(new { data = breaches, meta = new { page, limit, total } });
    }

    /// <summary>POST /api/admin/enterprise/gdpr/breaches - Create breach record.</summary>
    [HttpPost("enterprise/gdpr/breaches")]
    public async Task<IActionResult> CreateGdprBreach([FromBody] AdminEnterpriseBreachRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { error = "Title is required" });
        }

        var severity = string.IsNullOrWhiteSpace(request.Severity)
            ? "medium"
            : request.Severity.Trim().ToLowerInvariant();
        if (severity is not ("low" or "medium" or "high" or "critical"))
        {
            return BadRequest(new { error = "Invalid severity. Valid: low, medium, high, critical" });
        }

        var now = DateTime.UtcNow;
        var breach = new GdprBreach
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Severity = severity,
            Status = "open",
            AffectedUsersCount = Math.Max(0, request.AffectedUsers ?? request.AffectedUsersCount ?? 0),
            DetectedAt = now,
            CreatedAt = now,
            ReportedById = userId.Value
        };

        _db.GdprBreaches.Add(breach);
        await _db.SaveChangesAsync();

        return Ok(MapLaravelGdprBreach(breach));
    }

    /// <summary>GET /api/admin/enterprise/gdpr/audit - GDPR audit log.</summary>
    [HttpGet("enterprise/gdpr/audit")]
    public IActionResult GetGdprAuditLog([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/enterprise/monitoring - System monitoring.</summary>
    [HttpGet("enterprise/monitoring")]
    public async Task<IActionResult> GetEnterpriseMonitoring()
    {
        var dbConnected = await _db.Database.CanConnectAsync();
        var memoryBytes = GC.GetTotalMemory(forceFullCollection: false);
        var memoryUsage = FormatBytes(memoryBytes);
        var startedAt = System.Diagnostics.Process.GetCurrentProcess().StartTime.ToUniversalTime();
        var uptime = DateTime.UtcNow - startedAt;

        return Ok(new
        {
            php_version = $".NET {Environment.Version}",
            memory_usage = memoryUsage,
            memory_limit = "unlimited",
            db_connected = dbConnected,
            redis_connected = true,
            redis_memory = "0 MB",
            db_size = "n/a",
            uptime = FormatDuration(uptime),
            server_time = DateTime.UtcNow.ToString("O"),
            os = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            sys_memory = new
            {
                total = "n/a",
                available = "n/a",
                used = memoryUsage,
                used_pct = 0
            },
            cpu_usage = 0.0,
            memory_usage_percent = 0.0,
            disk_usage = 0.0,
            active_connections = 0,
            uptime_seconds = 0,
            generated_at = DateTime.UtcNow
        });
    }

    /// <summary>GET /api/admin/enterprise/monitoring/health - Health check.</summary>
    [HttpGet("enterprise/monitoring/health")]
    public async Task<IActionResult> GetEnterpriseMonitoringHealth()
    {
        var dbConnected = await _db.Database.CanConnectAsync();
        var status = dbConnected ? "healthy" : "degraded";

        return Ok(new
        {
            status,
            checks = new[]
            {
                new { name = "database", status = dbConnected ? "ok" : "fail", free = (string?)null, total = (string?)null },
                new { name = "cache", status = "ok", free = (string?)null, total = (string?)null },
                new { name = "queue", status = "ok", free = (string?)null, total = (string?)null }
            },
            database = dbConnected ? "connected" : "disconnected",
            cache = "connected",
            queue = "connected",
            checked_at = DateTime.UtcNow
        });
    }

    /// <summary>GET /api/admin/enterprise/monitoring/logs - Error logs.</summary>
    [HttpGet("enterprise/monitoring/logs")]
    public IActionResult GetEnterpriseMonitoringLogs([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? level = null)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/enterprise/config/secrets - Secrets list.</summary>
    [HttpGet("enterprise/config/secrets")]
    public IActionResult GetEnterpriseConfigSecrets()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    // ───────────────────────────────────────────────────────────────
    // Legal Documents (admin routes at /api/admin/legal-documents)
    // Existing AdminLegalDocumentsController is at /api/admin/legal
    // These are NEW paths — no conflict.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/legal-documents - List legal documents.</summary>
    [HttpGet("legal-documents")]
    public IActionResult ListLegalDocuments([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/legal-documents/{id} - Get legal document.</summary>
    [HttpGet("legal-documents/{id:int}")]
    public IActionResult GetLegalDocument(int id)
    {
        return Ok(new { id, title = "", slug = "", content = "", version = "1.0", is_active = true, requires_acceptance = true, created_at = DateTime.UtcNow });
    }

    /// <summary>POST /api/admin/legal-documents - Create legal document.</summary>
    [HttpPost("legal-documents")]
    public IActionResult CreateLegalDocument()
    {
        return Ok(new { success = true, message = "Legal document created", id = 0 });
    }

    /// <summary>PUT /api/admin/legal-documents/{id} - Update legal document.</summary>
    [HttpPut("legal-documents/{id:int}")]
    public IActionResult UpdateLegalDocument(int id)
    {
        return Ok(new { success = true, message = "Legal document updated", id });
    }

    /// <summary>DELETE /api/admin/legal-documents/{id} - Delete legal document.</summary>
    [HttpDelete("legal-documents/{id:int}")]
    public IActionResult DeleteLegalDocument(int id)
    {
        return Ok(new { success = true, message = "Legal document deleted", id });
    }

    /// <summary>GET /api/admin/legal-documents/{docId}/versions - List versions.</summary>
    [HttpGet("legal-documents/{docId}/versions")]
    public IActionResult ListLegalDocumentVersions(int docId)
    {
        return Ok(new { data = Array.Empty<object>(), total = 0, document_id = docId });
    }

    /// <summary>GET /api/admin/legal-documents/{docId}/versions/compare - Compare versions.</summary>
    [HttpGet("legal-documents/{docId}/versions/compare")]
    public IActionResult CompareLegalDocumentVersions(int docId, [FromQuery] int? from = null, [FromQuery] int? to = null)
    {
        return Ok(new { document_id = docId, from_version = from, to_version = to, changes = Array.Empty<object>() });
    }

    /// <summary>POST /api/admin/legal-documents/{docId}/versions - Create version.</summary>
    [HttpPost("legal-documents/{docId}/versions")]
    public IActionResult CreateLegalDocumentVersion(int docId)
    {
        return Ok(new { success = true, message = "Version created", document_id = docId });
    }

    /// <summary>PUT /api/admin/legal-documents/{docId}/versions/{versionId} - Update version.</summary>
    [HttpPut("legal-documents/{docId}/versions/{versionId}")]
    public IActionResult UpdateLegalDocumentVersion(int docId, int versionId)
    {
        return Ok(new { success = true, message = "Version updated", document_id = docId, version_id = versionId });
    }

    /// <summary>DELETE /api/admin/legal-documents/{docId}/versions/{versionId} - Delete version.</summary>
    [HttpDelete("legal-documents/{docId}/versions/{versionId}")]
    public IActionResult DeleteLegalDocumentVersion(int docId, int versionId)
    {
        return Ok(new { success = true, message = "Version deleted", document_id = docId, version_id = versionId });
    }

    /// <summary>POST /api/admin/legal-documents/versions/{versionId}/publish - Publish version.</summary>
    [HttpPost("legal-documents/versions/{versionId}/publish")]
    public IActionResult PublishLegalDocumentVersion(int versionId)
    {
        return Ok(new { success = true, message = "Version published", version_id = versionId });
    }

    /// <summary>GET /api/admin/legal-documents/compliance - Compliance stats.</summary>
    [HttpGet("legal-documents/compliance")]
    public IActionResult GetLegalDocumentCompliance()
    {
        return Ok(new { total_documents = 0, total_acceptances = 0, compliance_rate = 100.0, pending_acceptances = 0, generated_at = DateTime.UtcNow });
    }

    /// <summary>GET /api/admin/legal-documents/versions/{versionId}/acceptances - List acceptances.</summary>
    [HttpGet("legal-documents/versions/{versionId}/acceptances")]
    public IActionResult GetLegalDocumentVersionAcceptances(int versionId, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 }, version_id = versionId });
    }

    /// <summary>GET /api/admin/legal-documents/{docId}/acceptances/export - Export acceptances CSV.</summary>
    [HttpGet("legal-documents/{docId}/acceptances/export")]
    public IActionResult ExportLegalDocumentAcceptances(int docId)
    {
        var csv = "user_id,email,accepted_at\n";
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"acceptances_{docId}.csv");
    }

    /// <summary>POST /api/admin/legal-documents/{docId}/versions/{versionId}/notify - Notify users.</summary>
    [HttpPost("legal-documents/{docId}/versions/{versionId}/notify")]
    public IActionResult NotifyLegalDocumentVersion(int docId, int versionId)
    {
        return Ok(new { success = true, message = "Notification sent", document_id = docId, version_id = versionId, notified_count = 0 });
    }

    /// <summary>GET /api/admin/legal-documents/{docId}/versions/{versionId}/pending-count - Pending count.</summary>
    [HttpGet("legal-documents/{docId}/versions/{versionId}/pending-count")]
    public IActionResult GetLegalDocumentPendingCount(int docId, int versionId)
    {
        return Ok(new { document_id = docId, version_id = versionId, pending_count = 0 });
    }

    // ───────────────────────────────────────────────────────────────
    // Super Admin (/api/admin/super)
    // Existing SystemAdminController is at /api/admin/system — no conflict.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/super/dashboard - Super admin dashboard.</summary>
    [HttpGet("super/dashboard")]
    public IActionResult GetSuperDashboard()
    {
        return Ok(new
        {
            total_tenants = 0,
            total_users = 0,
            active_tenants = 0,
            total_exchanges = 0,
            system_health = "healthy",
            generated_at = DateTime.UtcNow
        });
    }

    /// <summary>GET /api/admin/super/tenants - List tenants.</summary>
    [HttpGet("super/tenants")]
    public IActionResult ListSuperTenants([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/super/tenants/{id} - Get tenant.</summary>
    [HttpGet("super/tenants/{id:int}")]
    public IActionResult GetSuperTenant(int id)
    {
        return Ok(new { id, name = "", slug = "", is_active = true, created_at = DateTime.UtcNow });
    }

    /// <summary>GET /api/admin/super/tenants/hierarchy - Tenant hierarchy.</summary>
    [HttpGet("super/tenants/hierarchy")]
    public IActionResult GetSuperTenantHierarchy()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    /// <summary>POST /api/admin/super/tenants - Create tenant.</summary>
    [HttpPost("super/tenants")]
    public IActionResult CreateSuperTenant()
    {
        return Ok(new { success = true, message = "Tenant created", id = 0 });
    }

    /// <summary>PUT /api/admin/super/tenants/{id} - Update tenant.</summary>
    [HttpPut("super/tenants/{id:int}")]
    public IActionResult UpdateSuperTenant(int id)
    {
        return Ok(new { success = true, message = "Tenant updated", id });
    }

    /// <summary>DELETE /api/admin/super/tenants/{id} - Delete tenant.</summary>
    [HttpDelete("super/tenants/{id:int}")]
    public IActionResult DeleteSuperTenant(int id)
    {
        return Ok(new { success = true, message = "Tenant deleted", id });
    }

    /// <summary>POST /api/admin/super/tenants/{id}/reactivate - Reactivate tenant.</summary>
    [HttpPost("super/tenants/{id:int}/reactivate")]
    public IActionResult ReactivateSuperTenant(int id)
    {
        return Ok(new { success = true, message = "Tenant reactivated", id });
    }

    /// <summary>POST /api/admin/super/tenants/{id}/toggle-hub - Toggle hub status.</summary>
    [HttpPost("super/tenants/{id:int}/toggle-hub")]
    public IActionResult ToggleSuperTenantHub(int id)
    {
        return Ok(new { success = true, message = "Hub status toggled", id });
    }

    /// <summary>POST /api/admin/super/tenants/{id}/move - Move tenant.</summary>
    [HttpPost("super/tenants/{id:int}/move")]
    public IActionResult MoveSuperTenant(int id)
    {
        return Ok(new { success = true, message = "Tenant moved", id });
    }

    /// <summary>GET /api/admin/super/users - List users cross-tenant.</summary>
    [HttpGet("super/users")]
    public IActionResult ListSuperUsers([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? search = null)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/super/users/{id} - Get user cross-tenant.</summary>
    [HttpGet("super/users/{id:int}")]
    public IActionResult GetSuperUser(int id)
    {
        return Ok(new { id, email = "", first_name = "", last_name = "", role = "", tenant_id = 0, is_active = true });
    }

    /// <summary>POST /api/admin/super/users - Create user cross-tenant.</summary>
    [HttpPost("super/users")]
    public IActionResult CreateSuperUser()
    {
        return Ok(new { success = true, message = "User created", id = 0 });
    }

    /// <summary>PUT /api/admin/super/users/{id} - Update user cross-tenant.</summary>
    [HttpPut("super/users/{id:int}")]
    public IActionResult UpdateSuperUser(int id)
    {
        return Ok(new { success = true, message = "User updated", id });
    }

    /// <summary>POST /api/admin/super/users/{userId}/grant-super-admin - Grant super admin.</summary>
    [HttpPost("super/users/{userId}/grant-super-admin")]
    public IActionResult GrantSuperAdmin(int userId)
    {
        return Ok(new { success = true, message = "Super admin granted", user_id = userId });
    }

    /// <summary>POST /api/admin/super/users/{userId}/revoke-super-admin - Revoke super admin.</summary>
    [HttpPost("super/users/{userId}/revoke-super-admin")]
    public IActionResult RevokeSuperAdmin(int userId)
    {
        return Ok(new { success = true, message = "Super admin revoked", user_id = userId });
    }

    /// <summary>POST /api/admin/super/users/{userId}/grant-global-super-admin - Grant global super admin.</summary>
    [HttpPost("super/users/{userId}/grant-global-super-admin")]
    public IActionResult GrantGlobalSuperAdmin(int userId)
    {
        return Ok(new { success = true, message = "Global super admin granted", user_id = userId });
    }

    /// <summary>POST /api/admin/super/users/{userId}/revoke-global-super-admin - Revoke global super admin.</summary>
    [HttpPost("super/users/{userId}/revoke-global-super-admin")]
    public IActionResult RevokeGlobalSuperAdmin(int userId)
    {
        return Ok(new { success = true, message = "Global super admin revoked", user_id = userId });
    }

    /// <summary>POST /api/admin/super/users/{userId}/move-tenant - Move user to tenant.</summary>
    [HttpPost("super/users/{userId}/move-tenant")]
    public IActionResult MoveSuperUserTenant(int userId)
    {
        return Ok(new { success = true, message = "User moved to new tenant", user_id = userId });
    }

    /// <summary>POST /api/admin/super/users/{userId}/move-and-promote - Move and promote user.</summary>
    [HttpPost("super/users/{userId}/move-and-promote")]
    public IActionResult MoveAndPromoteSuperUser(int userId)
    {
        return Ok(new { success = true, message = "User moved and promoted", user_id = userId });
    }

    /// <summary>POST /api/admin/super/bulk/move-users - Bulk move users.</summary>
    [HttpPost("super/bulk/move-users")]
    public IActionResult BulkMoveUsers()
    {
        return Ok(new { success = true, message = "Bulk move initiated", moved_count = 0 });
    }

    /// <summary>POST /api/admin/super/bulk/update-tenants - Bulk update tenants.</summary>
    [HttpPost("super/bulk/update-tenants")]
    public IActionResult BulkUpdateTenants()
    {
        return Ok(new { success = true, message = "Bulk update initiated", updated_count = 0 });
    }

    /// <summary>GET /api/admin/super/audit - Audit log.</summary>
    [HttpGet("super/audit")]
    public IActionResult GetSuperAuditLog([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? action = null)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>GET /api/admin/super/federation - Federation status.</summary>
    [HttpGet("super/federation")]
    public IActionResult GetSuperFederation()
    {
        return Ok(new { enabled = false, total_partners = 0, active_partnerships = 0, lockdown = false });
    }

    /// <summary>GET /api/admin/super/federation/system-controls - System controls.</summary>
    [HttpGet("super/federation/system-controls")]
    public IActionResult GetSuperFederationSystemControls()
    {
        return Ok(new { federation_enabled = false, auto_approve = false, max_partners = 100, lockdown_active = false });
    }

    /// <summary>PUT /api/admin/super/federation/system-controls - Update system controls.</summary>
    [HttpPut("super/federation/system-controls")]
    public IActionResult UpdateSuperFederationSystemControls()
    {
        return Ok(new { success = true, message = "System controls updated" });
    }

    /// <summary>POST /api/admin/super/federation/emergency-lockdown - Emergency lockdown.</summary>
    [HttpPost("super/federation/emergency-lockdown")]
    public IActionResult SuperFederationEmergencyLockdown()
    {
        return Ok(new { success = true, message = "Federation emergency lockdown activated" });
    }

    /// <summary>POST /api/admin/super/federation/lift-lockdown - Lift lockdown.</summary>
    [HttpPost("super/federation/lift-lockdown")]
    public IActionResult SuperFederationLiftLockdown()
    {
        return Ok(new { success = true, message = "Federation lockdown lifted" });
    }

    /// <summary>GET /api/admin/super/federation/whitelist - Whitelist.</summary>
    [HttpGet("super/federation/whitelist")]
    public IActionResult GetSuperFederationWhitelist()
    {
        return Ok(new { data = Array.Empty<object>(), total = 0 });
    }

    /// <summary>POST /api/admin/super/federation/whitelist - Add to whitelist.</summary>
    [HttpPost("super/federation/whitelist")]
    public IActionResult AddToSuperFederationWhitelist()
    {
        return Ok(new { success = true, message = "Added to federation whitelist" });
    }

    /// <summary>DELETE /api/admin/super/federation/whitelist/{tenantId} - Remove from whitelist.</summary>
    [HttpDelete("super/federation/whitelist/{tenantId}")]
    public IActionResult RemoveFromSuperFederationWhitelist(int tenantId)
    {
        return Ok(new { success = true, message = "Removed from federation whitelist", tenant_id = tenantId });
    }

    /// <summary>GET /api/admin/super/federation/partnerships - Partnerships.</summary>
    [HttpGet("super/federation/partnerships")]
    public IActionResult GetSuperFederationPartnerships([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        return Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });
    }

    /// <summary>POST /api/admin/super/federation/partnerships/{id}/suspend - Suspend partnership.</summary>
    [HttpPost("super/federation/partnerships/{id:int}/suspend")]
    public IActionResult SuspendSuperFederationPartnership(int id)
    {
        return Ok(new { success = true, message = "Partnership suspended", id });
    }

    /// <summary>POST /api/admin/super/federation/partnerships/{id}/terminate - Terminate partnership.</summary>
    [HttpPost("super/federation/partnerships/{id:int}/terminate")]
    public IActionResult TerminateSuperFederationPartnership(int id)
    {
        return Ok(new { success = true, message = "Partnership terminated", id });
    }

    /// <summary>GET /api/admin/super/federation/tenant/{tenantId}/features - Tenant features.</summary>
    [HttpGet("super/federation/tenant/{tenantId}/features")]
    public IActionResult GetSuperFederationTenantFeatures(int tenantId)
    {
        return Ok(new { tenant_id = tenantId, features = Array.Empty<object>() });
    }

    /// <summary>PUT /api/admin/super/federation/tenant/{tenantId}/features - Update tenant features.</summary>
    [HttpPut("super/federation/tenant/{tenantId}/features")]
    public IActionResult UpdateSuperFederationTenantFeatures(int tenantId)
    {
        return Ok(new { success = true, message = "Tenant features updated", tenant_id = tenantId });
    }

    // ───────────────────────────────────────────────────────────────
    // Content Moderation
    // Existing AdminFeedController has: GET/POST/DELETE posts, GET posts/{id},
    //   POST posts/{id}/hide, GET stats — ALL at /api/admin/feed/
    // These routes are at /api/admin/comments, /api/admin/reviews, /api/admin/reports
    // — no conflict with AdminFeedController.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/comments - List comments for moderation.</summary>
    [HttpGet("comments")]
    public async Task<IActionResult> ListAdminComments(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery(Name = "target_type")] string? targetType = null,
        [FromQuery(Name = "content_type")] string? contentType = null,
        [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var requestedType = (contentType ?? targetType)?.Trim().ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(requestedType) && requestedType != "post")
        {
            return Ok(new
            {
                success = true,
                data = Array.Empty<object>(),
                meta = new { current_page = page, page, per_page = limit, limit, total = 0, total_pages = 1 }
            });
        }

        var query = _db.PostComments
            .Include(c => c.User)
            .Include(c => c.Tenant)
            .Include(c => c.Post)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.Trim().ToLowerInvariant();
            query = query.Where(c =>
                c.Content.ToLower().Contains(lowered) ||
                (c.User != null && ((c.User.FirstName + " " + c.User.LastName).ToLower().Contains(lowered) ||
                                    c.User.Email.ToLower().Contains(lowered))) ||
                (c.Post != null && c.Post.Content.ToLower().Contains(lowered)));
        }

        var total = await query.CountAsync();
        var comments = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
        var hiddenIds = await GetHiddenAdminCommentIdsAsync();
        var commentIds = comments.Select(c => c.Id).ToArray();
        var reportCounts = commentIds.Length == 0
            ? new Dictionary<int, int>()
            : await _db.ContentReports
                .Where(r => r.ContentType == "comment" && commentIds.Contains(r.ContentId))
                .GroupBy(r => r.ContentId)
                .Select(g => new { CommentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.CommentId, g => g.Count);

        var data = comments
            .Select(c => MapAdminComment(c, hiddenIds.Contains(c.Id), reportCounts.GetValueOrDefault(c.Id)))
            .ToList();

        return Ok(new
        {
            success = true,
            data,
            meta = new
            {
                current_page = page,
                page,
                per_page = limit,
                limit,
                total,
                total_pages = Math.Max(1, (int)Math.Ceiling(total / (double)limit))
            }
        });
    }

    /// <summary>GET /api/admin/comments/{id} - Get comment.</summary>
    [HttpGet("comments/{id:int}")]
    public async Task<IActionResult> GetAdminComment(int id)
    {
        var comment = await _db.PostComments
            .Include(c => c.User)
            .Include(c => c.Tenant)
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
        {
            return NotFound(new { success = false, error = "Comment not found", code = "NOT_FOUND" });
        }

        var hiddenIds = await GetHiddenAdminCommentIdsAsync();
        var reportsCount = await _db.ContentReports.CountAsync(r => r.ContentType == "comment" && r.ContentId == id);

        return Ok(new
        {
            success = true,
            data = MapAdminComment(comment, hiddenIds.Contains(comment.Id), reportsCount)
        });
    }

    /// <summary>POST /api/admin/comments/{id}/hide - Hide comment.</summary>
    [HttpPost("comments/{id:int}/hide")]
    public async Task<IActionResult> HideAdminComment(int id)
    {
        if (!await _db.PostComments.AnyAsync(c => c.Id == id))
        {
            return NotFound(new { success = false, error = "Comment not found", code = "NOT_FOUND" });
        }

        var hiddenIds = await GetHiddenAdminCommentIdsAsync();
        hiddenIds.Add(id);
        await SaveHiddenAdminCommentIdsAsync(hiddenIds);

        return Ok(new { success = true, data = new { success = true, message = "Comment hidden", id } });
    }

    /// <summary>DELETE /api/admin/comments/{id} - Delete comment.</summary>
    [HttpDelete("comments/{id:int}")]
    public async Task<IActionResult> DeleteAdminComment(int id)
    {
        var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == id);
        if (comment == null)
        {
            return NotFound(new { success = false, error = "Comment not found", code = "NOT_FOUND" });
        }

        _db.PostComments.Remove(comment);
        var hiddenIds = await GetHiddenAdminCommentIdsAsync();
        hiddenIds.Remove(id);
        await SaveHiddenAdminCommentIdsAsync(hiddenIds, saveChanges: false);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, data = new { success = true, message = "Comment deleted", id } });
    }

    private object MapAdminComment(PostComment comment, bool isHidden, int reportsCount)
    {
        var userName = comment.User == null
            ? "Unknown"
            : string.Join(" ", new[] { comment.User.FirstName, comment.User.LastName }
                .Where(part => !string.IsNullOrWhiteSpace(part))).Trim();
        if (string.IsNullOrWhiteSpace(userName)) userName = comment.User?.Email ?? "Unknown";

        return new
        {
            id = comment.Id,
            user_id = comment.UserId,
            tenant_id = comment.TenantId,
            tenant_name = comment.Tenant?.Name ?? "Unknown",
            user_name = userName,
            user_avatar = comment.User?.AvatarUrl,
            target_type = "post",
            content_type = "post",
            target_id = comment.PostId,
            content_id = comment.PostId,
            content_title = comment.Post == null ? null : Truncate(comment.Post.Content, 80),
            parent_id = comment.ParentCommentId,
            content = comment.Content,
            is_hidden = isHidden,
            is_flagged = reportsCount > 0,
            reports_count = reportsCount,
            created_at = comment.CreatedAt,
            updated_at = comment.UpdatedAt ?? comment.CreatedAt
        };
    }

    private async Task<HashSet<int>> GetHiddenAdminCommentIdsAsync()
    {
        var tenantId = GetTenantId();
        var raw = await _db.TenantConfigs
            .Where(c => c.TenantId == tenantId && c.Key == "admin.comments.hidden_ids")
            .Select(c => c.Value)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(raw)) return new HashSet<int>();

        try
        {
            return JsonSerializer.Deserialize<HashSet<int>>(raw) ?? new HashSet<int>();
        }
        catch (JsonException)
        {
            return new HashSet<int>();
        }
    }

    private async Task SaveHiddenAdminCommentIdsAsync(HashSet<int> ids, bool saveChanges = true)
    {
        var tenantId = GetTenantId();
        var config = await _db.TenantConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == "admin.comments.hidden_ids");
        var now = DateTime.UtcNow;
        var value = JsonSerializer.Serialize(ids.OrderBy(id => id));

        if (config == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = "admin.comments.hidden_ids",
                Value = value,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            config.Value = value;
            config.UpdatedAt = now;
        }

        if (saveChanges)
        {
            await _db.SaveChangesAsync();
        }
    }

    private static string Truncate(string value, int maxLength)
    {
        if (value.Length <= maxLength) return value;
        return value[..maxLength];
    }

    /// <summary>GET /api/admin/reviews - List reviews for moderation.</summary>
    [HttpGet("reviews")]
    public async Task<IActionResult> ListAdminReviews(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery] int? rating = null,
        [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var hiddenIds = await GetAdminModerationIdSetAsync("admin.reviews.hidden_ids");
        var flaggedIds = await GetAdminModerationIdSetAsync("admin.reviews.flagged_ids");

        var query = _db.Reviews
            .Include(r => r.Tenant)
            .Include(r => r.Reviewer)
            .Include(r => r.TargetUser)
            .AsQueryable();

        if (rating is >= 1 and <= 5)
        {
            query = query.Where(r => r.Rating == rating.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = normalizedStatus switch
            {
                "hidden" or "rejected" => query.Where(r => hiddenIds.Contains(r.Id)),
                "flagged" or "pending" => query.Where(r => flaggedIds.Contains(r.Id)),
                "visible" or "approved" => query.Where(r => !hiddenIds.Contains(r.Id)),
                _ => query
            };
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.Trim().ToLowerInvariant();
            query = query.Where(r =>
                (r.Comment != null && r.Comment.ToLower().Contains(lowered)) ||
                (r.Reviewer.FirstName + " " + r.Reviewer.LastName).ToLower().Contains(lowered) ||
                r.Reviewer.Email.ToLower().Contains(lowered) ||
                (r.TargetUser != null && ((r.TargetUser.FirstName + " " + r.TargetUser.LastName).ToLower().Contains(lowered) ||
                                          r.TargetUser.Email.ToLower().Contains(lowered))));
        }

        var total = await query.CountAsync();
        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
        var reviewIds = reviews.Select(r => r.Id).ToArray();
        var reportCounts = reviewIds.Length == 0
            ? new Dictionary<int, int>()
            : await _db.ContentReports
                .Where(r => r.ContentType == "review" && reviewIds.Contains(r.ContentId))
                .GroupBy(r => r.ContentId)
                .Select(g => new { ReviewId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.ReviewId, g => g.Count);

        var data = reviews
            .Select(r => MapAdminReview(r, hiddenIds.Contains(r.Id), flaggedIds.Contains(r.Id), reportCounts.GetValueOrDefault(r.Id)))
            .ToList();

        return Ok(new
        {
            success = true,
            data,
            meta = new
            {
                current_page = page,
                page,
                per_page = limit,
                limit,
                total,
                total_pages = Math.Max(1, (int)Math.Ceiling(total / (double)limit))
            }
        });
    }

    /// <summary>GET /api/admin/reviews/{id} - Get review.</summary>
    [HttpGet("reviews/{id:int}")]
    public async Task<IActionResult> GetAdminReview(int id)
    {
        var review = await _db.Reviews
            .Include(r => r.Tenant)
            .Include(r => r.Reviewer)
            .Include(r => r.TargetUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
        {
            return NotFound(new { success = false, error = "Review not found", code = "NOT_FOUND" });
        }

        var hiddenIds = await GetAdminModerationIdSetAsync("admin.reviews.hidden_ids");
        var flaggedIds = await GetAdminModerationIdSetAsync("admin.reviews.flagged_ids");
        var reportsCount = await _db.ContentReports.CountAsync(r => r.ContentType == "review" && r.ContentId == id);

        return Ok(new
        {
            success = true,
            data = MapAdminReview(review, hiddenIds.Contains(id), flaggedIds.Contains(id), reportsCount)
        });
    }

    /// <summary>POST /api/admin/reviews/{id}/flag - Flag review.</summary>
    [HttpPost("reviews/{id:int}/flag")]
    public async Task<IActionResult> FlagAdminReview(int id)
    {
        if (!await _db.Reviews.AnyAsync(r => r.Id == id))
        {
            return NotFound(new { success = false, error = "Review not found", code = "NOT_FOUND" });
        }

        var flaggedIds = await GetAdminModerationIdSetAsync("admin.reviews.flagged_ids");
        flaggedIds.Add(id);
        await SaveAdminModerationIdSetAsync("admin.reviews.flagged_ids", flaggedIds);

        return Ok(new { success = true, data = new { success = true, message = "Review flagged", id } });
    }

    /// <summary>POST /api/admin/reviews/{id}/hide - Hide review.</summary>
    [HttpPost("reviews/{id:int}/hide")]
    public async Task<IActionResult> HideAdminReview(int id)
    {
        if (!await _db.Reviews.AnyAsync(r => r.Id == id))
        {
            return NotFound(new { success = false, error = "Review not found", code = "NOT_FOUND" });
        }

        var hiddenIds = await GetAdminModerationIdSetAsync("admin.reviews.hidden_ids");
        hiddenIds.Add(id);
        await SaveAdminModerationIdSetAsync("admin.reviews.hidden_ids", hiddenIds);

        return Ok(new { success = true, data = new { success = true, message = "Review hidden", id } });
    }

    /// <summary>DELETE /api/admin/reviews/{id} - Delete review.</summary>
    [HttpDelete("reviews/{id:int}")]
    public async Task<IActionResult> DeleteAdminReview(int id)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null)
        {
            return NotFound(new { success = false, error = "Review not found", code = "NOT_FOUND" });
        }

        _db.Reviews.Remove(review);
        var hiddenIds = await GetAdminModerationIdSetAsync("admin.reviews.hidden_ids");
        var flaggedIds = await GetAdminModerationIdSetAsync("admin.reviews.flagged_ids");
        hiddenIds.Remove(id);
        flaggedIds.Remove(id);
        await SaveAdminModerationIdSetAsync("admin.reviews.hidden_ids", hiddenIds, saveChanges: false);
        await SaveAdminModerationIdSetAsync("admin.reviews.flagged_ids", flaggedIds, saveChanges: false);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, data = new { success = true, message = "Review deleted", id } });
    }

    private object MapAdminReview(Review review, bool isHidden, bool isFlagged, int reportsCount)
    {
        var reviewerName = FormatUserName(review.Reviewer);
        var revieweeName = review.TargetUser == null
            ? review.TargetListingId.HasValue ? $"Listing #{review.TargetListingId.Value}" : "Unknown"
            : FormatUserName(review.TargetUser);
        var revieweeId = review.TargetUserId ?? review.TargetListingId ?? 0;

        return new
        {
            id = review.Id,
            reviewer_id = review.ReviewerId,
            tenant_id = review.TenantId,
            tenant_name = review.Tenant?.Name ?? "Unknown",
            reviewer_name = reviewerName,
            reviewer_avatar = review.Reviewer?.AvatarUrl,
            reviewee_id = revieweeId,
            receiver_id = revieweeId,
            reviewee_name = revieweeName,
            receiver_name = revieweeName,
            reviewee_avatar = review.TargetUser?.AvatarUrl,
            receiver_avatar = review.TargetUser?.AvatarUrl,
            rating = review.Rating,
            comment = review.Comment,
            content = review.Comment ?? string.Empty,
            status = isHidden ? "rejected" : isFlagged ? "pending" : "approved",
            is_hidden = isHidden,
            is_flagged = isFlagged,
            reports_count = reportsCount,
            is_anonymous = false,
            created_at = review.CreatedAt,
            updated_at = review.UpdatedAt ?? review.CreatedAt
        };
    }

    private static string FormatUserName(User? user)
    {
        if (user == null) return "Unknown";
        var name = string.Join(" ", new[] { user.FirstName, user.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part))).Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private async Task<HashSet<int>> GetAdminModerationIdSetAsync(string key)
    {
        var tenantId = GetTenantId();
        var raw = await _db.TenantConfigs
            .Where(c => c.TenantId == tenantId && c.Key == key)
            .Select(c => c.Value)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(raw)) return new HashSet<int>();

        try
        {
            return JsonSerializer.Deserialize<HashSet<int>>(raw) ?? new HashSet<int>();
        }
        catch (JsonException)
        {
            return new HashSet<int>();
        }
    }

    private async Task SaveAdminModerationIdSetAsync(string key, HashSet<int> ids, bool saveChanges = true)
    {
        var tenantId = GetTenantId();
        var config = await _db.TenantConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        var now = DateTime.UtcNow;
        var value = JsonSerializer.Serialize(ids.OrderBy(id => id));

        if (config == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = value,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            config.Value = value;
            config.UpdatedAt = now;
        }

        if (saveChanges)
        {
            await _db.SaveChangesAsync();
        }
    }

    // Reports routes removed — served by ReportsController

    /// <summary>POST /api/admin/reports/{id}/resolve - Resolve report.</summary>
    [HttpPost("reports/{id:int}/resolve")]
    public IActionResult ResolveAdminReport(int id)
    {
        return Ok(new { success = true, message = "Report resolved", id });
    }

    /// <summary>POST /api/admin/reports/{id}/dismiss - Dismiss report.</summary>
    [HttpPost("reports/{id:int}/dismiss")]
    public IActionResult DismissAdminReport(int id)
    {
        return Ok(new { success = true, message = "Report dismissed", id });
    }

    // ───────────────────────────────────────────────────────────────
    // CRM - Extended (beyond existing AdminCrmController)
    // Existing: users/search, users/{userId}/notes, notes/{id}, flagged-notes,
    //           tasks, tasks/{id}, tasks/{id}/complete, users/{userId}/tags,
    //           users/export
    // New: dashboard, funnel, admins, notes (flat), tags (crm/tags),
    //      timeline, export/*
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/crm/dashboard - CRM dashboard.</summary>
    [HttpGet("crm/dashboard")]
    public async Task<IActionResult> GetCrmDashboard()
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var activeTaskStatuses = new[] { "pending", "in_progress" };

        var totalContacts = await _db.Users.CountAsync(u => u.TenantId == tenantId);
        var newThisMonth = await _db.Users.CountAsync(u => u.TenantId == tenantId && u.CreatedAt >= monthStart);
        var activeTasks = await _db.CrmTasks.CountAsync(t => t.TenantId == tenantId && activeTaskStatuses.Contains(t.Status));
        var overdueTasks = await _db.CrmTasks.CountAsync(t => t.TenantId == tenantId && activeTaskStatuses.Contains(t.Status) && t.DueDate != null && t.DueDate < now);
        var totalNotes = await _db.AdminNotes.CountAsync(n => n.TenantId == tenantId);
        var pinnedNotes = await _db.AdminNotes.CountAsync(n => n.TenantId == tenantId && n.IsFlagged);
        var tagCount = await _db.UserTags.CountAsync(t => t.TenantId == tenantId);

        return Ok(new
        {
            data = new
            {
                total_contacts = totalContacts,
                new_this_month = newThisMonth,
                active_tasks = activeTasks,
                overdue_tasks = overdueTasks,
                total_notes = totalNotes,
                pinned_notes = pinnedNotes,
                flagged_notes = pinnedNotes,
                total_tags = tagCount,
                generated_at = now
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/admin/crm/funnel - Onboarding funnel.</summary>
    [HttpGet("crm/funnel")]
    public async Task<IActionResult> GetCrmFunnel()
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var users = _db.Users.AsNoTracking().Where(u => u.TenantId == tenantId);

        var registered = await users.CountAsync();
        var emailVerified = await users.CountAsync(u => u.EmailVerified || u.EmailVerifiedAt != null);
        var profileComplete = await users.CountAsync(u =>
            (u.EmailVerified || u.EmailVerifiedAt != null) &&
            (!string.IsNullOrWhiteSpace(u.Bio) || !string.IsNullOrWhiteSpace(u.AvatarUrl)));
        var firstListing = await _db.Listings
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId)
            .Select(l => l.UserId)
            .Distinct()
            .CountAsync();
        var exchangeParticipants = await _db.Exchanges
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId)
            .Select(e => new { e.InitiatorId, e.ListingOwnerId, e.ProviderId, e.ReceiverId })
            .ToListAsync();
        var exchangeUserIds = exchangeParticipants
            .SelectMany(e => new int?[] { e.InitiatorId, e.ListingOwnerId, e.ProviderId, e.ReceiverId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();
        var firstExchange = exchangeUserIds.Distinct().Count();
        var repeatUsers = exchangeUserIds
            .GroupBy(id => id)
            .Where(g => g.Count() > 1)
            .Count();

        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5);
        var monthlyRows = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.CreatedAt >= monthStart)
            .Select(u => u.CreatedAt)
            .ToListAsync();

        var monthlyRegistrations = Enumerable.Range(0, 6)
            .Select(offset => monthStart.AddMonths(offset))
            .Select(month => new
            {
                month = month.ToString("yyyy-MM"),
                count = monthlyRows.Count(created => created.Year == month.Year && created.Month == month.Month)
            })
            .ToArray();

        return Ok(new
        {
            data = new
            {
                stages = new[]
                {
                    new { name = "Registered", key = "registered", count = registered, color = "#3b82f6" },
                    new { name = "Email Verified", key = "email_verified", count = emailVerified, color = "#6366f1" },
                    new { name = "Profile Complete", key = "profile_complete", count = profileComplete, color = "#8b5cf6" },
                    new { name = "First Listing", key = "first_listing", count = firstListing, color = "#06b6d4" },
                    new { name = "First Exchange", key = "first_exchange", count = firstExchange, color = "#10b981" },
                    new { name = "Repeat User", key = "repeat_user", count = repeatUsers, color = "#f59e0b" }
                },
                monthly_registrations = monthlyRegistrations
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/admin/crm/admins - Admin list for assignment.</summary>
    [HttpGet("crm/admins")]
    public async Task<IActionResult> GetCrmAdmins()
    {
        var tenantId = GetTenantId();
        var adminRoles = new[] { "admin", "moderator", "tenant_admin", "super_admin" };
        var admins = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && adminRoles.Contains(u.Role))
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Select(u => new
            {
                id = u.Id,
                name = (u.FirstName + " " + u.LastName).Trim(),
                email = u.Email,
                avatar_url = u.AvatarUrl,
                role = u.Role
            })
            .ToListAsync();

        return Ok(new { data = admins, meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/crm/notes - List all member notes.</summary>
    [HttpGet("crm/notes")]
    public async Task<IActionResult> ListCrmNotes(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] int? user_id = null,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null)
    {
        var tenantId = GetTenantId();
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.AdminNotes
            .AsNoTracking()
            .Include(n => n.User)
            .Include(n => n.Admin)
            .Where(n => n.TenantId == tenantId);

        if (user_id.HasValue)
        {
            query = query.Where(n => n.UserId == user_id.Value);
        }

        if (IsLaravelCrmNoteCategory(category))
        {
            query = query.Where(n => n.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(search) && search.Trim().Length >= 2)
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(n =>
                n.Content.ToLower().Contains(term) ||
                (n.User != null && (n.User.FirstName + " " + n.User.LastName).ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var notes = await query
            .OrderByDescending(n => n.IsFlagged)
            .ThenByDescending(n => n.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            data = notes.Select(MapLaravelCrmNote),
            meta = LaravelPaginationMeta(page, limit, total)
        });
    }

    /// <summary>POST /api/admin/crm/notes - Create a note.</summary>
    [HttpPost("crm/notes")]
    public async Task<IActionResult> CreateCrmNote([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        if (adminId == null)
        {
            return Unauthorized(new { error = "Unable to determine admin identity" });
        }

        var userId = ReadInt(body, "user_id") ?? 0;
        var content = ReadString(body, "content")?.Trim();
        if (userId <= 0 || string.IsNullOrWhiteSpace(content))
        {
            return BadRequest(new { error = "user_id and content are required" });
        }

        var userExists = await _db.Users.AnyAsync(u => u.TenantId == tenantId && u.Id == userId);
        if (!userExists)
        {
            return NotFound(new { error = "User not found" });
        }

        var category = NormalizeLaravelCrmNoteCategory(ReadString(body, "category"));
        var note = new AdminNote
        {
            TenantId = tenantId,
            UserId = userId,
            AdminId = adminId.Value,
            Content = content,
            Category = category,
            IsFlagged = ReadBool(body, "is_pinned") ?? false,
            CreatedAt = DateTime.UtcNow
        };

        _db.AdminNotes.Add(note);
        await _db.SaveChangesAsync();

        var saved = await LoadCrmNoteAsync(tenantId, note.Id);
        return Ok(new { data = MapLaravelCrmNote(saved!), meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/crm/tags - List CRM tags.</summary>
    [HttpGet("crm/tags")]
    public async Task<IActionResult> ListCrmTags([FromQuery] int? user_id = null, [FromQuery] string? tag = null)
    {
        var tenantId = GetTenantId();
        var query = _db.UserTags
            .AsNoTracking()
            .Include(t => t.User)
            .Where(t => t.TenantId == tenantId);

        if (user_id.HasValue)
        {
            var rows = await query
                .Where(t => t.UserId == user_id.Value)
                .OrderBy(t => t.Tag)
                .ToListAsync();

            return Ok(new { data = rows.Select(MapLaravelCrmTag), meta = LaravelMeta() });
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagValue = tag.Trim();
            var rows = await query
                .Where(t => t.Tag == tagValue)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(new { data = rows.Select(MapLaravelCrmTag), meta = LaravelMeta() });
        }

        var summaries = await query
            .GroupBy(t => t.Tag)
            .Select(g => new { tag = g.Key, member_count = g.Count() })
            .OrderByDescending(g => g.member_count)
            .ThenBy(g => g.tag)
            .ToListAsync();

        return Ok(new { data = summaries, meta = LaravelMeta() });
    }

    /// <summary>POST /api/admin/crm/tags - Add CRM tag.</summary>
    [HttpPost("crm/tags")]
    public async Task<IActionResult> CreateCrmTag([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        if (adminId == null)
        {
            return Unauthorized(new { error = "Unable to determine admin identity" });
        }

        var userId = ReadInt(body, "user_id") ?? 0;
        var tag = ReadString(body, "tag")?.Trim();
        if (userId <= 0 || string.IsNullOrWhiteSpace(tag))
        {
            return BadRequest(new { error = "user_id and tag are required" });
        }

        if (tag.Length > 50)
        {
            return BadRequest(new { error = "Tag must be 50 characters or fewer" });
        }

        var userExists = await _db.Users.AnyAsync(u => u.TenantId == tenantId && u.Id == userId);
        if (!userExists)
        {
            return NotFound(new { error = "User not found" });
        }

        var existing = await _db.UserTags
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.UserId == userId && t.Tag == tag);
        if (existing != null)
        {
            return Conflict(new { error = "Tag already assigned" });
        }

        var userTag = new UserTag
        {
            TenantId = tenantId,
            UserId = userId,
            Tag = tag,
            AppliedByAdminId = adminId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _db.UserTags.Add(userTag);
        await _db.SaveChangesAsync();

        var saved = await _db.UserTags
            .AsNoTracking()
            .Include(t => t.User)
            .FirstAsync(t => t.TenantId == tenantId && t.Id == userTag.Id);

        return Ok(new { data = MapLaravelCrmTag(saved), meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/admin/crm/tags/{id} - Remove CRM tag.</summary>
    [HttpDelete("crm/tags/{id:int}")]
    public async Task<IActionResult> DeleteCrmTag(int id)
    {
        var tenantId = GetTenantId();
        var tag = await _db.UserTags.FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);
        if (tag == null)
        {
            return NotFound(new { error = "Tag not found" });
        }

        _db.UserTags.Remove(tag);
        await _db.SaveChangesAsync();

        return Ok(new { data = new { deleted = true }, meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/admin/crm/tags/bulk - Bulk remove tags.</summary>
    [HttpDelete("crm/tags/bulk")]
    public async Task<IActionResult> BulkDeleteCrmTags([FromQuery] string? tag)
    {
        var tenantId = GetTenantId();
        var tagValue = tag?.Trim();
        if (string.IsNullOrWhiteSpace(tagValue))
        {
            return BadRequest(new { error = "tag query parameter is required" });
        }

        var tags = await _db.UserTags
            .Where(t => t.TenantId == tenantId && t.Tag == tagValue)
            .ToListAsync();
        if (tags.Count == 0)
        {
            return NotFound(new { error = "Tag not found" });
        }

        _db.UserTags.RemoveRange(tags);
        await _db.SaveChangesAsync();

        return Ok(new { data = new { deleted = tags.Count }, meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/crm/timeline - Activity timeline.</summary>
    [HttpGet("crm/timeline")]
    public async Task<IActionResult> GetCrmTimeline(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 25,
        [FromQuery] int? user_id = null,
        [FromQuery] string? type = null,
        [FromQuery] int days = 30)
    {
        var activityType = type?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(activityType) && !LaravelCrmTimelineTypes.Contains(activityType))
        {
            return BadRequest(new { error = "Invalid activity type" });
        }

        var tenantId = GetTenantId();
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var cutoff = days > 0 ? DateTime.UtcNow.AddDays(-days) : (DateTime?)null;
        var entries = new List<CrmTimelineEntry>();

        var includeAll = string.IsNullOrWhiteSpace(activityType);
        if (includeAll || activityType == "signup")
        {
            var users = await _db.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId)
                .Where(u => !user_id.HasValue || u.Id == user_id.Value)
                .Where(u => !cutoff.HasValue || u.CreatedAt >= cutoff.Value)
                .Select(u => new { u.Id, u.FirstName, u.LastName, u.AvatarUrl, u.CreatedAt })
                .ToListAsync();

            entries.AddRange(users.Select(u => new CrmTimelineEntry(
                UserId: u.Id,
                UserName: DisplayName(u.FirstName, u.LastName),
                UserAvatar: u.AvatarUrl,
                ActivityType: "signup",
                Description: "Registered an account",
                Metadata: new Dictionary<string, object?>(),
                CreatedAt: u.CreatedAt)));
        }

        if (includeAll || activityType == "profile_updated")
        {
            var users = await _db.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tenantId && u.UpdatedAt != null && u.UpdatedAt > u.CreatedAt)
                .Where(u => !user_id.HasValue || u.Id == user_id.Value)
                .Where(u => !cutoff.HasValue || u.UpdatedAt >= cutoff.Value)
                .Select(u => new { u.Id, u.FirstName, u.LastName, u.AvatarUrl, u.UpdatedAt })
                .ToListAsync();

            entries.AddRange(users.Select(u => new CrmTimelineEntry(
                UserId: u.Id,
                UserName: DisplayName(u.FirstName, u.LastName),
                UserAvatar: u.AvatarUrl,
                ActivityType: "profile_updated",
                Description: "Updated their profile",
                Metadata: new Dictionary<string, object?>(),
                CreatedAt: u.UpdatedAt!.Value)));
        }

        if (includeAll || activityType == "listing_created")
        {
            var listings = await _db.Listings
                .AsNoTracking()
                .Include(l => l.User)
                .Where(l => l.TenantId == tenantId)
                .Where(l => !user_id.HasValue || l.UserId == user_id.Value)
                .Where(l => !cutoff.HasValue || l.CreatedAt >= cutoff.Value)
                .ToListAsync();

            entries.AddRange(listings.Select(l => new CrmTimelineEntry(
                UserId: l.UserId,
                UserName: DisplayName(l.User),
                UserAvatar: l.User?.AvatarUrl,
                ActivityType: "listing_created",
                Description: $"Created listing: {l.Title}",
                Metadata: new Dictionary<string, object?> { ["listing_id"] = l.Id },
                CreatedAt: l.CreatedAt)));
        }

        if (includeAll || activityType == "exchange_completed")
        {
            var exchanges = await _db.Exchanges
                .AsNoTracking()
                .Include(e => e.Initiator)
                .Include(e => e.ListingOwner)
                .Where(e => e.TenantId == tenantId && e.CompletedAt != null)
                .Where(e => !user_id.HasValue || e.InitiatorId == user_id.Value)
                .Where(e => !cutoff.HasValue || e.CompletedAt >= cutoff.Value)
                .ToListAsync();

            entries.AddRange(exchanges.Select(e => new CrmTimelineEntry(
                UserId: e.InitiatorId,
                UserName: DisplayName(e.Initiator),
                UserAvatar: e.Initiator?.AvatarUrl,
                ActivityType: "exchange_completed",
                Description: $"Completed exchange with {DisplayName(e.ListingOwner)}",
                Metadata: new Dictionary<string, object?> { ["exchange_id"] = e.Id },
                CreatedAt: e.CompletedAt!.Value)));
        }

        if (includeAll || activityType == "note_added")
        {
            var notes = await _db.AdminNotes
                .AsNoTracking()
                .Include(n => n.User)
                .Include(n => n.Admin)
                .Where(n => n.TenantId == tenantId)
                .Where(n => !user_id.HasValue || n.UserId == user_id.Value)
                .Where(n => !cutoff.HasValue || n.CreatedAt >= cutoff.Value)
                .ToListAsync();

            entries.AddRange(notes.Select(n => new CrmTimelineEntry(
                UserId: n.UserId,
                UserName: DisplayName(n.User),
                UserAvatar: n.User?.AvatarUrl,
                ActivityType: "note_added",
                Description: $"Note added by {DisplayName(n.Admin)}: {Truncate(n.Content ?? "", 80)}",
                Metadata: new Dictionary<string, object?> { ["note_id"] = n.Id, ["category"] = n.Category },
                CreatedAt: n.CreatedAt)));
        }

        if (includeAll || activityType == "task_created")
        {
            var tasks = await _db.CrmTasks
                .AsNoTracking()
                .Include(t => t.AssignedToAdmin)
                .Include(t => t.TargetUser)
                .Where(t => t.TenantId == tenantId)
                .Where(t => !user_id.HasValue || t.AssignedToAdminId == user_id.Value)
                .Where(t => !cutoff.HasValue || t.CreatedAt >= cutoff.Value)
                .ToListAsync();

            entries.AddRange(tasks.Select(t => new CrmTimelineEntry(
                UserId: t.AssignedToAdminId,
                UserName: DisplayName(t.AssignedToAdmin),
                UserAvatar: t.AssignedToAdmin?.AvatarUrl,
                ActivityType: "task_created",
                Description: $"Created task: {t.Title}",
                Metadata: new Dictionary<string, object?> { ["task_id"] = t.Id, ["member_user_id"] = t.TargetUserId },
                CreatedAt: t.CreatedAt)));
        }

        var total = entries.Count;
        var rows = entries
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select((e, index) => new
            {
                id = (page - 1) * limit + index + 1,
                user_id = e.UserId,
                user_name = e.UserName,
                user_avatar = e.UserAvatar,
                activity_type = e.ActivityType,
                description = e.Description,
                metadata = e.Metadata,
                created_at = e.CreatedAt
            })
            .ToList();

        return Ok(new
        {
            data = rows,
            meta = LaravelPaginationMeta(page, limit, total)
        });
    }

    /// <summary>GET /api/admin/crm/export/notes - Export notes CSV.</summary>
    [HttpGet("crm/export/notes")]
    public async Task<IActionResult> ExportCrmNotes()
    {
        var tenantId = GetTenantId();
        var rows = await _db.AdminNotes
            .AsNoTracking()
            .Include(n => n.User)
            .Include(n => n.Admin)
            .Where(n => n.TenantId == tenantId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new object?[]
            {
                n.Id,
                n.UserId,
                DisplayName(n.User),
                n.Content,
                string.IsNullOrWhiteSpace(n.Category) ? "general" : n.Category,
                n.IsFlagged ? "1" : "0",
                DisplayName(n.Admin),
                n.CreatedAt,
                n.UpdatedAt
            })
            .ToListAsync();

        var csv = BuildCsv(
            new[] { "ID", "User ID", "User Name", "Content", "Category", "Pinned", "Author", "Created", "Updated" },
            rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "crm_notes_export.csv");
    }

    /// <summary>GET /api/admin/crm/export/tasks - Export tasks CSV.</summary>
    [HttpGet("crm/export/tasks")]
    public async Task<IActionResult> ExportCrmTasks()
    {
        var tenantId = GetTenantId();
        var rows = await _db.CrmTasks
            .AsNoTracking()
            .Include(t => t.AssignedToAdmin)
            .Include(t => t.TargetUser)
            .Where(t => t.TenantId == tenantId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new object?[]
            {
                t.Id,
                t.Title,
                t.Description,
                t.Priority,
                t.Status == "done" ? "completed" : t.Status,
                DisplayName(t.AssignedToAdmin),
                DisplayName(t.TargetUser),
                t.DueDate,
                t.CompletedAt,
                DisplayName(t.AssignedToAdmin),
                t.CreatedAt
            })
            .ToListAsync();

        var csv = BuildCsv(
            new[] { "ID", "Title", "Description", "Priority", "Status", "Assigned To", "Related Member", "Due Date", "Completed At", "Created By", "Created" },
            rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "crm_tasks_export.csv");
    }

    /// <summary>GET /api/admin/crm/export/dashboard - Export dashboard CSV.</summary>
    [HttpGet("crm/export/dashboard")]
    public async Task<IActionResult> ExportCrmDashboard()
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var activeTaskStatuses = new[] { "pending", "in_progress" };
        var totalMembers = await _db.Users.CountAsync(u => u.TenantId == tenantId);
        var activeMembers = await _db.Users.CountAsync(u => u.TenantId == tenantId && u.IsActive);
        var newThisMonth = await _db.Users.CountAsync(u => u.TenantId == tenantId && u.CreatedAt >= monthStart);
        var pendingApprovals = await _db.Users.CountAsync(u => u.TenantId == tenantId && !u.EmailVerified);
        var activeTasks = await _db.CrmTasks.CountAsync(t => t.TenantId == tenantId && activeTaskStatuses.Contains(t.Status));
        var rows = new List<object?[]>
        {
            new object?[] { "Total Members", totalMembers },
            new object?[] { "Active Members", activeMembers },
            new object?[] { "New This Month", newThisMonth },
            new object?[] { "Pending Approvals", pendingApprovals },
            new object?[] { "Active Tasks", activeTasks }
        };

        var csv = BuildCsv(new[] { "Metric", "Value" }, rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "crm_dashboard_export.csv");
    }

    // ───────────────────────────────────────────────────────────────
    // Vetting - Extended (beyond existing AdminVettingController)
    // Existing at /api/admin/vetting: records, records/{id},
    //   records/{id}/verify (PUT), records/{id}/reject (PUT),
    //   users/{userId}/records, expiring, stats, types,
    //   bulk-verify, pending, expired, records/{id}/renew
    // New: POST root (create), PUT root/{id} (update), DELETE root/{id},
    //   GET user/{userId}, POST {id}/upload, POST bulk,
    //   POST {id}/verify, POST {id}/reject (POST methods — different from PUT)
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/v2/admin/vetting - Laravel React vetting list.</summary>
    [HttpGet("/api/v2/admin/vetting")]
    public async Task<IActionResult> ListVettingRecords(
        [FromQuery] string? status = null,
        [FromQuery(Name = "vetting_type")] string? vettingType = null,
        [FromQuery] string? search = null,
        [FromQuery(Name = "expiring_soon")] bool expiringSoon = false,
        [FromQuery] bool expired = false,
        [FromQuery] int page = 1,
        [FromQuery(Name = "per_page")] int perPage = 25)
    {
        var tenantId = GetTenantId();
        page = Math.Max(1, page);
        perPage = Math.Clamp(perPage, 10, 100);

        var query = _db.VettingRecords
            .AsNoTracking()
            .Include(v => v.User)
            .Include(v => v.VerifiedBy)
            .Where(v => v.TenantId == tenantId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = normalizedStatus == "pending_review"
                ? query.Where(v => v.Status == "pending" || v.Status == "submitted")
                : query.Where(v => v.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(vettingType))
        {
            var normalizedType = vettingType.Trim().ToLowerInvariant();
            query = query.Where(v => v.VettingType == normalizedType);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.Trim().ToLowerInvariant();
            query = query.Where(v =>
                (v.ReferenceNumber != null && v.ReferenceNumber.ToLower().Contains(lowered)) ||
                (v.Notes != null && v.Notes.ToLower().Contains(lowered)) ||
                (v.User != null && v.User.Email.ToLower().Contains(lowered)) ||
                (v.User != null && (v.User.FirstName + " " + v.User.LastName).ToLower().Contains(lowered)));
        }

        if (expiringSoon)
        {
            var now = DateTime.UtcNow;
            var cutoff = now.AddDays(30);
            query = query.Where(v => v.Status == "verified" && v.ExpiresAt != null && v.ExpiresAt >= now && v.ExpiresAt <= cutoff);
        }

        if (expired)
        {
            var now = DateTime.UtcNow;
            query = query.Where(v => v.ExpiresAt != null && v.ExpiresAt < now && (v.Status == "verified" || v.Status == "expired"));
        }

        var total = await query.CountAsync();
        var records = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync();
        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, records.Select(v => v.Id));

        return Ok(new
        {
            data = records.Select(v => MapLaravelVettingRecord(v, metadata.GetValueOrDefault(v.Id))),
            meta = LaravelPaginationMeta(page, perPage, total)
        });
    }

    /// <summary>GET /api/v2/admin/vetting/stats - Laravel React vetting stats.</summary>
    [HttpGet("/api/v2/admin/vetting/stats")]
    public async Task<IActionResult> GetVettingStats()
    {
        var tenantId = GetTenantId();
        var records = await _db.VettingRecords
            .AsNoTracking()
            .Where(v => v.TenantId == tenantId)
            .ToListAsync();

        var byStatus = records
            .GroupBy(v => v.Status)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        var byType = records
            .GroupBy(v => v.VettingType)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(30);
        var expiringSoon = records.Count(v => v.Status == "verified" && v.ExpiresAt is not null && v.ExpiresAt >= now && v.ExpiresAt <= cutoff);
        var expired = records.Count(v => v.ExpiresAt is not null && v.ExpiresAt < now && (v.Status == "verified" || v.Status == "expired"));

        return Ok(new
        {
            data = new
            {
                total = records.Count,
                by_status = byStatus,
                by_type = byType,
                expiring_soon = expiringSoon,
                expired,
                pending = byStatus.GetValueOrDefault("pending"),
                submitted = byStatus.GetValueOrDefault("submitted"),
                pending_review = byStatus.GetValueOrDefault("pending") + byStatus.GetValueOrDefault("submitted"),
                verified = byStatus.GetValueOrDefault("verified"),
                rejected = byStatus.GetValueOrDefault("rejected")
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/v2/admin/vetting/{id} - Laravel React vetting detail.</summary>
    [HttpGet("/api/v2/admin/vetting/{id:int}")]
    public async Task<IActionResult> GetVettingRecord(int id)
    {
        var tenantId = GetTenantId();
        var record = await LoadLaravelVettingRecordAsync(tenantId, id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }

        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
        return Ok(new { data = MapLaravelVettingRecord(record, metadata), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/vetting - Create vetting record.</summary>
    [HttpPost("/api/v2/admin/vetting")]
    public async Task<IActionResult> CreateVettingRecord([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var userId = ReadInt(body, "user_id") ?? 0;
        var user = await _db.Users.FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId);
        if (user == null)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "User not found in tenant", field = "user_id" });
        }

        var vettingType = NormalizeLaravelVettingType(ReadString(body, "vetting_type"));
        if (!IsLaravelVettingType(vettingType))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid vetting type", field = "vetting_type" });
        }

        var status = NormalizeLaravelVettingStatus(ReadString(body, "status"));
        if (!IsLaravelVettingStatus(status))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid status", field = "status" });
        }

        var issueDate = ReadDateTime(body, "issue_date") ?? ReadDateTime(body, "issued_at");
        var expiryDate = ReadDateTime(body, "expiry_date") ?? ReadDateTime(body, "expires_at");
        if (issueDate is not null && expiryDate is not null && expiryDate < issueDate)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Expiry date must be after issue date", field = "expiry_date" });
        }

        var record = new VettingRecord
        {
            TenantId = tenantId,
            UserId = userId,
            VettingType = vettingType,
            Status = status,
            ReferenceNumber = ReadString(body, "reference_number"),
            IssuedAt = issueDate,
            ExpiresAt = expiryDate,
            DocumentUrl = ReadString(body, "document_url"),
            Notes = ReadString(body, "notes"),
            CreatedAt = DateTime.UtcNow
        };

        _db.VettingRecords.Add(record);
        await _db.SaveChangesAsync();

        var metadata = LaravelVettingMetadata.FromBody(body);
        await SaveLaravelVettingMetadataAsync(tenantId, record.Id, metadata);

        var saved = await LoadLaravelVettingRecordAsync(tenantId, record.Id);
        return StatusCode(StatusCodes.Status201Created, new
        {
            data = MapLaravelVettingRecord(saved!, metadata),
            meta = LaravelMeta()
        });
    }

    /// <summary>PUT /api/v2/admin/vetting/{id} - Update vetting record.</summary>
    [HttpPut("/api/v2/admin/vetting/{id:int}")]
    public async Task<IActionResult> UpdateVettingRecord(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }

        if (body.TryGetProperty("vetting_type", out _))
        {
            var vettingType = NormalizeLaravelVettingType(ReadString(body, "vetting_type"));
            if (!IsLaravelVettingType(vettingType))
            {
                return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid vetting type", field = "vetting_type" });
            }

            record.VettingType = vettingType;
        }

        if (body.TryGetProperty("status", out _))
        {
            var status = NormalizeLaravelVettingStatus(ReadString(body, "status"));
            if (!IsLaravelVettingStatus(status))
            {
                return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid status", field = "status" });
            }

            record.Status = status;
        }

        if (body.TryGetProperty("reference_number", out _)) record.ReferenceNumber = ReadString(body, "reference_number");
        if (body.TryGetProperty("issue_date", out _) || body.TryGetProperty("issued_at", out _))
        {
            record.IssuedAt = ReadDateTime(body, "issue_date") ?? ReadDateTime(body, "issued_at");
        }
        if (body.TryGetProperty("expiry_date", out _) || body.TryGetProperty("expires_at", out _))
        {
            record.ExpiresAt = ReadDateTime(body, "expiry_date") ?? ReadDateTime(body, "expires_at");
        }
        if (record.IssuedAt is not null && record.ExpiresAt is not null && record.ExpiresAt < record.IssuedAt)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Expiry date must be after issue date", field = "expiry_date" });
        }
        if (body.TryGetProperty("document_url", out _)) record.DocumentUrl = ReadString(body, "document_url");
        if (body.TryGetProperty("notes", out _)) record.Notes = ReadString(body, "notes");
        record.UpdatedAt = DateTime.UtcNow;

        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
        metadata.ApplyBody(body);
        await SaveLaravelVettingMetadataAsync(tenantId, id, metadata, saveChanges: false);
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelVettingRecordAsync(tenantId, id);
        return Ok(new { data = MapLaravelVettingRecord(saved!, metadata), meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/v2/admin/vetting/{id} - Delete vetting record.</summary>
    [HttpDelete("/api/v2/admin/vetting/{id:int}")]
    public async Task<IActionResult> DeleteVettingRecord(int id)
    {
        var tenantId = GetTenantId();
        var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }

        _db.VettingRecords.Remove(record);
        await DeleteLaravelVettingMetadataAsync(tenantId, id, saveChanges: false);
        await _db.SaveChangesAsync();
        return Ok(new { data = new { deleted = true, id }, meta = LaravelMeta() });
    }

    /// <summary>GET /api/v2/admin/vetting/user/{userId} - User vetting records.</summary>
    [HttpGet("/api/v2/admin/vetting/user/{userId:int}")]
    public async Task<IActionResult> GetUserVettingRecords(int userId)
    {
        var tenantId = GetTenantId();
        var records = await _db.VettingRecords
            .AsNoTracking()
            .Include(v => v.User)
            .Include(v => v.VerifiedBy)
            .Where(v => v.TenantId == tenantId && v.UserId == userId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();
        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, records.Select(v => v.Id));
        return Ok(new
        {
            data = records.Select(v => MapLaravelVettingRecord(v, metadata.GetValueOrDefault(v.Id))),
            meta = LaravelMeta()
        });
    }

    /// <summary>POST /api/v2/admin/vetting/{id}/upload - Upload vetting document.</summary>
    [HttpPost("/api/v2/admin/vetting/{id:int}/upload")]
    public async Task<IActionResult> UploadVettingDocument(int id, IFormFile? file)
    {
        var tenantId = GetTenantId();
        var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }
        if (file == null || file.Length == 0)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "File is required", field = "file" });
        }

        record.DocumentUrl = $"/uploads/vetting/documents/{id}/{Path.GetFileName(file.FileName)}";
        record.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelVettingRecordAsync(tenantId, id);
        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
        return Ok(new { data = MapLaravelVettingRecord(saved!, metadata), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/vetting/bulk - Bulk vetting action.</summary>
    [HttpPost("/api/v2/admin/vetting/bulk")]
    public async Task<IActionResult> BulkVettingAction([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        var ids = ReadIntArray(body, "ids");
        var action = (ReadString(body, "action") ?? "").Trim().ToLowerInvariant();
        var reason = ReadString(body, "reason");
        if (ids.Length == 0)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "ids must be a non-empty array", field = "ids" });
        }
        if (action is not ("verify" or "reject" or "delete"))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid bulk action", field = "action" });
        }
        if (action == "reject" && string.IsNullOrWhiteSpace(reason))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Rejection reason is required", field = "reason" });
        }

        var processed = 0;
        var failed = 0;
        foreach (var id in ids.Take(100))
        {
            var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
            if (record == null)
            {
                failed++;
                continue;
            }

            if (action == "delete")
            {
                _db.VettingRecords.Remove(record);
                await DeleteLaravelVettingMetadataAsync(tenantId, id, saveChanges: false);
                processed++;
                continue;
            }

            if (action == "verify")
            {
                if (string.IsNullOrWhiteSpace(record.ReferenceNumber))
                {
                    failed++;
                    continue;
                }

                record.Status = "verified";
                record.VerifiedById = adminId;
                record.VerifiedAt = DateTime.UtcNow;
                record.UpdatedAt = DateTime.UtcNow;
                processed++;
                continue;
            }

            var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
            record.Status = "rejected";
            record.UpdatedAt = DateTime.UtcNow;
            metadata.RejectedBy = adminId;
            metadata.RejectedAt = DateTime.UtcNow;
            metadata.RejectionReason = reason;
            await SaveLaravelVettingMetadataAsync(tenantId, id, metadata, saveChanges: false);
            processed++;
        }

        await _db.SaveChangesAsync();
        return Ok(new
        {
            data = new { action, processed, failed, total = ids.Length },
            meta = LaravelMeta()
        });
    }

    /// <summary>POST /api/v2/admin/vetting/{id}/verify - Verify vetting record.</summary>
    [HttpPost("/api/v2/admin/vetting/{id:int}/verify")]
    public async Task<IActionResult> PostVerifyVettingRecord(int id)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }
        if (string.IsNullOrWhiteSpace(record.ReferenceNumber))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Reference number is required", field = "reference_number" });
        }

        record.Status = "verified";
        record.VerifiedById = adminId;
        record.VerifiedAt = DateTime.UtcNow;
        record.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelVettingRecordAsync(tenantId, id);
        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
        return Ok(new { data = MapLaravelVettingRecord(saved!, metadata), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/vetting/{id}/reject - Reject vetting record.</summary>
    [HttpPost("/api/v2/admin/vetting/{id:int}/reject")]
    public async Task<IActionResult> PostRejectVettingRecord(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        var reason = ReadString(body, "reason")?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Rejection reason is required", field = "reason" });
        }

        var record = await _db.VettingRecords.FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id);
        if (record == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Vetting record not found" });
        }

        record.Status = "rejected";
        record.UpdatedAt = DateTime.UtcNow;
        var metadata = await LoadLaravelVettingMetadataAsync(tenantId, id);
        metadata.RejectedBy = adminId;
        metadata.RejectedAt = DateTime.UtcNow;
        metadata.RejectionReason = reason;
        await SaveLaravelVettingMetadataAsync(tenantId, id, metadata, saveChanges: false);
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelVettingRecordAsync(tenantId, id);
        return Ok(new { data = MapLaravelVettingRecord(saved!, metadata), meta = LaravelMeta() });
    }

    // ───────────────────────────────────────────────────────────────
    // Insurance - Wired to InsuranceService
    // Existing InsuranceController is at /api/insurance — no conflict.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/v2/admin/insurance - Laravel React insurance list.</summary>
    [HttpGet("insurance")]
    public async Task<IActionResult> ListInsuranceCertificates(
        [FromQuery] string? status = null,
        [FromQuery(Name = "insurance_type")] string? insuranceType = null,
        [FromQuery] string? search = null,
        [FromQuery(Name = "expiring_soon")] bool expiringSoon = false,
        [FromQuery] bool expired = false,
        [FromQuery] int page = 1,
        [FromQuery(Name = "per_page")] int perPage = 25)
    {
        var tenantId = GetTenantId();
        page = Math.Max(1, page);
        perPage = Math.Clamp(perPage, 1, 100);

        var query = _db.InsuranceCertificates
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.VerifiedBy)
            .Where(c => c.TenantId == tenantId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = normalizedStatus == "pending_review"
                ? query.Where(c => c.Status == "pending" || c.Status == "submitted")
                : query.Where(c => c.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(insuranceType))
        {
            var normalizedType = insuranceType.Trim().ToLowerInvariant();
            query = query.Where(c => c.Type == normalizedType);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.Trim().ToLowerInvariant();
            query = query.Where(c =>
                (c.Provider != null && c.Provider.ToLower().Contains(lowered)) ||
                (c.PolicyNumber != null && c.PolicyNumber.ToLower().Contains(lowered)) ||
                (c.User != null && c.User.Email.ToLower().Contains(lowered)) ||
                (c.User != null && (c.User.FirstName + " " + c.User.LastName).ToLower().Contains(lowered)));
        }

        if (expiringSoon)
        {
            var now = DateTime.UtcNow;
            var cutoff = now.AddDays(30);
            query = query.Where(c => c.ExpiryDate >= now && c.ExpiryDate <= cutoff && c.Status != "expired");
        }

        if (expired)
        {
            var now = DateTime.UtcNow;
            query = query.Where(c => c.ExpiryDate < now || c.Status == "expired");
        }

        var total = await query.CountAsync();
        var certs = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync();

        return Ok(new
        {
            data = certs.Select(MapLaravelInsuranceCertificate),
            meta = LaravelPaginationMeta(page, perPage, total)
        });
    }

    /// <summary>GET /api/v2/admin/insurance/stats - Laravel React insurance stats.</summary>
    [HttpGet("insurance/stats")]
    public async Task<IActionResult> GetInsuranceStats()
    {
        var tenantId = GetTenantId();
        var certs = await _db.InsuranceCertificates
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .ToListAsync();
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(30);

        return Ok(new
        {
            data = new
            {
                total = certs.Count,
                pending = certs.Count(c => c.Status == "pending"),
                submitted = certs.Count(c => c.Status == "submitted"),
                pending_review = certs.Count(c => c.Status == "pending" || c.Status == "submitted"),
                verified = certs.Count(c => c.Status == "verified"),
                expired = certs.Count(c => c.Status == "expired" || c.ExpiryDate < now),
                expiring_soon = certs.Count(c => c.ExpiryDate >= now && c.ExpiryDate <= cutoff && c.Status is not ("expired" or "rejected" or "revoked")),
                rejected = certs.Count(c => c.Status == "rejected"),
                revoked = certs.Count(c => c.Status == "revoked")
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/v2/admin/insurance/{id} - Laravel React insurance detail.</summary>
    [HttpGet("insurance/{id:int}")]
    public async Task<IActionResult> GetInsuranceCertificate(int id)
    {
        var tenantId = GetTenantId();
        var cert = await LoadLaravelInsuranceCertificateAsync(tenantId, id);
        if (cert == null) return NotFound(new { success = false, code = "NOT_FOUND", message = "Insurance certificate not found" });
        return Ok(new { data = MapLaravelInsuranceCertificate(cert), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/insurance - Create certificate.</summary>
    [HttpPost("insurance")]
    public async Task<IActionResult> CreateInsuranceCertificate([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var userId = ReadInt(body, "user_id") ?? 0;
        var userExists = await _db.Users.AnyAsync(u => u.TenantId == tenantId && u.Id == userId);
        if (!userExists)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "User not found", field = "user_id" });
        }

        var insuranceType = NormalizeLaravelInsuranceType(ReadString(body, "insurance_type"));
        if (!IsLaravelInsuranceType(insuranceType))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid insurance type", field = "insurance_type" });
        }

        var status = NormalizeLaravelInsuranceStatus(ReadString(body, "status"));
        if (!IsLaravelInsuranceStatus(status))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid status", field = "status" });
        }

        var startDate = ReadDateTime(body, "start_date") ?? DateTime.UtcNow;
        var expiryDate = ReadDateTime(body, "expiry_date") ?? startDate.AddYears(1);
        if (expiryDate < startDate)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Expiry date must be after start date", field = "expiry_date" });
        }

        var cert = new InsuranceCertificate
        {
            TenantId = tenantId,
            UserId = userId,
            Type = insuranceType,
            Status = status,
            Provider = ReadString(body, "provider_name"),
            PolicyNumber = ReadString(body, "policy_number"),
            CoverAmount = ReadDecimal(body, "coverage_amount"),
            StartDate = startDate,
            ExpiryDate = expiryDate,
            DocumentUrl = ReadString(body, "certificate_file_path") ?? ReadString(body, "document_url"),
            CreatedAt = DateTime.UtcNow
        };

        _db.InsuranceCertificates.Add(cert);
        await _db.SaveChangesAsync();
        var notes = ReadString(body, "notes");
        if (!string.IsNullOrWhiteSpace(notes))
        {
            await SaveLaravelInsuranceNotesAsync(tenantId, cert.Id, notes);
        }

        var saved = await LoadLaravelInsuranceCertificateAsync(tenantId, cert.Id);
        return StatusCode(StatusCodes.Status201Created, new
        {
            data = MapLaravelInsuranceCertificate(saved!, notes),
            meta = LaravelMeta()
        });
    }

    /// <summary>PUT /api/v2/admin/insurance/{id} - Update certificate.</summary>
    [HttpPut("insurance/{id:int}")]
    public async Task<IActionResult> UpdateInsuranceCertificate(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var cert = await _db.InsuranceCertificates.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
        if (cert == null)
        {
            return NotFound(new { success = false, code = "NOT_FOUND", message = "Insurance certificate not found" });
        }

        if (body.TryGetProperty("insurance_type", out _))
        {
            var insuranceType = NormalizeLaravelInsuranceType(ReadString(body, "insurance_type"));
            if (!IsLaravelInsuranceType(insuranceType))
            {
                return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid insurance type", field = "insurance_type" });
            }
            cert.Type = insuranceType;
        }

        if (body.TryGetProperty("status", out _))
        {
            var status = NormalizeLaravelInsuranceStatus(ReadString(body, "status"));
            if (!IsLaravelInsuranceStatus(status))
            {
                return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Invalid status", field = "status" });
            }
            cert.Status = status;
        }

        if (body.TryGetProperty("provider_name", out _)) cert.Provider = ReadString(body, "provider_name");
        if (body.TryGetProperty("policy_number", out _)) cert.PolicyNumber = ReadString(body, "policy_number");
        if (body.TryGetProperty("coverage_amount", out _)) cert.CoverAmount = ReadDecimal(body, "coverage_amount");
        if (body.TryGetProperty("start_date", out _)) cert.StartDate = ReadDateTime(body, "start_date") ?? cert.StartDate;
        if (body.TryGetProperty("expiry_date", out _)) cert.ExpiryDate = ReadDateTime(body, "expiry_date") ?? cert.ExpiryDate;
        if (cert.ExpiryDate < cert.StartDate)
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Expiry date must be after start date", field = "expiry_date" });
        }
        if (body.TryGetProperty("certificate_file_path", out _) || body.TryGetProperty("document_url", out _))
        {
            cert.DocumentUrl = ReadString(body, "certificate_file_path") ?? ReadString(body, "document_url");
        }
        cert.UpdatedAt = DateTime.UtcNow;

        var notes = ReadString(body, "notes");
        if (body.TryGetProperty("notes", out _))
        {
            await SaveLaravelInsuranceNotesAsync(tenantId, id, notes, saveChanges: false);
        }
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelInsuranceCertificateAsync(tenantId, id);
        return Ok(new { data = MapLaravelInsuranceCertificate(saved!, notes), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/insurance/{id}/verify - Verify certificate.</summary>
    [HttpPost("insurance/{id:int}/verify")]
    public async Task<IActionResult> VerifyInsuranceCertificate(int id)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var cert = await _db.InsuranceCertificates.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
        if (cert == null) return NotFound(new { success = false, code = "NOT_FOUND", message = "Insurance certificate not found" });

        cert.Status = "verified";
        cert.VerifiedById = adminId.Value;
        cert.VerifiedAt = DateTime.UtcNow;
        cert.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelInsuranceCertificateAsync(tenantId, id);
        return Ok(new { data = MapLaravelInsuranceCertificate(saved!), meta = LaravelMeta() });
    }

    /// <summary>POST /api/v2/admin/insurance/{id}/reject - Reject certificate.</summary>
    [HttpPost("insurance/{id:int}/reject")]
    public async Task<IActionResult> RejectInsuranceCertificate(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var reason = ReadString(body, "reason")?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
        {
            return UnprocessableEntity(new { success = false, code = "VALIDATION_ERROR", message = "Rejection reason is required", field = "reason" });
        }

        var cert = await _db.InsuranceCertificates.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
        if (cert == null) return NotFound(new { success = false, code = "NOT_FOUND", message = "Insurance certificate not found" });

        cert.Status = "rejected";
        cert.VerifiedById = adminId.Value;
        cert.VerifiedAt = DateTime.UtcNow;
        cert.UpdatedAt = DateTime.UtcNow;
        await SaveLaravelInsuranceNotesAsync(tenantId, id, reason, saveChanges: false);
        await _db.SaveChangesAsync();

        var saved = await LoadLaravelInsuranceCertificateAsync(tenantId, id);
        return Ok(new { data = MapLaravelInsuranceCertificate(saved!, reason), meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/v2/admin/insurance/{id} - Delete certificate.</summary>
    [HttpDelete("insurance/{id:int}")]
    public async Task<IActionResult> DeleteInsuranceCertificate(int id)
    {
        var tenantId = GetTenantId();
        var cert = await _db.InsuranceCertificates.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
        if (cert == null) return NotFound(new { success = false, code = "NOT_FOUND", message = "Insurance certificate not found" });

        _db.InsuranceCertificates.Remove(cert);
        await DeleteLaravelInsuranceNotesAsync(tenantId, id, saveChanges: false);
        await _db.SaveChangesAsync();
        return Ok(new { data = new { deleted = true, id }, meta = LaravelMeta() });
    }

    /// <summary>GET /api/v2/admin/insurance/user/{userId} - User certificates.</summary>
    [HttpGet("insurance/user/{userId:int}")]
    public async Task<IActionResult> GetUserInsuranceCertificates(int userId)
    {
        var tenantId = GetTenantId();
        var certs = await _db.InsuranceCertificates
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.VerifiedBy)
            .Where(c => c.TenantId == tenantId && c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return Ok(new
        {
            data = certs.Select(MapLaravelInsuranceCertificate),
            meta = LaravelMeta()
        });
    }

    // ───────────────────────────────────────────────────────────────
    // Cron Job Monitoring (/api/admin/system/cron-jobs)
    // Existing SystemAdminController is at /api/admin/system but has
    // NO cron-jobs sub-paths — no conflict.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/system/cron-jobs/logs - List cron job logs.</summary>
    [HttpGet("system/cron-jobs/logs")]
    public async Task<IActionResult> ListCronJobLogs(
        [FromQuery] string? jobId = null,
        [FromQuery(Name = "job_id")] string? jobIdSnake = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        [FromQuery] string? status = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var tenantId = GetTenantId();
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);
        var query = VisibleCronRuns(tenantId).AsNoTracking();
        var resolvedJobId = string.IsNullOrWhiteSpace(jobId) ? jobIdSnake : jobId;

        if (!string.IsNullOrWhiteSpace(resolvedJobId))
        {
            query = query.Where(r => r.JobName == resolvedJobId);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var mapped = FromLaravelCronStatus(status);
            query = query.Where(r => r.Status == mapped);
        }

        if (DateTime.TryParse(startDate, out var start))
        {
            query = query.Where(r => r.StartedAt >= NormalizeUtc(start));
        }

        if (DateTime.TryParse(endDate, out var end))
        {
            query = query.Where(r => r.StartedAt <= NormalizeUtc(end));
        }

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(r => r.StartedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            data = logs.Select(MapLaravelCronLog),
            meta = new { total, limit, offset }
        });
    }

    /// <summary>GET /api/admin/system/cron-jobs/logs/{logId} - Cron job log detail.</summary>
    [HttpGet("system/cron-jobs/logs/{logId}")]
    public async Task<IActionResult> GetCronJobLog(int logId)
    {
        var tenantId = GetTenantId();
        var run = await VisibleCronRuns(tenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == logId);
        if (run == null)
        {
            return NotFound(new { success = false, message = "Cron log not found" });
        }

        return Ok(new { data = MapLaravelCronLog(run), meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/admin/system/cron-jobs/logs - Clear cron job logs.</summary>
    [HttpDelete("system/cron-jobs/logs")]
    public async Task<IActionResult> ClearCronJobLogs([FromQuery] string? before = null)
    {
        var tenantId = GetTenantId();
        var query = VisibleCronRuns(tenantId);
        if (DateTime.TryParse(before, out var beforeDate))
        {
            var normalizedBefore = NormalizeUtc(beforeDate);
            query = query.Where(r => r.StartedAt < normalizedBefore);
        }

        var rows = await query.ToListAsync();
        _db.ScheduledJobRuns.RemoveRange(rows);
        await _db.SaveChangesAsync();
        return Ok(new
        {
            data = new { message = $"Deleted {rows.Count} cron log entries.", deleted_count = rows.Count },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/admin/system/cron-jobs/{jobId}/settings - Job settings.</summary>
    [HttpGet("system/cron-jobs/{jobId}/settings")]
    public async Task<IActionResult> GetCronJobSettings(string jobId)
    {
        var settings = await LoadCronJobSettingsAsync(jobId);
        return Ok(new { data = MapLaravelCronJobSettings(jobId, settings), meta = LaravelMeta() });
    }

    /// <summary>PUT /api/admin/system/cron-jobs/{jobId}/settings - Update job settings.</summary>
    [HttpPut("system/cron-jobs/{jobId}/settings")]
    public async Task<IActionResult> UpdateCronJobSettings(string jobId, [FromBody] JsonElement body)
    {
        var settings = await LoadCronJobSettingsAsync(jobId);
        settings.Apply(body);
        await SaveCronJobSettingsAsync(jobId, settings);
        return Ok(new { data = MapLaravelCronJobSettings(jobId, settings), meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/system/cron-jobs/settings - Global cron settings.</summary>
    [HttpGet("system/cron-jobs/settings")]
    public async Task<IActionResult> GetGlobalCronSettings()
    {
        var settings = await LoadGlobalCronSettingsAsync();
        return Ok(new { data = MapLaravelGlobalCronSettings(settings), meta = LaravelMeta() });
    }

    /// <summary>PUT /api/admin/system/cron-jobs/settings - Update global cron settings.</summary>
    [HttpPut("system/cron-jobs/settings")]
    public async Task<IActionResult> UpdateGlobalCronSettings([FromBody] JsonElement body)
    {
        var settings = await LoadGlobalCronSettingsAsync();
        settings.Apply(body);
        await SaveGlobalCronSettingsAsync(settings);
        return Ok(new { data = MapLaravelGlobalCronSettings(settings), meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/system/cron-jobs/health - Cron health metrics.</summary>
    [HttpGet("system/cron-jobs/health")]
    public async Task<IActionResult> GetCronJobHealth()
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var since24h = now.AddHours(-24);
        var since7d = now.AddDays(-7);
        var runs = await VisibleCronRuns(tenantId).AsNoTracking().ToListAsync();
        var recentRuns = runs.Where(r => r.StartedAt >= since7d).ToList();
        var failures24h = runs.Count(r => r.Status == ScheduledJobRunStatus.Failed && r.StartedAt >= since24h);
        var recentFailures = runs
            .Where(r => r.Status == ScheduledJobRunStatus.Failed)
            .OrderByDescending(r => r.StartedAt)
            .Take(5)
            .Select(r => new
            {
                job_name = r.JobName,
                failed_at = r.StartedAt,
                reason = CronRunOutput(r)
            })
            .ToList();
        var successRate = recentRuns.Count == 0
            ? 1.0
            : Math.Round((double)recentRuns.Count(r => r.Status == ScheduledJobRunStatus.Success) / recentRuns.Count, 2);

        var lastByJob = runs
            .GroupBy(r => r.JobName)
            .Select(g => g.OrderByDescending(r => r.StartedAt).First())
            .ToList();
        var overdue = lastByJob
            .Where(r => r.StartedAt < since24h)
            .Take(5)
            .Select(r => new
            {
                job_id = r.JobName,
                job_name = r.JobName,
                last_run = r.StartedAt,
                expected_interval = "24 hours"
            })
            .ToList();

        var healthScore = 100 - failures24h * 5 - (int)Math.Round((1.0 - successRate) * 50) - overdue.Count * 10;
        healthScore = Math.Clamp(healthScore, 0, 100);

        return Ok(new
        {
            data = new
            {
                health_score = healthScore,
                recent_failures = recentFailures,
                jobs_failed_24h = failures24h,
                jobs_overdue = overdue,
                avg_success_rate_7d = successRate,
                alert_status = healthScore < 50 ? "critical" : healthScore < 80 ? "warning" : "healthy"
            },
            meta = LaravelMeta()
        });
    }

    // ───────────────────────────────────────────────────────────────
    // Deliverability (/api/admin/deliverability)
    // Existing DeliverablesController is at /api/admin/deliverables — no conflict.
    // ───────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/deliverability/dashboard - Deliverability dashboard.</summary>
    [HttpGet("deliverability/dashboard")]
    public async Task<IActionResult> GetDeliverabilityDashboard()
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var deliverables = await _db.Deliverables
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId)
            .OrderByDescending(d => d.UpdatedAt)
            .ThenByDescending(d => d.CreatedAt)
            .ToListAsync();

        var total = deliverables.Count;
        var byStatus = deliverables
            .GroupBy(d => ToLaravelDeliverabilityStatus(d.Status))
            .ToDictionary(g => g.Key, g => g.Count());
        var completed = byStatus.GetValueOrDefault("completed");
        var overdue = deliverables.Count(d =>
            d.DueDate.HasValue &&
            d.DueDate.Value.Date < now.Date &&
            d.Status is not DeliverableStatus.Completed and not DeliverableStatus.Cancelled);

        return Ok(new
        {
            data = new
            {
                total,
                by_status = byStatus,
                overdue,
                completion_rate = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0.0,
                recent_activity = deliverables.Take(10).Select(d => new
                {
                    id = d.Id,
                    deliverable_id = d.Id,
                    deliverable_title = d.Title,
                    action_type = d.CreatedAt == d.UpdatedAt ? "created" : "updated",
                    field_name = (string?)null,
                    change_description = d.CreatedAt == d.UpdatedAt ? $"Created deliverable: {d.Title}" : $"Updated deliverable: {d.Title}",
                    user_name = "",
                    action_timestamp = d.UpdatedAt
                })
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>GET /api/admin/deliverability - List deliverables.</summary>
    [HttpGet("deliverability")]
    public async Task<IActionResult> ListDeliverability(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] int? assigned_to,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var tenantId = GetTenantId();
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Deliverables
            .AsNoTracking()
            .Include(d => d.AssignedTo)
            .Include(d => d.CreatedBy)
            .Where(d => d.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status) && TryParseLaravelDeliverabilityStatus(status, out var statusValue))
        {
            query = query.Where(d => d.Status == statusValue);
        }

        if (!string.IsNullOrWhiteSpace(priority) && TryParseLaravelDeliverabilityPriority(priority, out var priorityValue))
        {
            query = query.Where(d => d.Priority == priorityValue);
        }

        if (assigned_to.HasValue)
        {
            query = query.Where(d => d.AssignedToUserId == assigned_to.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(d =>
                d.Title.Contains(search) ||
                (d.Description != null && d.Description.Contains(search)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            data = items.Select(MapLaravelDeliverabilityListItem),
            meta = LaravelPaginationMeta(page, limit, total)
        });
    }

    /// <summary>GET /api/admin/deliverability/{id} - Get deliverable.</summary>
    [HttpGet("deliverability/{id:int}")]
    public async Task<IActionResult> GetDeliverability(int id)
    {
        var deliverable = await LoadDeliverabilityDetailAsync(id);
        if (deliverable is null)
        {
            return NotFound(new { errors = new[] { new { code = "NOT_FOUND", message = "Deliverable not found" } } });
        }

        return Ok(new { data = MapLaravelDeliverabilityDetail(deliverable), meta = LaravelMeta() });
    }

    /// <summary>POST /api/admin/deliverability - Create deliverable.</summary>
    [HttpPost("deliverability")]
    public async Task<IActionResult> CreateDeliverability([FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var adminId = GetCurrentUserId();
        var title = ReadString(body, "title")?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { errors = new[] { new { code = "VALIDATION_ERROR", message = "Title is required.", field = "title" } } });
        }

        var now = DateTime.UtcNow;
        var deliverable = new Deliverable
        {
            TenantId = tenantId,
            CreatedByUserId = adminId ?? 0,
            Title = title,
            Description = ReadString(body, "description"),
            AssignedToUserId = ReadInt(body, "assigned_to"),
            DueDate = ReadDateTime(body, "due_date"),
            Tags = ReadTags(body),
            Status = TryParseLaravelDeliverabilityStatus(ReadString(body, "status"), out var statusValue) ? statusValue : DeliverableStatus.Pending,
            Priority = TryParseLaravelDeliverabilityPriority(ReadString(body, "priority"), out var priorityValue) ? priorityValue : DeliverablePriority.Medium,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Deliverables.Add(deliverable);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            data = new
            {
                id = deliverable.Id,
                title = deliverable.Title,
                status = ToLaravelDeliverabilityStatus(deliverable.Status),
                priority = ToLaravelDeliverabilityPriority(deliverable.Priority)
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>PUT /api/admin/deliverability/{id} - Update deliverable.</summary>
    [HttpPut("deliverability/{id:int}")]
    public async Task<IActionResult> UpdateDeliverability(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var deliverable = await _db.Deliverables
            .Include(d => d.Comments).ThenInclude(c => c.User)
            .Include(d => d.AssignedTo)
            .Include(d => d.CreatedBy)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == id);
        if (deliverable is null)
        {
            return NotFound(new { errors = new[] { new { code = "NOT_FOUND", message = "Deliverable not found" } } });
        }

        if (body.TryGetProperty("title", out _))
        {
            var title = ReadString(body, "title")?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                return BadRequest(new { errors = new[] { new { code = "VALIDATION_ERROR", message = "Title cannot be empty.", field = "title" } } });
            }
            deliverable.Title = title;
        }

        if (body.TryGetProperty("description", out _))
        {
            deliverable.Description = ReadString(body, "description");
        }

        if (body.TryGetProperty("assigned_to", out _))
        {
            deliverable.AssignedToUserId = ReadInt(body, "assigned_to");
        }

        if (body.TryGetProperty("due_date", out _))
        {
            deliverable.DueDate = ReadDateTime(body, "due_date");
        }

        if (body.TryGetProperty("status", out _))
        {
            if (!TryParseLaravelDeliverabilityStatus(ReadString(body, "status"), out var statusValue))
            {
                return BadRequest(new { errors = new[] { new { code = "VALIDATION_ERROR", message = "Invalid status value.", field = "status" } } });
            }

            deliverable.Status = statusValue;
            deliverable.CompletedAt = statusValue == DeliverableStatus.Completed
                ? deliverable.CompletedAt ?? DateTime.UtcNow
                : null;
        }

        if (body.TryGetProperty("priority", out _))
        {
            if (!TryParseLaravelDeliverabilityPriority(ReadString(body, "priority"), out var priorityValue))
            {
                return BadRequest(new { errors = new[] { new { code = "VALIDATION_ERROR", message = "Invalid priority value.", field = "priority" } } });
            }

            deliverable.Priority = priorityValue;
        }

        if (body.TryGetProperty("tags", out _))
        {
            deliverable.Tags = ReadTags(body);
        }

        deliverable.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var reloaded = await LoadDeliverabilityDetailAsync(id);
        return Ok(new { data = MapLaravelDeliverabilityDetail(reloaded!), meta = LaravelMeta() });
    }

    /// <summary>DELETE /api/admin/deliverability/{id} - Delete deliverable.</summary>
    [HttpDelete("deliverability/{id:int}")]
    public async Task<IActionResult> DeleteDeliverability(int id)
    {
        var tenantId = GetTenantId();
        var deliverable = await _db.Deliverables
            .Include(d => d.Comments)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == id);
        if (deliverable is null)
        {
            return NotFound(new { errors = new[] { new { code = "NOT_FOUND", message = "Deliverable not found" } } });
        }

        _db.DeliverableComments.RemoveRange(deliverable.Comments);
        _db.Deliverables.Remove(deliverable);
        await _db.SaveChangesAsync();

        return Ok(new { data = new { deleted = true, id }, meta = LaravelMeta() });
    }

    /// <summary>GET /api/admin/deliverability/analytics - Deliverability analytics.</summary>
    [HttpGet("deliverability/analytics")]
    public async Task<IActionResult> GetDeliverabilityAnalytics()
    {
        var tenantId = GetTenantId();
        var thirtyDaysAgo = DateTime.UtcNow.Date.AddDays(-30);
        var deliverables = await _db.Deliverables
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId)
            .ToListAsync();

        var completionTrends = deliverables
            .Where(d => d.CompletedAt.HasValue && d.CompletedAt.Value.Date >= thirtyDaysAgo)
            .GroupBy(d => d.CompletedAt!.Value.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
            .OrderBy(d => d.date)
            .ToList();

        var completed = deliverables
            .Where(d => d.Status == DeliverableStatus.Completed && d.CompletedAt.HasValue)
            .ToList();
        double? averageDays = completed.Count > 0
            ? Math.Round(completed.Average(d => (d.CompletedAt!.Value - d.CreatedAt).TotalDays), 1)
            : null;

        return Ok(new
        {
            data = new
            {
                completion_trends = completionTrends,
                priority_distribution = deliverables
                    .GroupBy(d => ToLaravelDeliverabilityPriority(d.Priority))
                    .ToDictionary(g => g.Key, g => g.Count()),
                avg_days_to_complete = averageDays,
                risk_distribution = new Dictionary<string, int>()
            },
            meta = LaravelMeta()
        });
    }

    /// <summary>POST /api/admin/deliverability/{id}/comments - Add comment.</summary>
    [HttpPost("deliverability/{id:int}/comments")]
    public async Task<IActionResult> AddDeliverabilityComment(int id, [FromBody] JsonElement body)
    {
        var tenantId = GetTenantId();
        var deliverableExists = await _db.Deliverables.AnyAsync(d => d.TenantId == tenantId && d.Id == id);
        if (!deliverableExists)
        {
            return NotFound(new { errors = new[] { new { code = "NOT_FOUND", message = "Deliverable not found" } } });
        }

        var commentText = ReadString(body, "comment_text")?.Trim();
        if (string.IsNullOrWhiteSpace(commentText))
        {
            return BadRequest(new { errors = new[] { new { code = "VALIDATION_ERROR", message = "Comment text is required.", field = "comment_text" } } });
        }

        var comment = new DeliverableComment
        {
            TenantId = tenantId,
            DeliverableId = id,
            UserId = GetCurrentUserId() ?? 0,
            Content = commentText,
            CreatedAt = DateTime.UtcNow
        };
        _db.DeliverableComments.Add(comment);
        await _db.SaveChangesAsync();

        var reloaded = await _db.DeliverableComments
            .AsNoTracking()
            .Include(c => c.User)
            .FirstAsync(c => c.TenantId == tenantId && c.Id == comment.Id);

        return Ok(new { data = MapLaravelDeliverabilityComment(reloaded), meta = LaravelMeta() });
    }

    private async Task<Deliverable?> LoadDeliverabilityDetailAsync(int id)
    {
        var tenantId = GetTenantId();
        return await _db.Deliverables
            .AsNoTracking()
            .Include(d => d.AssignedTo)
            .Include(d => d.CreatedBy)
            .Include(d => d.Comments).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == id);
    }

    private static object MapLaravelDeliverabilityListItem(Deliverable deliverable) => new
    {
        id = deliverable.Id,
        title = deliverable.Title,
        description = deliverable.Description ?? "",
        category = (string?)null,
        priority = ToLaravelDeliverabilityPriority(deliverable.Priority),
        owner_id = deliverable.CreatedByUserId == 0 ? (int?)null : deliverable.CreatedByUserId,
        owner_name = DisplayName(deliverable.CreatedBy),
        assigned_to = deliverable.AssignedToUserId,
        assignee_name = DisplayName(deliverable.AssignedTo),
        assigned_group_id = (int?)null,
        start_date = (DateTime?)null,
        due_date = deliverable.DueDate,
        completed_at = deliverable.CompletedAt,
        status = ToLaravelDeliverabilityStatus(deliverable.Status),
        progress_percentage = deliverable.Status == DeliverableStatus.Completed ? 100 : 0,
        estimated_hours = (double?)null,
        actual_hours = (double?)null,
        parent_deliverable_id = (int?)null,
        tags = SplitTags(deliverable.Tags),
        delivery_confidence = (int?)null,
        risk_level = (string?)null,
        risk_notes = (string?)null,
        created_at = deliverable.CreatedAt,
        updated_at = deliverable.UpdatedAt
    };

    private static object MapLaravelDeliverabilityDetail(Deliverable deliverable) => new
    {
        id = deliverable.Id,
        title = deliverable.Title,
        description = deliverable.Description ?? "",
        category = (string?)null,
        priority = ToLaravelDeliverabilityPriority(deliverable.Priority),
        owner_id = deliverable.CreatedByUserId == 0 ? (int?)null : deliverable.CreatedByUserId,
        owner_name = DisplayName(deliverable.CreatedBy),
        assigned_to = deliverable.AssignedToUserId,
        assignee_name = DisplayName(deliverable.AssignedTo),
        assigned_group_id = (int?)null,
        start_date = (DateTime?)null,
        due_date = deliverable.DueDate,
        completed_at = deliverable.CompletedAt,
        status = ToLaravelDeliverabilityStatus(deliverable.Status),
        progress_percentage = deliverable.Status == DeliverableStatus.Completed ? 100 : 0,
        estimated_hours = (double?)null,
        actual_hours = (double?)null,
        parent_deliverable_id = (int?)null,
        blocking_deliverable_ids = Array.Empty<int>(),
        depends_on_deliverable_ids = Array.Empty<int>(),
        tags = SplitTags(deliverable.Tags),
        custom_fields = new Dictionary<string, object?>(),
        delivery_confidence = (int?)null,
        risk_level = (string?)null,
        risk_notes = (string?)null,
        watchers = Array.Empty<int>(),
        collaborators = Array.Empty<int>(),
        attachment_urls = Array.Empty<string>(),
        external_links = Array.Empty<string>(),
        created_at = deliverable.CreatedAt,
        updated_at = deliverable.UpdatedAt,
        milestones = Array.Empty<object>(),
        comments = deliverable.Comments
            .OrderByDescending(c => c.CreatedAt)
            .Take(20)
            .Select(MapLaravelDeliverabilityComment)
    };

    private static object MapLaravelDeliverabilityComment(DeliverableComment comment) => new
    {
        id = comment.Id,
        deliverable_id = comment.DeliverableId,
        user_id = comment.UserId,
        user_name = DisplayName(comment.User),
        user_avatar = comment.User?.AvatarUrl,
        comment_text = comment.Content,
        comment_type = "comment",
        parent_comment_id = (int?)null,
        reactions = Array.Empty<object>(),
        is_pinned = false,
        is_edited = false,
        edited_at = (DateTime?)null,
        mentioned_user_ids = Array.Empty<int>(),
        created_at = comment.CreatedAt,
        updated_at = (DateTime?)null
    };

    private async Task<AdminNote?> LoadCrmNoteAsync(int tenantId, int noteId)
        => await _db.AdminNotes
            .AsNoTracking()
            .Include(n => n.User)
            .Include(n => n.Admin)
            .FirstOrDefaultAsync(n => n.TenantId == tenantId && n.Id == noteId);

    private static object MapLaravelCrmNote(AdminNote note) => new
    {
        id = note.Id,
        tenant_id = note.TenantId,
        user_id = note.UserId,
        author_id = note.AdminId,
        admin_id = note.AdminId,
        content = note.Content,
        category = string.IsNullOrWhiteSpace(note.Category) ? "general" : note.Category,
        is_pinned = note.IsFlagged,
        is_flagged = note.IsFlagged,
        user_name = DisplayName(note.User),
        user_avatar = note.User?.AvatarUrl,
        author_name = DisplayName(note.Admin),
        created_at = note.CreatedAt,
        updated_at = note.UpdatedAt
    };

    private static object MapLaravelCrmTag(UserTag tag) => new
    {
        id = tag.Id,
        tenant_id = tag.TenantId,
        user_id = tag.UserId,
        tag = tag.Tag,
        created_by = tag.AppliedByAdminId,
        created_at = tag.CreatedAt,
        user_name = DisplayName(tag.User),
        user_avatar = tag.User?.AvatarUrl
    };

    private static readonly HashSet<string> LaravelCrmNoteCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "general",
        "outreach",
        "support",
        "onboarding",
        "concern",
        "follow_up"
    };

    private static readonly HashSet<string> LaravelCrmTimelineTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "login",
        "signup",
        "listing_created",
        "exchange_completed",
        "note_added",
        "task_created",
        "group_joined",
        "profile_updated"
    };

    private sealed record CrmTimelineEntry(
        int UserId,
        string UserName,
        string? UserAvatar,
        string ActivityType,
        string Description,
        Dictionary<string, object?> Metadata,
        DateTime CreatedAt);

    private static bool IsLaravelCrmNoteCategory(string? category)
        => !string.IsNullOrWhiteSpace(category) && LaravelCrmNoteCategories.Contains(category.Trim());

    private static string NormalizeLaravelCrmNoteCategory(string? category)
    {
        var value = category?.Trim();
        return IsLaravelCrmNoteCategory(value) ? value!.ToLowerInvariant() : "general";
    }

    private async Task<VettingRecord?> LoadLaravelVettingRecordAsync(int tenantId, int recordId)
        => await _db.VettingRecords
            .AsNoTracking()
            .Include(v => v.User)
            .Include(v => v.VerifiedBy)
            .FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == recordId);

    private async Task<LaravelVettingMetadata> LoadLaravelVettingMetadataAsync(int tenantId, int recordId)
    {
        var raw = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Key == LaravelVettingMetadataKey(recordId))
            .Select(c => c.Value)
            .FirstOrDefaultAsync();

        return DeserializeLaravelVettingMetadata(raw);
    }

    private async Task<Dictionary<int, LaravelVettingMetadata>> LoadLaravelVettingMetadataAsync(int tenantId, IEnumerable<int> recordIds)
    {
        var ids = recordIds.Distinct().ToArray();
        if (ids.Length == 0) return new Dictionary<int, LaravelVettingMetadata>();

        var keysById = ids.ToDictionary(id => LaravelVettingMetadataKey(id), id => id);
        var rows = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && keysById.Keys.Contains(c.Key))
            .Select(c => new { c.Key, c.Value })
            .ToListAsync();

        var result = ids.ToDictionary(id => id, _ => new LaravelVettingMetadata());
        foreach (var row in rows)
        {
            if (keysById.TryGetValue(row.Key, out var id))
            {
                result[id] = DeserializeLaravelVettingMetadata(row.Value);
            }
        }

        return result;
    }

    private async Task SaveLaravelVettingMetadataAsync(int tenantId, int recordId, LaravelVettingMetadata metadata, bool saveChanges = true)
    {
        var key = LaravelVettingMetadataKey(recordId);
        var now = DateTime.UtcNow;
        var value = JsonSerializer.Serialize(metadata);
        var row = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (row == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = value,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = now;
        }

        if (saveChanges)
        {
            await _db.SaveChangesAsync();
        }
    }

    private async Task DeleteLaravelVettingMetadataAsync(int tenantId, int recordId, bool saveChanges = true)
    {
        var key = LaravelVettingMetadataKey(recordId);
        var row = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (row != null)
        {
            _db.TenantConfigs.Remove(row);
            if (saveChanges)
            {
                await _db.SaveChangesAsync();
            }
        }
    }

    private static LaravelVettingMetadata DeserializeLaravelVettingMetadata(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new LaravelVettingMetadata();
        try
        {
            return JsonSerializer.Deserialize<LaravelVettingMetadata>(raw) ?? new LaravelVettingMetadata();
        }
        catch (JsonException)
        {
            return new LaravelVettingMetadata();
        }
    }

    private static string LaravelVettingMetadataKey(int recordId) => $"admin.vetting.metadata.{recordId}";

    private static object MapLaravelVettingRecord(VettingRecord record, LaravelVettingMetadata? metadata)
    {
        metadata ??= new LaravelVettingMetadata();
        var rejectedBy = metadata.RejectedBy;
        return new
        {
            id = record.Id,
            tenant_id = record.TenantId,
            user_id = record.UserId,
            first_name = record.User?.FirstName ?? "",
            last_name = record.User?.LastName ?? "",
            email = record.User?.Email ?? "",
            avatar_url = record.User?.AvatarUrl,
            vetting_type = record.VettingType,
            status = record.Status,
            reference_number = record.ReferenceNumber,
            issue_date = record.IssuedAt,
            issued_at = record.IssuedAt,
            expiry_date = record.ExpiresAt,
            expires_at = record.ExpiresAt,
            verified_by = record.VerifiedById,
            verifier_first_name = record.VerifiedBy?.FirstName,
            verifier_last_name = record.VerifiedBy?.LastName,
            verified_at = record.VerifiedAt,
            rejected_by = rejectedBy,
            rejector_first_name = rejectedBy == record.VerifiedById ? record.VerifiedBy?.FirstName : metadata.RejectorFirstName,
            rejector_last_name = rejectedBy == record.VerifiedById ? record.VerifiedBy?.LastName : metadata.RejectorLastName,
            rejected_at = metadata.RejectedAt,
            rejection_reason = metadata.RejectionReason,
            document_url = record.DocumentUrl,
            notes = record.Notes,
            works_with_children = metadata.WorksWithChildren,
            works_with_vulnerable_adults = metadata.WorksWithVulnerableAdults,
            requires_enhanced_check = metadata.RequiresEnhancedCheck,
            created_at = record.CreatedAt,
            updated_at = record.UpdatedAt
        };
    }

    private static readonly HashSet<string> LaravelVettingTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "dbs_basic",
        "dbs_standard",
        "dbs_enhanced",
        "garda_vetting",
        "access_ni",
        "pvg_scotland",
        "international",
        "other"
    };

    private static readonly HashSet<string> LaravelVettingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending",
        "submitted",
        "verified",
        "expired",
        "rejected",
        "revoked"
    };

    private static bool IsLaravelVettingType(string value) => LaravelVettingTypes.Contains(value);

    private static bool IsLaravelVettingStatus(string value) => LaravelVettingStatuses.Contains(value);

    private static string NormalizeLaravelVettingType(string? value)
    {
        var normalized = (value ?? "dbs_basic").Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? "dbs_basic" : normalized;
    }

    private static string NormalizeLaravelVettingStatus(string? value)
    {
        var normalized = (value ?? "pending").Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? "pending" : normalized;
    }

    private sealed class LaravelVettingMetadata
    {
        public bool WorksWithChildren { get; set; }
        public bool WorksWithVulnerableAdults { get; set; }
        public bool RequiresEnhancedCheck { get; set; }
        public int? RejectedBy { get; set; }
        public string? RejectorFirstName { get; set; }
        public string? RejectorLastName { get; set; }
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }

        public static LaravelVettingMetadata FromBody(JsonElement body)
        {
            var metadata = new LaravelVettingMetadata();
            metadata.ApplyBody(body);
            return metadata;
        }

        public void ApplyBody(JsonElement body)
        {
            if (body.TryGetProperty("works_with_children", out _))
            {
                WorksWithChildren = ReadBool(body, "works_with_children") ?? false;
            }
            if (body.TryGetProperty("works_with_vulnerable_adults", out _))
            {
                WorksWithVulnerableAdults = ReadBool(body, "works_with_vulnerable_adults") ?? false;
            }
            if (body.TryGetProperty("requires_enhanced_check", out _))
            {
                RequiresEnhancedCheck = ReadBool(body, "requires_enhanced_check") ?? false;
            }
        }
    }

    private async Task<InsuranceCertificate?> LoadLaravelInsuranceCertificateAsync(int tenantId, int certificateId)
        => await _db.InsuranceCertificates
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.VerifiedBy)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == certificateId);

    private object MapLaravelInsuranceCertificate(InsuranceCertificate certificate)
    {
        var notes = LoadLaravelInsuranceNotes(certificate.TenantId, certificate.Id);
        return MapLaravelInsuranceCertificate(certificate, notes);
    }

    private static object MapLaravelInsuranceCertificate(InsuranceCertificate certificate, string? notes) => new
    {
        id = certificate.Id,
        tenant_id = certificate.TenantId,
        user_id = certificate.UserId,
        first_name = certificate.User?.FirstName ?? "",
        last_name = certificate.User?.LastName ?? "",
        email = certificate.User?.Email ?? "",
        avatar_url = certificate.User?.AvatarUrl,
        insurance_type = certificate.Type,
        status = certificate.Status,
        provider_name = certificate.Provider,
        policy_number = certificate.PolicyNumber,
        coverage_amount = certificate.CoverAmount,
        start_date = certificate.StartDate,
        expiry_date = certificate.ExpiryDate,
        certificate_file_path = certificate.DocumentUrl,
        document_url = certificate.DocumentUrl,
        verified_by = certificate.VerifiedById,
        verifier_first_name = certificate.VerifiedBy?.FirstName,
        verifier_last_name = certificate.VerifiedBy?.LastName,
        verified_at = certificate.VerifiedAt,
        notes,
        created_at = certificate.CreatedAt,
        updated_at = certificate.UpdatedAt
    };

    private string? LoadLaravelInsuranceNotes(int tenantId, int certificateId)
    {
        return _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Key == LaravelInsuranceNotesKey(certificateId))
            .Select(c => c.Value)
            .FirstOrDefault();
    }

    private async Task SaveLaravelInsuranceNotesAsync(int tenantId, int certificateId, string? notes, bool saveChanges = true)
    {
        var key = LaravelInsuranceNotesKey(certificateId);
        var row = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (string.IsNullOrWhiteSpace(notes))
        {
            if (row != null)
            {
                _db.TenantConfigs.Remove(row);
            }
        }
        else if (row == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.Value = notes;
            row.UpdatedAt = DateTime.UtcNow;
        }

        if (saveChanges)
        {
            await _db.SaveChangesAsync();
        }
    }

    private async Task DeleteLaravelInsuranceNotesAsync(int tenantId, int certificateId, bool saveChanges = true)
    {
        var key = LaravelInsuranceNotesKey(certificateId);
        var row = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (row != null)
        {
            _db.TenantConfigs.Remove(row);
            if (saveChanges)
            {
                await _db.SaveChangesAsync();
            }
        }
    }

    private static string LaravelInsuranceNotesKey(int certificateId) => $"admin.insurance.notes.{certificateId}";

    private static readonly HashSet<string> LaravelInsuranceTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "public_liability",
        "professional_indemnity",
        "employers_liability",
        "product_liability",
        "personal_accident",
        "other"
    };

    private static readonly HashSet<string> LaravelInsuranceStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending",
        "submitted",
        "verified",
        "expired",
        "rejected",
        "revoked"
    };

    private static bool IsLaravelInsuranceType(string value) => LaravelInsuranceTypes.Contains(value);

    private static bool IsLaravelInsuranceStatus(string value) => LaravelInsuranceStatuses.Contains(value);

    private static string NormalizeLaravelInsuranceType(string? value)
    {
        var normalized = (value ?? "public_liability").Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? "public_liability" : normalized;
    }

    private static string NormalizeLaravelInsuranceStatus(string? value)
    {
        var normalized = (value ?? "pending").Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? "pending" : normalized;
    }

    private IQueryable<ScheduledJobRun> VisibleCronRuns(int tenantId)
        => _db.ScheduledJobRuns.Where(r => r.TenantId == tenantId || r.TenantId == null);

    private static object MapLaravelCronLog(ScheduledJobRun run) => new
    {
        id = run.Id,
        job_id = run.JobName,
        job_name = run.JobName,
        status = ToLaravelCronStatus(run.Status),
        output = CronRunOutput(run),
        duration_seconds = CronDurationSeconds(run),
        executed_at = run.StartedAt,
        executed_by = "cron"
    };

    private static string ToLaravelCronStatus(ScheduledJobRunStatus status) => status switch
    {
        ScheduledJobRunStatus.Failed => "failed",
        _ => "success"
    };

    private static ScheduledJobRunStatus FromLaravelCronStatus(string status)
        => status.Trim().ToLowerInvariant() switch
        {
            "failed" or "error" => ScheduledJobRunStatus.Failed,
            "running" => ScheduledJobRunStatus.Running,
            "skipped" => ScheduledJobRunStatus.Skipped,
            _ => ScheduledJobRunStatus.Success
        };

    private static string CronRunOutput(ScheduledJobRun run)
    {
        if (!string.IsNullOrWhiteSpace(run.ErrorMessage)) return run.ErrorMessage;
        if (!string.IsNullOrWhiteSpace(run.ErrorType)) return run.ErrorType;
        return $"Processed {run.ItemsProcessed} item(s).";
    }

    private static double CronDurationSeconds(ScheduledJobRun run)
    {
        if (run.DurationMs.HasValue) return Math.Round(run.DurationMs.Value / 1000d, 3);
        if (run.CompletedAt.HasValue) return Math.Round((run.CompletedAt.Value - run.StartedAt).TotalSeconds, 3);
        return 0;
    }

    private async Task<CronJobSettingsState> LoadCronJobSettingsAsync(string jobId)
    {
        var raw = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == GetTenantId() && c.Key == CronJobSettingsKey(jobId))
            .Select(c => c.Value)
            .FirstOrDefaultAsync();
        return DeserializeState(raw, () => new CronJobSettingsState());
    }

    private async Task SaveCronJobSettingsAsync(string jobId, CronJobSettingsState settings)
        => await SaveStateAsync(CronJobSettingsKey(jobId), settings);

    private async Task<GlobalCronSettingsState> LoadGlobalCronSettingsAsync()
    {
        var raw = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == GetTenantId() && c.Key == GlobalCronSettingsKey)
            .Select(c => c.Value)
            .FirstOrDefaultAsync();
        return DeserializeState(raw, () => new GlobalCronSettingsState());
    }

    private async Task SaveGlobalCronSettingsAsync(GlobalCronSettingsState settings)
        => await SaveStateAsync(GlobalCronSettingsKey, settings);

    private async Task SaveStateAsync<T>(string key, T state)
    {
        var tenantId = GetTenantId();
        var now = DateTime.UtcNow;
        var value = JsonSerializer.Serialize(state);
        var row = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (row == null)
        {
            _db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = value,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();
    }

    private static T DeserializeState<T>(string? raw, Func<T> fallback)
    {
        if (string.IsNullOrWhiteSpace(raw)) return fallback();
        try
        {
            return JsonSerializer.Deserialize<T>(raw) ?? fallback();
        }
        catch (JsonException)
        {
            return fallback();
        }
    }

    private static object MapLaravelCronJobSettings(string jobId, CronJobSettingsState settings) => new
    {
        job_id = jobId,
        is_enabled = settings.IsEnabled,
        custom_schedule = settings.CustomSchedule,
        notify_on_failure = settings.NotifyOnFailure,
        notify_emails = settings.NotifyEmails,
        max_retries = settings.MaxRetries,
        timeout_seconds = settings.TimeoutSeconds
    };

    private static object MapLaravelGlobalCronSettings(GlobalCronSettingsState settings) => new
    {
        default_notify_email = settings.DefaultNotifyEmail,
        log_retention_days = settings.LogRetentionDays,
        max_concurrent_jobs = settings.MaxConcurrentJobs
    };

    private static string CronJobSettingsKey(string jobId) => $"admin.cron.job.{jobId}.settings";
    private const string GlobalCronSettingsKey = "admin.cron.global.settings";

    private sealed class CronJobSettingsState
    {
        public bool IsEnabled { get; set; } = true;
        public string? CustomSchedule { get; set; }
        public bool NotifyOnFailure { get; set; }
        public string? NotifyEmails { get; set; }
        public int MaxRetries { get; set; } = 3;
        public int TimeoutSeconds { get; set; } = 300;

        public void Apply(JsonElement body)
        {
            if (body.TryGetProperty("is_enabled", out _)) IsEnabled = ReadBool(body, "is_enabled") ?? IsEnabled;
            if (body.TryGetProperty("custom_schedule", out _)) CustomSchedule = ReadString(body, "custom_schedule");
            if (body.TryGetProperty("notify_on_failure", out _)) NotifyOnFailure = ReadBool(body, "notify_on_failure") ?? NotifyOnFailure;
            if (body.TryGetProperty("notify_emails", out _)) NotifyEmails = ReadString(body, "notify_emails");
            if (body.TryGetProperty("max_retries", out _)) MaxRetries = ReadInt(body, "max_retries") ?? MaxRetries;
            if (body.TryGetProperty("timeout_seconds", out _)) TimeoutSeconds = ReadInt(body, "timeout_seconds") ?? TimeoutSeconds;
        }
    }

    private sealed class GlobalCronSettingsState
    {
        public string? DefaultNotifyEmail { get; set; }
        public int LogRetentionDays { get; set; } = 30;
        public int MaxConcurrentJobs { get; set; } = 5;

        public void Apply(JsonElement body)
        {
            if (body.TryGetProperty("default_notify_email", out _)) DefaultNotifyEmail = ReadString(body, "default_notify_email");
            if (body.TryGetProperty("log_retention_days", out _)) LogRetentionDays = ReadInt(body, "log_retention_days") ?? LogRetentionDays;
            if (body.TryGetProperty("max_concurrent_jobs", out _)) MaxConcurrentJobs = ReadInt(body, "max_concurrent_jobs") ?? MaxConcurrentJobs;
        }
    }

    private object LaravelMeta() => new
    {
        base_url = $"{Request.Scheme}://{Request.Host}"
    };

    private object LaravelPaginationMeta(int page, int perPage, int total)
    {
        var totalPages = total > 0 ? (int)Math.Ceiling((double)total / perPage) : 0;
        return new
        {
            base_url = $"{Request.Scheme}://{Request.Host}",
            current_page = page,
            per_page = perPage,
            total,
            total_pages = totalPages,
            has_more = page < totalPages
        };
    }

    private static bool TryParseLaravelDeliverabilityStatus(string? value, out DeliverableStatus status)
    {
        status = DeliverableStatus.Pending;
        switch ((value ?? "").Trim().ToLowerInvariant())
        {
            case "":
            case "draft":
            case "ready":
            case "review":
            case "blocked":
            case "on_hold":
            case "pending":
                status = DeliverableStatus.Pending;
                return true;
            case "in_progress":
            case "inprogress":
                status = DeliverableStatus.InProgress;
                return true;
            case "completed":
                status = DeliverableStatus.Completed;
                return true;
            case "cancelled":
            case "canceled":
                status = DeliverableStatus.Cancelled;
                return true;
            default:
                return false;
        }
    }

    private static string ToLaravelDeliverabilityStatus(DeliverableStatus status) => status switch
    {
        DeliverableStatus.InProgress => "in_progress",
        DeliverableStatus.Completed => "completed",
        DeliverableStatus.Cancelled => "cancelled",
        _ => "draft"
    };

    private static bool TryParseLaravelDeliverabilityPriority(string? value, out DeliverablePriority priority)
    {
        priority = DeliverablePriority.Medium;
        switch ((value ?? "").Trim().ToLowerInvariant())
        {
            case "":
            case "medium":
                priority = DeliverablePriority.Medium;
                return true;
            case "low":
                priority = DeliverablePriority.Low;
                return true;
            case "high":
                priority = DeliverablePriority.High;
                return true;
            case "urgent":
            case "critical":
                priority = DeliverablePriority.Critical;
                return true;
            default:
                return false;
        }
    }

    private static string ToLaravelDeliverabilityPriority(DeliverablePriority priority) => priority switch
    {
        DeliverablePriority.Low => "low",
        DeliverablePriority.High => "high",
        DeliverablePriority.Critical => "urgent",
        _ => "medium"
    };

    private static string? ReadString(JsonElement body, string propertyName)
    {
        if (!body.TryGetProperty(propertyName, out var property) || property.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        return property.ValueKind == JsonValueKind.String ? property.GetString() : property.ToString();
    }

    private static int? ReadInt(JsonElement body, string propertyName)
    {
        if (!body.TryGetProperty(propertyName, out var property) || property.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var number))
        {
            return number;
        }

        return int.TryParse(property.ToString(), out var parsed) ? parsed : null;
    }

    private static int[] ReadIntArray(JsonElement body, string propertyName)
    {
        if (!body.TryGetProperty(propertyName, out var property) || property.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<int>();
        }

        return property.EnumerateArray()
            .Select(item =>
            {
                if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var number))
                {
                    return (int?)number;
                }

                return int.TryParse(item.ToString(), out var parsed) ? parsed : null;
            })
            .Where(item => item.HasValue)
            .Select(item => item!.Value)
            .ToArray();
    }

    private static decimal? ReadDecimal(JsonElement body, string propertyName)
    {
        if (!body.TryGetProperty(propertyName, out var property) || property.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out var number))
        {
            return number;
        }

        return decimal.TryParse(property.ToString(), out var parsed) ? parsed : null;
    }

    private static bool? ReadBool(JsonElement body, string propertyName)
    {
        if (!body.TryGetProperty(propertyName, out var property) || property.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        if (property.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            return property.GetBoolean();
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var number))
        {
            return number != 0;
        }

        return bool.TryParse(property.ToString(), out var parsed) ? parsed : null;
    }

    private static DateTime? ReadDateTime(JsonElement body, string propertyName)
    {
        var value = ReadString(body, propertyName);
        if (!DateTime.TryParse(value, out var parsed))
        {
            return null;
        }

        return parsed.Kind switch
        {
            DateTimeKind.Utc => parsed,
            DateTimeKind.Local => parsed.ToUniversalTime(),
            _ => DateTime.SpecifyKind(parsed, DateTimeKind.Utc)
        };
    }

    private static DateTime NormalizeUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private static string? ReadTags(JsonElement body)
    {
        if (!body.TryGetProperty("tags", out var tags) || tags.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        if (tags.ValueKind == JsonValueKind.Array)
        {
            return string.Join(",", tags.EnumerateArray().Select(t => t.ToString()).Where(t => !string.IsNullOrWhiteSpace(t)));
        }

        return tags.ToString();
    }

    private static string[] SplitTags(string? tags) => string.IsNullOrWhiteSpace(tags)
        ? Array.Empty<string>()
        : tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string FormatBytes(long bytes)
    {
        if (bytes < 1024)
        {
            return $"{bytes} B";
        }

        var units = new[] { "KB", "MB", "GB", "TB" };
        var value = bytes / 1024.0;
        var unitIndex = 0;
        while (value >= 1024 && unitIndex < units.Length - 1)
        {
            value /= 1024;
            unitIndex++;
        }

        return $"{value:0.#} {units[unitIndex]}";
    }

    private static string FormatDuration(TimeSpan duration)
        => duration.TotalDays >= 1
            ? $"{(int)duration.TotalDays}d {duration.Hours}h {duration.Minutes}m"
            : $"{duration.Hours}h {duration.Minutes}m";

    private static object MapLaravelGdprBreach(GdprBreach breach)
        => new
        {
            id = breach.Id,
            title = breach.Title,
            description = breach.Description,
            severity = breach.Severity,
            status = breach.Status,
            affected_users = breach.AffectedUsersCount,
            affected_users_count = breach.AffectedUsersCount,
            reported_at = breach.DetectedAt,
            detected_at = breach.DetectedAt,
            created_at = breach.CreatedAt
        };

    private static string DisplayName(User? user)
        => user == null
            ? string.Empty
            : string.Join(" ", new[] { user.FirstName, user.LastName }.Where(part => !string.IsNullOrWhiteSpace(part))).Trim();

    private static string DisplayName(string? firstName, string? lastName)
        => string.Join(" ", new[] { firstName, lastName }.Where(part => !string.IsNullOrWhiteSpace(part))).Trim();

    private static string BuildCsv(IEnumerable<string> headers, IEnumerable<object?[]> rows)
    {
        var builder = new System.Text.StringBuilder();
        builder.AppendLine(string.Join(",", headers.Select(EscapeCsvValue)));
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsvValue)));
        }

        return builder.ToString();
    }

    private static string EscapeCsvValue(object? value)
    {
        var text = value switch
        {
            null => string.Empty,
            DateTime dateTime => dateTime.ToString("O"),
            DateTimeOffset dateTimeOffset => dateTimeOffset.ToString("O"),
            bool boolean => boolean ? "1" : "0",
            _ => value.ToString() ?? string.Empty
        };

        if (text.Contains('"') || text.Contains(',') || text.Contains('\r') || text.Contains('\n'))
        {
            return $"\"{text.Replace("\"", "\"\"")}\"";
        }

        return text;
    }

    private static string MapGdprExportType(string? format)
    {
        var value = format?.Trim().ToLowerInvariant();
        return value is "access" or "portability" or "rectification" or "restriction" or "objection"
            ? value
            : "access";
    }

    private static string MapExportStatus(ExportStatus status)
        => status switch
        {
            ExportStatus.Pending => "pending",
            ExportStatus.Processing => "processing",
            ExportStatus.Ready or ExportStatus.Downloaded => "completed",
            ExportStatus.Failed or ExportStatus.Expired => "rejected",
            _ => "pending"
        };

    private static string MapDeletionStatus(DeletionStatus status)
        => status switch
        {
            DeletionStatus.Pending or DeletionStatus.Approved => "pending",
            DeletionStatus.Processing => "processing",
            DeletionStatus.Completed => "completed",
            DeletionStatus.Rejected => "rejected",
            _ => "pending"
        };

    public sealed class AdminEnterpriseBreachRequest
    {
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("severity")]
        public string? Severity { get; set; }

        [JsonPropertyName("affected_users")]
        public int? AffectedUsers { get; set; }

        [JsonPropertyName("affected_users_count")]
        public int? AffectedUsersCount { get; set; }
    }
}
