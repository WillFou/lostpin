using System.IO.Compression;
using System.Text.Json;
using LostPinUpdater.Models;

namespace LostPinUpdater.Services;

internal sealed class UpdateService
{
    private static readonly HashSet<string> ProtectedFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        "config.js",
        "config.local.js"
    };

    private readonly GitHubReleaseService github;

    public UpdateService(GitHubReleaseService github)
    {
        this.github = github;
    }

    public async Task InstallAsync(
        GitHubAsset asset,
        string installDirectory,
        IProgress<double>? downloadProgress,
        IProgress<string>? status,
        CancellationToken cancellationToken)
    {
        var gameDirectory = Path.Combine(installDirectory, "Game");
        Directory.CreateDirectory(gameDirectory);

        var tempRoot = Path.Combine(Path.GetTempPath(), "LostPinUpdater", Guid.NewGuid().ToString("N"));
        var zipPath = Path.Combine(tempRoot, "update.zip");
        var extractDirectory = Path.Combine(tempRoot, "extract");
        var backupDirectory = Path.Combine(tempRoot, "backup");

        Directory.CreateDirectory(tempRoot);
        Directory.CreateDirectory(extractDirectory);
        Directory.CreateDirectory(backupDirectory);

        var createdFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var backedUpFiles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            status?.Report("Telechargement de la mise a jour...");
            await github.DownloadAsync(asset.BrowserDownloadUrl, zipPath, downloadProgress, cancellationToken);

            status?.Report("Decompression...");
            ZipFile.ExtractToDirectory(zipPath, extractDirectory, overwriteFiles: true);

            var packageRoot = ResolvePackageRoot(extractDirectory);
            var newGameDirectory = Path.Combine(packageRoot, "Game");
            if (!Directory.Exists(newGameDirectory))
                throw new InvalidDataException("Le package ne contient pas de dossier Game.");

            if (!File.Exists(Path.Combine(newGameDirectory, "start.bat")))
                throw new InvalidDataException("Le package LostPin est invalide : start.bat est absent.");

            var oldManifest = await ReadManifestAsync(Path.Combine(gameDirectory, "release-manifest.json"), cancellationToken);
            var newManifest = await ReadManifestAsync(Path.Combine(newGameDirectory, "release-manifest.json"), cancellationToken)
                              ?? throw new InvalidDataException("Le package ne contient pas release-manifest.json.");

            status?.Report("Installation...");

            foreach (var sourceFile in Directory.EnumerateFiles(newGameDirectory, "*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();

                var relativePath = NormalizeRelativePath(Path.GetRelativePath(newGameDirectory, sourceFile));
                var destination = Path.Combine(gameDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));

                if (ProtectedFiles.Contains(relativePath) && File.Exists(destination))
                    continue;

                BackupIfNeeded(destination, relativePath, backupDirectory, backedUpFiles, createdFiles);
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                File.Copy(sourceFile, destination, overwrite: true);
            }

            if (oldManifest is not null)
            {
                var newFiles = new HashSet<string>(newManifest.Files.Select(NormalizeRelativePath), StringComparer.OrdinalIgnoreCase);
                foreach (var oldFile in oldManifest.Files.Select(NormalizeRelativePath))
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    if (newFiles.Contains(oldFile) || ProtectedFiles.Contains(oldFile))
                        continue;

                    var destination = Path.Combine(gameDirectory, oldFile.Replace('/', Path.DirectorySeparatorChar));
                    if (!File.Exists(destination))
                        continue;

                    BackupIfNeeded(destination, oldFile, backupDirectory, backedUpFiles, createdFiles);
                    File.Delete(destination);
                }
            }

            status?.Report("Mise a jour terminee.");
            downloadProgress?.Report(100d);
        }
        catch
        {
            status?.Report("Erreur : restauration de la version precedente...");
            Rollback(backedUpFiles, createdFiles);
            throw;
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempRoot))
                    Directory.Delete(tempRoot, recursive: true);
            }
            catch
            {
                // Le nettoyage du dossier temporaire ne doit jamais casser l'updater.
            }
        }
    }

    private static string ResolvePackageRoot(string extractDirectory)
    {
        if (Directory.Exists(Path.Combine(extractDirectory, "Game")))
            return extractDirectory;

        var directories = Directory.GetDirectories(extractDirectory);
        if (directories.Length == 1 && Directory.Exists(Path.Combine(directories[0], "Game")))
            return directories[0];

        return extractDirectory;
    }

    private static void BackupIfNeeded(
        string destination,
        string relativePath,
        string backupDirectory,
        Dictionary<string, string> backedUpFiles,
        HashSet<string> createdFiles)
    {
        if (backedUpFiles.ContainsKey(destination) || createdFiles.Contains(destination))
            return;

        if (!File.Exists(destination))
        {
            createdFiles.Add(destination);
            return;
        }

        var backupPath = Path.Combine(backupDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(backupPath)!);
        File.Copy(destination, backupPath, overwrite: true);
        backedUpFiles[destination] = backupPath;
    }

    private static void Rollback(Dictionary<string, string> backedUpFiles, HashSet<string> createdFiles)
    {
        foreach (var path in createdFiles.OrderByDescending(p => p.Length))
        {
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
            }
            catch
            {
                // Best effort.
            }
        }

        foreach (var pair in backedUpFiles)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(pair.Key)!);
                File.Copy(pair.Value, pair.Key, overwrite: true);
            }
            catch
            {
                // Best effort.
            }
        }
    }

    private static async Task<ReleaseManifest?> ReadManifestAsync(string path, CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
            return null;

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<ReleaseManifest>(stream, cancellationToken: cancellationToken);
    }

    private static string NormalizeRelativePath(string path) => path.Replace('\\', '/').TrimStart('/');
}
