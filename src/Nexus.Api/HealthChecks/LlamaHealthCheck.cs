using Microsoft.Extensions.Diagnostics.HealthChecks;
using Nexus.Api.Clients;

namespace Nexus.Api.HealthChecks;

/// <summary>
/// Health check for the Llama AI service (Ollama).
/// </summary>
public class LlamaHealthCheck : IHealthCheck
{
    private readonly ILlamaClient _llamaClient;
    private readonly ILogger<LlamaHealthCheck> _logger;

    public LlamaHealthCheck(ILlamaClient llamaClient, ILogger<LlamaHealthCheck> logger)
    {
        _llamaClient = llamaClient;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var models = await _llamaClient.GetModelsAsync(cancellationToken);

            if (models.Models.Count > 0)
            {
                var modelNames = string.Join(", ", models.Models.Select(m => m.Name));
                return HealthCheckResult.Healthy($"Llama service has {models.Models.Count} model(s): {modelNames}");
            }

            return HealthCheckResult.Degraded("Llama service is running but has no models loaded. Run: docker compose exec llama-service ollama pull llama3.2:3b");
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
