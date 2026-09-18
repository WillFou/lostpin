using System.Text.Json.Serialization;

namespace LostPinUpdater.Models;

internal sealed class ReleaseManifest
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

    [JsonPropertyName("files")]
    public List<string> Files { get; set; } = [];
}
