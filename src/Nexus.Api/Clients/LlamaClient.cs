using System.Net.Http.Json;

namespace Nexus.Api.Clients;

/// <summary>
/// HTTP client for interacting with the Ollama Llama service.
/// </summary>
public class LlamaClient : ILlamaClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<LlamaClient> _logger;

    public LlamaClient(HttpClient httpClient, ILogger<LlamaClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<OllamaChatResponse> ChatAsync(OllamaChatRequest request, CancellationToken ct = default)
    {
        // Log message count but NOT content (security: no PII in logs)
        _logger.LogInformation("Sending chat request with {MessageCount} messages to model {Model}",
            request.Messages.Count, request.Model);

        var response = await _httpClient.PostAsJsonAsync("/api/chat", request, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(ct)
            ?? throw new InvalidOperationException("Failed to deserialize chat response");

        _logger.LogInformation("Chat response received: {EvalCount} tokens evaluated in {Duration}ms",
            result.EvalCount, result.TotalDuration / 1_000_000);

        return result;
    }

    /// <inheritdoc />
    public async Task<OllamaEmbeddingResponse> EmbedAsync(OllamaEmbeddingRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Generating embeddings for model {Model}", request.Model);

        var response = await _httpClient.PostAsJsonAsync("/api/embeddings", request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<OllamaEmbeddingResponse>(ct)
            ?? throw new InvalidOperationException("Failed to deserialize embedding response");
    }

    /// <inheritdoc />
    public async Task<OllamaTagsResponse> GetModelsAsync(CancellationToken ct = default)
    {
        _logger.LogDebug("Fetching available models from Ollama");

        var response = await _httpClient.GetAsync("/api/tags", ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaTagsResponse>(ct)
            ?? throw new InvalidOperationException("Failed to deserialize models response");

        _logger.LogDebug("Found {ModelCount} models available", result.Models.Count);

        return result;
    }

    /// <inheritdoc />
    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            var models = await GetModelsAsync(ct);
            return models.Models.Count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Llama health check failed");
            return false;
        }
    }
}
