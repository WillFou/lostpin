using System.Net.Http.Headers;
using System.Text.Json;
using LostPinUpdater.Models;

namespace LostPinUpdater.Services;

internal sealed class GitHubReleaseService : IDisposable
{
    private const string Owner = "WillFou";
    private const string Repository = "lostpin";
    private const string AssetPrefix = "LostPin-v";

    private readonly HttpClient httpClient;

    public GitHubReleaseService()
    {
        httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("LostPinUpdater/1.0");
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        httpClient.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
    }

    public async Task<(GitHubRelease Release, GitHubAsset Asset)> GetLatestReleaseAsync(CancellationToken cancellationToken)
    {
        var uri = $"https://api.github.com/repos/{Owner}/{Repository}/releases/latest";
        using var response = await httpClient.GetAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var release = await JsonSerializer.DeserializeAsync<GitHubRelease>(stream, cancellationToken: cancellationToken)
                      ?? throw new InvalidOperationException("GitHub a renvoye une release vide.");

        var asset = release.Assets
            .FirstOrDefault(a => a.Name.StartsWith(AssetPrefix, StringComparison.OrdinalIgnoreCase)
                              && a.Name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("La derniere release ne contient pas de package LostPin-v*.zip.");

        return (release, asset);
    }

    public async Task DownloadAsync(string url, string destinationPath, IProgress<double>? progress, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var total = response.Content.Headers.ContentLength;
        await using var input = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var output = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);

        var buffer = new byte[81920];
        long readTotal = 0;
        while (true)
        {
            var read = await input.ReadAsync(buffer, cancellationToken);
            if (read == 0)
                break;

            await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            readTotal += read;

            if (total is > 0)
                progress?.Report(readTotal * 100d / total.Value);
        }

        progress?.Report(100d);
    }

    public void Dispose() => httpClient.Dispose();
}
