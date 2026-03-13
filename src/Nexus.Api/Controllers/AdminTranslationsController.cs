// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin translation/i18n management.
/// </summary>
[ApiController]
[Route("api/admin/translations")]
[Authorize(Policy = "AdminOnly")]
public class AdminTranslationsController : ControllerBase
{
    private readonly NexusDbContext _db;

    public AdminTranslationsController(NexusDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/admin/translations/stats - Translation coverage stats.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalTranslations = await _db.Translations.CountAsync();
        var locales = await _db.SupportedLocales.ToListAsync();
        var byLocale = await _db.Translations
            .GroupBy(t => t.Locale)
            .Select(g => new { Locale = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                total_translations = totalTranslations,
                supported_locales = locales.Select(l => new { l.Id, l.Locale, l.Name, l.IsDefault }),
                coverage = byLocale
            }
        });
    }

    /// <summary>
    /// GET /api/admin/translations/missing - Get missing translation keys.
    /// </summary>
    [HttpGet("missing")]
    public async Task<IActionResult> GetMissing([FromQuery] string locale = "en")
    {
        var defaultKeys = await _db.Translations
            .Where(t => t.Locale == "en")
            .Select(t => t.Key)
            .ToListAsync();

        var translatedKeys = await _db.Translations
            .Where(t => t.Locale == locale)
            .Select(t => t.Key)
            .ToListAsync();

        var missing = defaultKeys.Except(translatedKeys).ToList();

        return Ok(new
        {
            data = new
            {
                locale,
                total_keys = defaultKeys.Count,
                translated = translatedKeys.Count,
                missing_count = missing.Count,
                missing_keys = missing.Take(100)
            }
        });
    }

    /// <summary>
    /// POST /api/admin/translations/bulk - Bulk import translations.
    /// </summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkImport([FromBody] BulkTranslationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Locale))
            return BadRequest(new { error = "Locale is required" });
        if (request.Translations == null || request.Translations.Count == 0)
            return BadRequest(new { error = "At least one translation is required" });
        if (request.Translations.Count > 1000)
            return BadRequest(new { error = "Maximum 1000 translations per bulk import" });

        var imported = 0;

        foreach (var item in request.Translations)
        {
            var existing = await _db.Translations
                .FirstOrDefaultAsync(t => t.Locale == request.Locale && t.Key == item.Key);

            if (existing != null)
            {
                existing.Value = item.Value;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _db.Translations.Add(new Translation
                {
                    Locale = request.Locale,
                    Key = item.Key,
                    Value = item.Value,
                    Namespace = item.Namespace ?? "common"
                });
            }
            imported++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Imported {imported} translations for locale '{request.Locale}'" });
    }

    /// <summary>
    /// POST /api/admin/translations/locales - Add supported locale.
    /// </summary>
    [HttpPost("locales")]
    public async Task<IActionResult> AddLocale([FromBody] AdminAddLocaleRequest request)
    {
        var existing = await _db.SupportedLocales.AnyAsync(l => l.Locale == request.Code);
        if (existing) return BadRequest(new { error = "Locale already exists" });

        var locale = new SupportedLocale
        {
            Locale = request.Code,
            Name = request.Name,
            IsDefault = false
        };
        _db.SupportedLocales.Add(locale);
        await _db.SaveChangesAsync();
        return Created("/api/admin/translations/locales", new { data = new { locale.Id, locale.Locale, locale.Name } });
    }

    /// <summary>
    /// DELETE /api/admin/translations/locales/{code} - Remove a locale.
    /// </summary>
    [HttpDelete("locales/{code}")]
    public async Task<IActionResult> RemoveLocale(string code)
    {
        if (code == "en") return BadRequest(new { error = "Cannot remove default locale" });

        var locale = await _db.SupportedLocales.FirstOrDefaultAsync(l => l.Locale == code);
        if (locale == null) return NotFound(new { error = "Locale not found" });

        var translations = await _db.Translations.Where(t => t.Locale == code).ToListAsync();
        _db.Translations.RemoveRange(translations);
        _db.SupportedLocales.Remove(locale);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Locale '{code}' removed" });
    }
}

public class BulkTranslationRequest
{
    [JsonPropertyName("locale")] public string Locale { get; set; } = "en";
    [JsonPropertyName("translations")] public List<TranslationItem> Translations { get; set; } = new();
}

public class TranslationItem
{
    [JsonPropertyName("key")] public string Key { get; set; } = string.Empty;
    [JsonPropertyName("value")] public string Value { get; set; } = string.Empty;
    [JsonPropertyName("namespace")] public string? Namespace { get; set; }
}

public class AdminAddLocaleRequest
{
    [JsonPropertyName("code")] public string Code { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
}
