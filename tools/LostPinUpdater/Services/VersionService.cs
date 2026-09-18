using System.Text.Json;
using LostPinUpdater.Models;

namespace LostPinUpdater.Services;

internal static class VersionService
{
    public static async Task<VersionInfo> ReadInstalledVersionAsync(string gameDirectory, CancellationToken cancellationToken)
    {
        var path = Path.Combine(gameDirectory, "version.json");
        if (!File.Exists(path))
            return new VersionInfo();

        try
        {
            await using var stream = File.OpenRead(path);
            return await JsonSerializer.DeserializeAsync<VersionInfo>(stream, cancellationToken: cancellationToken)
                   ?? new VersionInfo();
        }
        catch
        {
            return new VersionInfo();
        }
    }

    public static Version Parse(string? value)
    {
        var normalized = (value ?? string.Empty).Trim();
        if (normalized.StartsWith('v') || normalized.StartsWith('V'))
            normalized = normalized[1..];

        var prereleaseIndex = normalized.IndexOf('-');
        if (prereleaseIndex >= 0)
            normalized = normalized[..prereleaseIndex];

        return Version.TryParse(normalized, out var version) ? version : new Version(0, 0, 0);
    }
}
