using System.Text.Json.Serialization;

namespace LostPinUpdater.Models;

internal sealed class VersionInfo
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "0.0.0";

    [JsonPropertyName("tag")]
    public string? Tag { get; set; }

    [JsonPropertyName("commit")]
    public string? Commit { get; set; }

    [JsonPropertyName("releasedAtUtc")]
    public DateTimeOffset? ReleasedAtUtc { get; set; }
}
