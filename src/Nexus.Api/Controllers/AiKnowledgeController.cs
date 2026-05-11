// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services.Ai;

namespace Nexus.Api.Controllers;

[ApiController]
[Authorize]
public class AiKnowledgeController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly PlatformChatAgent _agent;
    private readonly AiKnowledgeService _knowledge;
    private readonly KnowledgeIndexerService _indexer;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<AiKnowledgeController> _logger;

    public AiKnowledgeController(
        NexusDbContext db,
        PlatformChatAgent agent,
        AiKnowledgeService knowledge,
        KnowledgeIndexerService indexer,
        TenantContext tenantContext,
        ILogger<AiKnowledgeController> logger)
    {
        _db = db;
        _agent = agent;
        _knowledge = knowledge;
        _indexer = indexer;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public record PlatformChatBody(int ConversationId, string Message);
    public record FeedbackBody(int Score, string? Comment, string? ReasonCode);

    // ─── Platform-aware chat ──────────────────────────────────────────────

    [HttpPost("/api/ai/chat/platform")]
    public async Task<IActionResult> Chat([FromBody] PlatformChatBody body, CancellationToken ct)
    {
        if (body == null || string.IsNullOrWhiteSpace(body.Message))
            return BadRequest(new { error = "message_required" });
        var userId = GetUserId();
        if (userId == 0) return Unauthorized(new { error = "invalid_token" });
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var resp = await _agent.SendAsync(new PlatformChatRequest(body.ConversationId, body.Message), userId, tenantId, ct);
        if (resp.RateLimited) return StatusCode(StatusCodes.Status429TooManyRequests, resp);
        return Ok(resp);
    }

    // ─── Per-message feedback ─────────────────────────────────────────────

    [HttpPost("/api/ai/messages/{id:int}/feedback")]
    public async Task<IActionResult> Feedback(int id, [FromBody] FeedbackBody body, CancellationToken ct)
    {
        if (body == null || (body.Score != 1 && body.Score != -1))
            return BadRequest(new { error = "score_must_be_plus_or_minus_1" });
        var userId = GetUserId();
        if (userId == 0) return Unauthorized();
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var msg = await _db.AiMessages.IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId, ct);
        if (msg == null) return NotFound();

        var existing = await _db.AiMessageFeedbacks.IgnoreQueryFilters()
            .FirstOrDefaultAsync(f => f.TenantId == tenantId && f.AiMessageId == id && f.UserId == userId, ct);
        if (existing == null)
        {
            existing = new AiMessageFeedback
            {
                TenantId = tenantId,
                AiMessageId = id,
                UserId = userId,
                Score = body.Score,
                Comment = body.Comment,
                ReasonCode = body.ReasonCode
            };
            _db.AiMessageFeedbacks.Add(existing);
        }
        else
        {
            existing.Score = body.Score;
            existing.Comment = body.Comment;
            existing.ReasonCode = body.ReasonCode;
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = existing.Id, existing.Score, existing.ReasonCode });
    }

    // ─── Direct semantic search (debug + admin tooling) ───────────────────

    [HttpGet("/api/ai/knowledge/search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 8, [FromQuery] string? types = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest(new { error = "q_required" });
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (limit < 1) limit = 1; if (limit > 25) limit = 25;

        var typeList = string.IsNullOrWhiteSpace(types)
            ? null
            : (IReadOnlyCollection<string>)types.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var hits = await _knowledge.SearchAsync(tenantId, q, limit, typeList, ct);
        return Ok(new { hits });
    }

    // ─── Admin: trigger reindex ───────────────────────────────────────────

    [HttpPost("/api/admin/ai/knowledge/reindex")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reindex(CancellationToken ct)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var report = await _indexer.ReindexTenantAsync(tenantId, ct);
        await _indexer.FlushAsync(ct);
        return Ok(report);
    }

    // ─── Admin: AI quality dashboard ──────────────────────────────────────

    [HttpGet("/api/admin/ai/quality")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Quality([FromQuery] int days = 30, CancellationToken ct = default)
    {
        if (days < 1) days = 1; if (days > 365) days = 365;
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var since = DateTime.UtcNow.AddDays(-days);

        // Feedback aggregates
        var feedback = await _db.AiMessageFeedbacks.IgnoreQueryFilters()
            .Where(f => f.TenantId == tenantId && f.CreatedAt >= since)
            .GroupBy(f => f.Score)
            .Select(g => new { Score = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var up = feedback.FirstOrDefault(x => x.Score == 1)?.Count ?? 0;
        var down = feedback.FirstOrDefault(x => x.Score == -1)?.Count ?? 0;
        var totalFb = up + down;
        var approvalRate = totalFb == 0 ? (double?)null : Math.Round((double)up / totalFb, 3);

        // Audit aggregates
        var audits = await _db.AiRequestAuditLogs.IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId && a.CreatedAt >= since)
            .Select(a => new { a.Outcome, a.LatencyMs, a.InputTokens, a.OutputTokens, a.RetrievedChunkCount })
            .ToListAsync(ct);
        var ok = audits.Count(a => a.Outcome == "ok");
        var blocked = audits.Count(a => a.Outcome == "blocked");
        var rateLimited = audits.Count(a => a.Outcome == "rate_limited");
        var providerErrors = audits.Count(a => a.Outcome == "provider_error");
        var avgLatency = audits.Count == 0 ? 0 : (int)audits.Average(a => a.LatencyMs);
        var totalIn = audits.Sum(a => (long)a.InputTokens);
        var totalOut = audits.Sum(a => (long)a.OutputTokens);
        var avgRetrieved = audits.Count == 0 ? 0.0 : Math.Round(audits.Average(a => a.RetrievedChunkCount), 2);

        // Top negative reason codes
        var topNegReasons = await _db.AiMessageFeedbacks.IgnoreQueryFilters()
            .Where(f => f.TenantId == tenantId && f.CreatedAt >= since && f.Score == -1 && f.ReasonCode != null)
            .GroupBy(f => f.ReasonCode)
            .Select(g => new { reason = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToListAsync(ct);

        var indexSize = await _db.KnowledgeChunks.IgnoreQueryFilters()
            .CountAsync(c => c.TenantId == tenantId, ct);

        return Ok(new
        {
            window_days = days,
            feedback = new { thumbs_up = up, thumbs_down = down, approval_rate = approvalRate },
            audit = new
            {
                requests = audits.Count,
                ok,
                blocked,
                rate_limited = rateLimited,
                provider_errors = providerErrors,
                avg_latency_ms = avgLatency,
                total_input_tokens = totalIn,
                total_output_tokens = totalOut,
                avg_retrieved = avgRetrieved
            },
            top_negative_reasons = topNegReasons,
            knowledge_index_size = indexSize
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private int GetUserId()
    {
        var idClaim = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }
}
