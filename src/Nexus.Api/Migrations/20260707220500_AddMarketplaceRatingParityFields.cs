using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketplaceRatingParityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "marketplace_seller_ratings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RaterRole",
                table: "marketplace_seller_ratings",
                type: "text",
                nullable: false,
                defaultValue: "buyer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "marketplace_seller_ratings");

            migrationBuilder.DropColumn(
                name: "RaterRole",
                table: "marketplace_seller_ratings");
        }
    }
}
