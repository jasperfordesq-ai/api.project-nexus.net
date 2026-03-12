// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net.Http.Json;
using System.Text.Json;

namespace Nexus.Api.Services;

/// <summary>
/// HTTP client for calling federation APIs on partner servers.
/// Handles authentication (API Key or Federation JWT) and request/response serialization.
/// </summary>
public class FederationExternalApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FederationExternalApiClient> _logger;

    public FederationExternalApiClient(HttpClient httpClient, ILogger<FederationExternalApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Get API info from a partner server.
    /// </summary>
    public async Task<JsonElement?> GetApiInfoAsync(string baseUrl)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{baseUrl.TrimEnd('/')}/api/v1/federation");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to get API info from {BaseUrl}", baseUrl);
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Failed to get API info from {BaseUrl}", baseUrl);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to get API info from {BaseUrl}", baseUrl);
            return null;
        }
    }

    /// <summary>
    /// Request a federation JWT from a partner server using an API key.
    /// </summary>
    public async Task<string?> RequestTokenAsync(string baseUrl, string apiKey, int targetTenantId, string[] scopes)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/v1/federation/token");
            request.Headers.Add("X-Federation-Key", apiKey);
            request.Content = JsonContent.Create(new
            {
                target_tenant_id = targetTenantId,
                scopes
            });

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            if (result.ValueKind == JsonValueKind.Undefined || result.ValueKind == JsonValueKind.Null)
            {
                _logger.LogWarning("Empty or null response from federation token endpoint at {BaseUrl}", baseUrl);
                return null;
            }
            if (!result.TryGetProperty("access_token", out var tokenElement))
            {
                _logger.LogWarning("Federation token response missing access_token from {BaseUrl}", baseUrl);
                return null;
            }
            return tokenElement.GetString();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to request federation token from {BaseUrl}", baseUrl);
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Failed to request federation token from {BaseUrl}", baseUrl);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to request federation token from {BaseUrl}", baseUrl);
            return null;
        }
    }

    /// <summary>
    /// Search listings on a partner server.
    /// </summary>
    public async Task<JsonElement?> SearchListingsAsync(
        string baseUrl, string bearerToken, int page = 1, int limit = 20, string? search = null)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/api/v1/federation/listings?page={page}&limit={limit}";
            if (!string.IsNullOrEmpty(search)) url += $"&search={Uri.EscapeDataString(search)}";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", bearerToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to search listings on {BaseUrl}", baseUrl);
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Failed to search listings on {BaseUrl}", baseUrl);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to search listings on {BaseUrl}", baseUrl);
            return null;
        }
    }

    /// <summary>
    /// Initiate an exchange on a partner server.
    /// </summary>
    public async Task<JsonElement?> InitiateExchangeAsync(
        string baseUrl, string bearerToken, int listingId, decimal agreedHours,
        string requesterDisplayName, int? requesterUserId = null)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/v1/federation/exchanges");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", bearerToken);
            request.Content = JsonContent.Create(new
            {
                listing_id = listingId,
                agreed_hours = agreedHours,
                requester_display_name = requesterDisplayName,
                requester_user_id = requesterUserId
            });

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to initiate exchange on {BaseUrl}", baseUrl);
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Failed to initiate exchange on {BaseUrl}", baseUrl);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to initiate exchange on {BaseUrl}", baseUrl);
            return null;
        }
    }

    /// <summary>
    /// Test webhook connectivity with a partner server.
    /// </summary>
    public async Task<bool> TestWebhookAsync(string baseUrl, string apiKey)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/v1/federation/webhooks/test");
            request.Headers.Add("X-Federation-Key", apiKey);

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Webhook test failed for {BaseUrl}", baseUrl);
            return false;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Webhook test failed for {BaseUrl}", baseUrl);
            return false;
        }
    }
}
