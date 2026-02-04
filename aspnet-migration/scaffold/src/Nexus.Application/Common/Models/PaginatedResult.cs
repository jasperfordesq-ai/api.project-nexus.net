namespace Nexus.Application.Common.Models;

/// <summary>
/// Cursor-based pagination result matching PHP's V2 API pagination format.
/// </summary>
public class PaginatedResult<T>
{
    public List<T> Data { get; set; } = new();
    public PaginationMeta Meta { get; set; } = new();

    public static PaginatedResult<T> Create(
        IEnumerable<T> items,
        int limit,
        Func<T, string> cursorSelector,
        bool hasMore)
    {
        var itemList = items.ToList();

        return new PaginatedResult<T>
        {
            Data = itemList,
            Meta = new PaginationMeta
            {
                HasMore = hasMore,
                NextCursor = hasMore && itemList.Any()
                    ? cursorSelector(itemList.Last())
                    : null,
                Count = itemList.Count
            }
        };
    }
}

/// <summary>
/// Pagination metadata matching PHP's format.
/// </summary>
public class PaginationMeta
{
    public bool HasMore { get; set; }
    public string? NextCursor { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// Cursor pagination parameters for queries.
/// </summary>
public class CursorPaginationParams
{
    public string? Cursor { get; set; }
    public int Limit { get; set; } = 20;

    /// <summary>
    /// Maximum allowed limit to prevent abuse.
    /// </summary>
    public const int MaxLimit = 100;

    public int GetEffectiveLimit() => Math.Min(Math.Max(1, Limit), MaxLimit);
}

/// <summary>
/// Cursor encoding/decoding utilities.
/// Must match PHP's base64 encoding format.
/// </summary>
public static class CursorHelper
{
    /// <summary>
    /// Encodes an ID to a cursor string (matches PHP base64_encode).
    /// </summary>
    public static string Encode(int id)
    {
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(id.ToString()));
    }

    /// <summary>
    /// Encodes a composite cursor (matches PHP json_encode + base64_encode).
    /// </summary>
    public static string Encode(object cursor)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(cursor);
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));
    }

    /// <summary>
    /// Decodes a cursor string to an ID (matches PHP base64_decode).
    /// </summary>
    public static int? DecodeInt(string? cursor)
    {
        if (string.IsNullOrEmpty(cursor))
            return null;

        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return int.TryParse(decoded, out var id) ? id : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Decodes a composite cursor.
    /// </summary>
    public static T? Decode<T>(string? cursor) where T : class
    {
        if (string.IsNullOrEmpty(cursor))
            return null;

        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return System.Text.Json.JsonSerializer.Deserialize<T>(decoded);
        }
        catch
        {
            return null;
        }
    }
}
