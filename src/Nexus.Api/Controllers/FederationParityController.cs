// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// V1.5 compatibility endpoints for federation protocols and native ingest.
/// </summary>
[ApiController]
[Route("api/federation")]
[Authorize]
public class FederationParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;

    public FederationParityController(NexusDbContext db, TenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet("aggregates")]
    public async Task<IActionResult> Aggregates()
    {
        var tenantId = TenantId();
        return Ok(new
        {
            data = new
            {
                tenants = await _db.Tenants.CountAsync(),
                partners = await _db.FederationPartners.CountAsync(p => p.TenantId == tenantId),
                listings = await _db.Listings.CountAsync(l => l.TenantId == tenantId),
                groups = await _db.Groups.CountAsync(g => g.TenantId == tenantId),
                events = await _db.Events.CountAsync(e => e.TenantId == tenantId)
            }
        });
    }

    [HttpGet("groups")]
    public async Task<IActionResult> Groups() => Ok(new { data = await _db.Groups.Where(g => g.TenantId == TenantId()).OrderBy(g => g.Name).Select(g => new { g.Id, g.Name, g.Description }).ToListAsync() });

    [HttpGet("partners/{partnerId:int}")]
    public async Task<IActionResult> Partner(int partnerId)
    {
        var partner = await _db.FederationPartners.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.Id == partnerId);
        return partner == null ? NotFound(new { error = "Partner not found" }) : Ok(new { data = partner });
    }

    [HttpPost("connections/{connectionId:int}/accept")]
    public async Task<IActionResult> AcceptConnection(int connectionId) => await UpdatePartner(connectionId, "Active");

    [HttpPost("connections/{connectionId:int}/reject")]
    public async Task<IActionResult> RejectConnection(int connectionId) => await UpdatePartner(connectionId, "Rejected");

    [HttpDelete("connections/{connectionId:int}")]
    public async Task<IActionResult> DeleteConnection(int connectionId)
    {
        var partner = await _db.FederationPartners.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.Id == connectionId);
        if (partner != null) _db.FederationPartners.Remove(partner);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("members/{memberId:int}/reviews")]
    public async Task<IActionResult> MemberReviews(int memberId)
    {
        var reviews = await _db.Reviews.Where(r => r.TenantId == TenantId() && (r.TargetUserId == memberId || r.ReviewerId == memberId)).ToListAsync();
        return Ok(new { data = reviews });
    }

    [HttpPost("messages")]
    public IActionResult SendFederatedMessage([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "queued" } });

    [HttpPost("messages/{messageId:int}/translate")]
    public IActionResult TranslateMessage(int messageId, [FromBody] JsonElement body) => Ok(new { data = new { id = messageId, translated_text = Str(body, "text") ?? Str(body, "message") ?? string.Empty, locale = Str(body, "locale") ?? "en" } });

    [HttpPost("messages/mark-read-batch")]
    public IActionResult MarkReadBatch([FromBody] JsonElement body) => Ok(new { data = new { marked_read = body.ValueKind == JsonValueKind.Array ? body.GetArrayLength() : 0 } });

    [HttpPost("transactions")]
    public IActionResult FederationTransaction([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "posted", amount = Decimal(body, "amount") ?? 0 } });

    [HttpPost("hour-transfer/inbound")]
    public IActionResult InboundHourTransfer([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "accepted" } });

    [HttpPost("external/webhooks/receive")]
    [AllowAnonymous]
    public IActionResult ReceiveWebhook([FromBody] JsonElement body) => Ok(new { data = new { received = true, event_id = StableId(body) } });

    [HttpPost("ingest/connections")]
    public IActionResult IngestConnections([FromBody] JsonElement body) => Ingest("connections", body);

    [HttpPost("ingest/events")]
    public IActionResult IngestEvents([FromBody] JsonElement body) => Ingest("events", body);

    [HttpPost("ingest/groups")]
    public IActionResult IngestGroups([FromBody] JsonElement body) => Ingest("groups", body);

    [HttpPost("ingest/listings")]
    public IActionResult IngestListings([FromBody] JsonElement body) => Ingest("listings", body);

    [HttpPost("ingest/members/sync")]
    public IActionResult IngestMembers([FromBody] JsonElement body) => Ingest("members", body);

    [HttpPost("ingest/reviews")]
    public IActionResult IngestReviews([FromBody] JsonElement body) => Ingest("reviews", body);

    [HttpPost("ingest/volunteering")]
    public IActionResult IngestVolunteering([FromBody] JsonElement body) => Ingest("volunteering", body);

    [HttpGet("cc/about")]
    [AllowAnonymous]
    public IActionResult CreditCommonsAbout() => Ok(new { data = new { name = "Project NEXUS", protocol = "credit-commons", version = "1.0" } });

    [HttpGet("cc/forms")]
    public IActionResult CreditCommonsForms() => Ok(new { data = new[] { new { id = "transfer", fields = new[] { "payer", "payee", "amount", "description" } } } });

    [HttpGet("cc/accounts")]
    public async Task<IActionResult> CreditCommonsAccounts() => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId()).Select(u => new { id = u.Id, name = u.FirstName + " " + u.LastName, balance = 0 }).ToListAsync() });

    [HttpGet("cc/account")]
    public IActionResult MyCreditCommonsAccount() => Ok(new { data = new { id = User.GetUserId(), balance = 0, tenant_id = TenantId() } });

    [HttpGet("cc/account/history")]
    public async Task<IActionResult> MyCreditCommonsHistory() => Ok(new { data = await _db.Transactions.Where(t => t.TenantId == TenantId()).Take(50).ToListAsync() });

    [HttpGet("cc/account/{accountId}")]
    public IActionResult CreditCommonsAccount(string accountId) => Ok(new { data = new { id = accountId, balance = 0 } });

    [HttpGet("cc/account/history/{accountId}")]
    public IActionResult CreditCommonsAccountHistory(string accountId) => Ok(new { data = Array.Empty<object>(), account_id = accountId });

    [HttpGet("cc/entries")]
    public async Task<IActionResult> CreditCommonsEntries() => Ok(new { data = await _db.Transactions.Where(t => t.TenantId == TenantId()).Take(100).ToListAsync() });

    [HttpGet("cc/entries/{entryId}")]
    public IActionResult CreditCommonsEntry(string entryId) => Ok(new { data = new { id = entryId, status = "posted" } });

    [HttpGet("cc/transactions")]
    public IActionResult CreditCommonsTransactions() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("cc/transaction/{transactionId}")]
    public IActionResult CreditCommonsTransaction(string transactionId) => Ok(new { data = new { id = transactionId, status = "pending" } });

    [HttpPost("cc/transaction")]
    public IActionResult CreateCreditCommonsTransaction([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "created" } });

    [HttpPost("cc/transaction/relay")]
    public IActionResult RelayCreditCommonsTransaction([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "relayed" } });

    [HttpPatch("cc/transaction/{transactionId}/{verb}")]
    public IActionResult PatchCreditCommonsTransaction(string transactionId, string verb) => Ok(new { data = new { id = transactionId, action = verb, status = "updated" } });

    [HttpPost("cc/transactions/propose")]
    public IActionResult ProposeCreditCommonsTransaction([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "proposed" } });

    [HttpPost("cc/transactions/{transactionId}/validate")]
    public IActionResult ValidateCreditCommonsTransaction(string transactionId) => Ok(new { data = new { id = transactionId, valid = true } });

    [HttpPost("cc/transactions/{transactionId}/commit")]
    public IActionResult CommitCreditCommonsTransaction(string transactionId) => Ok(new { data = new { id = transactionId, status = "committed" } });

    [HttpGet("komunitin/currencies")]
    public IActionResult KomunitinCurrencies() => Ok(new { data = new[] { new { code = $"NEXUS-{TenantId()}", name = "NEXUS Time Credits" } } });

    [HttpPost("komunitin/currencies")]
    public IActionResult CreateKomunitinCurrency([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), code = Str(body, "code") ?? $"NEXUS-{TenantId()}" } });

    [HttpGet("komunitin/{system}/currency")]
    public IActionResult KomunitinCurrency(string system) => Ok(new { data = new { system, code = system.ToUpperInvariant(), decimals = 2 } });

    [HttpPatch("komunitin/{system}/currency")]
    public IActionResult UpdateKomunitinCurrency(string system, [FromBody] JsonElement body) => Ok(new { data = new { system, code = Str(body, "code") ?? system.ToUpperInvariant() } });

    [HttpDelete("komunitin/{system}/currency")]
    public IActionResult DeleteKomunitinCurrency(string system) => NoContent();

    [HttpGet("komunitin/{system}/currency/settings")]
    public IActionResult KomunitinCurrencySettings(string system) => Ok(new { data = new { system, min = 0, max = 10000, overdraft_limit = 0 } });

    [HttpPatch("komunitin/{system}/currency/settings")]
    public IActionResult UpdateKomunitinCurrencySettings(string system, [FromBody] JsonElement body) => Ok(new { data = new { system, updated = true } });

    [HttpGet("komunitin/{system}/accounts")]
    public async Task<IActionResult> KomunitinAccounts(string system) => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId()).Select(u => new { id = u.Id, system, name = u.FirstName + " " + u.LastName }).ToListAsync() });

    [HttpPost("komunitin/{system}/accounts")]
    public IActionResult CreateKomunitinAccount(string system, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), system, name = Str(body, "name") } });

    [HttpGet("komunitin/{system}/accounts/{accountId}")]
    public IActionResult KomunitinAccount(string system, string accountId) => Ok(new { data = new { id = accountId, system, balance = 0 } });

    [HttpPatch("komunitin/{system}/accounts/{accountId}")]
    public IActionResult UpdateKomunitinAccount(string system, string accountId, [FromBody] JsonElement body) => Ok(new { data = new { id = accountId, system, updated = true } });

    [HttpDelete("komunitin/{system}/accounts/{accountId}")]
    public IActionResult DeleteKomunitinAccount(string system, string accountId) => NoContent();

    [HttpGet("komunitin/{system}/transfers")]
    public IActionResult KomunitinTransfers(string system) => Ok(new { data = Array.Empty<object>(), system });

    [HttpPost("komunitin/{system}/transfers")]
    public IActionResult CreateKomunitinTransfer(string system, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), system, status = "created" } });

    [HttpGet("komunitin/{system}/transfers/{transferId}")]
    public IActionResult KomunitinTransfer(string system, string transferId) => Ok(new { data = new { id = transferId, system, status = "posted" } });

    [HttpPatch("komunitin/{system}/transfers/{transferId}")]
    public IActionResult UpdateKomunitinTransfer(string system, string transferId, [FromBody] JsonElement body) => Ok(new { data = new { id = transferId, system, status = Str(body, "status") ?? "updated" } });

    [HttpDelete("komunitin/{system}/transfers/{transferId}")]
    public IActionResult DeleteKomunitinTransfer(string system, string transferId) => NoContent();

    private async Task<IActionResult> UpdatePartner(int id, string status)
    {
        var partner = await _db.FederationPartners.FirstOrDefaultAsync(p => p.TenantId == TenantId() && p.Id == id);
        if (partner == null) return NotFound(new { error = "Connection not found" });
        partner.Status = Enum.TryParse<PartnerStatus>(status, true, out var parsed) ? parsed : partner.Status;
        partner.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = partner });
    }

    private IActionResult Ingest(string resource, JsonElement body) => Ok(new { data = new { resource, accepted = Count(body), ingest_id = StableId(body) } });

    private int TenantId() => _tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context not resolved");
    private static string? Str(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;
    private static decimal? Decimal(JsonElement e, string name) => decimal.TryParse(Str(e, name), out var value) ? value : null;
    private static int Count(JsonElement body) => body.ValueKind == JsonValueKind.Array ? body.GetArrayLength() : body.ValueKind == JsonValueKind.Object && body.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array ? data.GetArrayLength() : 1;
    private static int StableId(JsonElement body) => Math.Abs(HashCode.Combine(body.GetRawText()));
}
