// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Manages file uploads: validation, storage, and retrieval.
/// Files are stored on the local filesystem under a configurable uploads directory.
/// </summary>
public class FileUploadService
{
    private readonly NexusDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<FileUploadService> _logger;

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
    private const long MaxAvatarSizeBytes = 2 * 1024 * 1024; // 2 MB

    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/webp"
    };

    private static readonly HashSet<string> AllowedDocumentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "text/csv"
    };

    public FileUploadService(NexusDbContext db, IConfiguration config, ILogger<FileUploadService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file. Validates type and size, stores to disk, records in database.
    /// </summary>
    public async Task<(FileUpload? File, string? Error)> UploadAsync(
        Stream fileStream, string originalFilename, string contentType, long fileSize,
        int userId, int tenantId, FileCategory category, int? entityId = null, string? entityType = null)
    {
        // Validate
        var maxSize = category == FileCategory.Avatar ? MaxAvatarSizeBytes : MaxFileSizeBytes;
        if (fileSize > maxSize)
            return (null, $"File too large. Maximum size: {maxSize / 1024 / 1024} MB");

        if (fileSize == 0)
            return (null, "File is empty");

        var allowedTypes = category == FileCategory.Document ? AllowedDocumentTypes : AllowedImageTypes;
        if (!allowedTypes.Contains(contentType))
            return (null, $"File type '{contentType}' is not allowed for {category}");

        // Generate stored filename
        var extension = Path.GetExtension(originalFilename);
        if (string.IsNullOrEmpty(extension))
            extension = MimeToExtension(contentType);
        var storedFilename = $"{Guid.NewGuid():N}{extension}";

        // Build path: uploads/{tenant_id}/{category}/{filename}
        var relativePath = Path.Combine(tenantId.ToString(), category.ToString().ToLowerInvariant(), storedFilename);
        var uploadsRoot = GetUploadsRoot();
        var fullPath = Path.Combine(uploadsRoot, relativePath);

        // Ensure directory exists
        var directory = Path.GetDirectoryName(fullPath)!;
        Directory.CreateDirectory(directory);

        // Write file
        await using var output = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(output);

        // Record in database
        var upload = new FileUpload
        {
            TenantId = tenantId,
            UserId = userId,
            OriginalFilename = SanitizeFilename(originalFilename),
            StoredFilename = storedFilename,
            FilePath = relativePath.Replace('\\', '/'),
            ContentType = contentType,
            FileSizeBytes = fileSize,
            Category = category,
            EntityId = entityId,
            EntityType = entityType,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<FileUpload>().Add(upload);
        await _db.SaveChangesAsync();

        _logger.LogInformation("File uploaded: {FileId} ({Category}) by user {UserId}", upload.Id, category, userId);
        return (upload, null);
    }

    /// <summary>
    /// Get a file record by ID. Validates ownership or tenant access.
    /// </summary>
    public async Task<FileUpload?> GetByIdAsync(int fileId)
    {
        return await _db.Set<FileUpload>().FirstOrDefaultAsync(f => f.Id == fileId);
    }

    /// <summary>
    /// Get the full filesystem path for a file.
    /// </summary>
    public string GetFullPath(FileUpload file)
    {
        return Path.Combine(GetUploadsRoot(), file.FilePath);
    }

    /// <summary>
    /// List files for an entity (e.g., all images for a listing).
    /// </summary>
    public async Task<List<FileUpload>> GetByEntityAsync(string entityType, int entityId)
    {
        return await _db.Set<FileUpload>()
            .Where(f => f.EntityType == entityType && f.EntityId == entityId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Delete a file. Removes from disk and database.
    /// </summary>
    public async Task<(bool Success, string? Error)> DeleteAsync(int fileId, int userId)
    {
        var file = await _db.Set<FileUpload>().FirstOrDefaultAsync(f => f.Id == fileId);
        if (file == null)
            return (false, "File not found");

        if (file.UserId != userId)
            return (false, "You can only delete your own files");

        // Delete from disk
        var fullPath = GetFullPath(file);
        if (File.Exists(fullPath))
        {
            try { File.Delete(fullPath); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete file from disk: {Path}", fullPath); }
        }

        _db.Set<FileUpload>().Remove(file);
        await _db.SaveChangesAsync();

        _logger.LogInformation("File deleted: {FileId} by user {UserId}", fileId, userId);
        return (true, null);
    }

    private string GetUploadsRoot()
    {
        return _config["FileUpload:UploadsRoot"] ?? Path.Combine(AppContext.BaseDirectory, "uploads");
    }

    private static string SanitizeFilename(string filename)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(filename.Where(c => !invalid.Contains(c)));
    }

    private static string MimeToExtension(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/gif" => ".gif",
        "image/webp" => ".webp",
        "application/pdf" => ".pdf",
        _ => ".bin"
    };
}
