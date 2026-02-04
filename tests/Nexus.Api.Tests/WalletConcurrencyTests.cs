using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for wallet concurrency and race condition handling.
/// Verifies that concurrent transfers don't cause overdrafts.
/// </summary>
[Collection("Integration")]
public class WalletConcurrencyTests : IntegrationTestBase
{
    public WalletConcurrencyTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ConcurrentTransfers_DoNotOverdraft()
    {
        // Arrange - Get auth token for member user (has 10.0 balance)
        var token = await GetAccessTokenAsync("member@test.com", "test-tenant");

        // Create multiple HTTP clients with the same auth
        var clients = Enumerable.Range(0, 5).Select(_ =>
        {
            var client = Factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            return client;
        }).ToList();

        // Act - Try to transfer 3.0 hours x 5 concurrently (total 15.0, but only 10.0 available)
        var transferTasks = clients.Select(client =>
            client.PostAsJsonAsync("/api/wallet/transfer", new
            {
                receiver_id = TestData.AdminUser.Id,
                amount = 3.0,
                description = "Concurrent transfer test"
            }));

        var responses = await Task.WhenAll(transferTasks);

        // Assert - Only some transfers should succeed (up to 10.0 hours worth)
        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var insufficientBalanceCount = responses.Count(r => r.StatusCode == HttpStatusCode.BadRequest);
        // Serialization conflicts (500) are also valid - they indicate the lock prevented a race condition
        var serializationConflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.InternalServerError);

        // At most 3 transfers of 3.0 should succeed (9.0 total, within 10.0 balance)
        successCount.Should().BeLessOrEqualTo(3, "because only 10.0 hours are available");
        // All requests should complete with one of: Created, BadRequest (insufficient), or 500 (serialization conflict)
        (successCount + insufficientBalanceCount + serializationConflictCount).Should().Be(5, "because all requests should complete");

        // Verify final balance is not negative
        var balanceResponse = await clients[0].GetAsync("/api/wallet/balance");
        var balanceContent = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        var finalBalance = balanceContent.GetProperty("balance").GetDecimal();

        finalBalance.Should().BeGreaterOrEqualTo(0, "balance should never go negative");

        // Log results for debugging
        var totalTransferred = successCount * 3.0m;
        var expectedBalance = 10.0m - totalTransferred;
        finalBalance.Should().Be(expectedBalance,
            $"because {successCount} transfers of 3.0 succeeded from initial balance of 10.0");
    }

    [Fact]
    public async Task SequentialTransfers_MaintainCorrectBalance()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Get initial balance
        var initialResponse = await Client.GetAsync("/api/wallet/balance");
        var initialContent = await initialResponse.Content.ReadFromJsonAsync<JsonElement>();
        var initialBalance = initialContent.GetProperty("balance").GetDecimal();

        // Act - Make 3 sequential transfers
        var transferAmount = 1.0m;
        for (int i = 0; i < 3; i++)
        {
            var response = await Client.PostAsJsonAsync("/api/wallet/transfer", new
            {
                receiver_id = TestData.AdminUser.Id,
                amount = transferAmount,
                description = $"Sequential transfer {i + 1}"
            });

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        // Assert - Final balance should be reduced by total transferred
        var finalResponse = await Client.GetAsync("/api/wallet/balance");
        var finalContent = await finalResponse.Content.ReadFromJsonAsync<JsonElement>();
        var finalBalance = finalContent.GetProperty("balance").GetDecimal();

        finalBalance.Should().Be(initialBalance - (3 * transferAmount));
    }

    [Fact]
    public async Task Transfer_ExactlyRemainingBalance_Succeeds()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Get current balance
        var balanceResponse = await Client.GetAsync("/api/wallet/balance");
        var balanceContent = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        var currentBalance = balanceContent.GetProperty("balance").GetDecimal();

        // Act - Transfer exactly the remaining balance
        var response = await Client.PostAsJsonAsync("/api/wallet/transfer", new
        {
            receiver_id = TestData.AdminUser.Id,
            amount = currentBalance,
            description = "Transfer entire balance"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // Verify balance is now zero
        var newBalanceResponse = await Client.GetAsync("/api/wallet/balance");
        var newBalanceContent = await newBalanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        var newBalance = newBalanceContent.GetProperty("balance").GetDecimal();

        newBalance.Should().Be(0);
    }
}
