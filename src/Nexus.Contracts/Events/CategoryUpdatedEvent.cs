namespace Nexus.Contracts.Events;

/// <summary>
/// Published when an admin updates a category.
/// </summary>
public class CategoryUpdatedEvent : IntegrationEvent
{
    public override string EventType => "category.updated";

    public int CategoryId { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Slug { get; init; }
    public int? ParentCategoryId { get; init; }
    public int? SortOrder { get; init; }
    public bool? IsActive { get; init; }
}
