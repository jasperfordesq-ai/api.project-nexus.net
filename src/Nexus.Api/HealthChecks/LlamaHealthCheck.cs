using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Nexus.Api.Clients;
using Nexus.Api.Configuration;

namespace Nexus.Api.HealthChecks;

/// <summary>
/// Health check for the Llama AI service (Ollama).
/// </summary>
public class LlamaHealthCheck : IHealthCheck
{
    private readonly ILlamaClient _llamaClient;
    private readonly LlamaServiceOptions _options;
    private readonly ILogger<LlamaHealthCheck> _logger;

    public LlamaHealthCheck(
        ILlamaClient llamaClient,
        IOptions<LlamaServiceOptions> options,
        ILogger<LlamaHealthCheck> logger)
    {
        _llamaClient = llamaClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var models = await _llamaClient.GetModelsAsync(cancellationToken);

            if (models.Models.Count == 0)
            {
                return HealthCheckResult.Degraded(
                    $"Llama service is running but has no models loaded. Run: docker compose exec llama-service ollama pull {_options.Model}");
            }

            var modelNames = models.Models.Select(m => m.Name).ToList();
            var modelNamesStr = string.Join(", ", modelNames);

            // Check if the configured model is available
            var configuredModelBase = _options.Model.Split(':')[0]; // e.g., "llama3.2" from "llama3.2:3b"
            var hasConfiguredModel = modelNames.Any(m =>
                m.Equals(_options.Model, StringComparison.OrdinalIgnoreCase) ||
                m.StartsWith(configuredModelBase, StringComparison.OrdinalIgnoreCase));

            if (!hasConfiguredModel)
            {
                _logger.LogWarning(
                    "Configured model '{ConfiguredModel}' not found. Available models: {AvailableModels}",
                    _options.Model, modelNamesStr);

                return HealthCheckResult.Degraded(
                    $"Configured model '{_options.Model}' not loaded. Available: {modelNamesStr}. " +
                    $"Run: docker compose exec llama-service ollama pull {_options.Model}");
            }

            return HealthCheckResult.Healthy($"Llama service healthy with {models.Models.Count} model(s): {modelNamesStr}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Llama health check failed - service unreachable");
            return HealthCheckResult.Unhealthy("Llama service unreachable", ex);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Llama health check timed out");
            return HealthCheckResult.Unhealthy("Llama service health check timed out", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Llama health check failed with unexpected error");
            return HealthCheckResult.Unhealthy("Llama service health check failed", ex);
        }
    }
}
