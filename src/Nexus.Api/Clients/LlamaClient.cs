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

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("/api/chat", request, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Llama service at {BaseAddress}. Is the service running?",
                _httpClient.BaseAddress);
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Llama service returned {StatusCode}: {ErrorContent}",
                (int)response.StatusCode, errorContent.Length > 500 ? errorContent.Substring(0, 500) : errorContent);
            response.EnsureSuccessStatusCode(); // Throws with status code info
        }

        var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(ct);
        if (result == null)
        {
            var content = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Failed to deserialize chat response. Response content: {Content}",
                content.Length > 500 ? content.Substring(0, 500) : content);
            throw new InvalidOperationException("Failed to deserialize chat response from Llama service");
        }

        _logger.LogInformation("Chat response received: {EvalCount} tokens evaluated in {Duration}ms",
            result.EvalCount, result.TotalDuration / 1_000_000);

        return result;
    }

    /// <inheritdoc />
    public async Task<OllamaEmbeddingResponse> EmbedAsync(OllamaEmbeddingRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Generating embeddings for model {Model}", request.Model);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("/api/embeddings", request, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Llama service for embeddings");
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Llama embedding service returned {StatusCode}: {ErrorContent}",
                (int)response.StatusCode, errorContent.Length > 500 ? errorContent.Substring(0, 500) : errorContent);
            response.EnsureSuccessStatusCode();
        }

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
