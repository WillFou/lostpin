using System.Diagnostics;
using System.Windows;
using LostPinUpdater.Models;
using LostPinUpdater.Services;

namespace LostPinUpdater;

public partial class MainWindow : Window
{
    private readonly string installDirectory = AppContext.BaseDirectory;
    private readonly string gameDirectory;
    private readonly GitHubReleaseService github = new();
    private GitHubRelease? latestRelease;
    private GitHubAsset? latestAsset;
    private CancellationTokenSource? operationCts;

    public MainWindow()
    {
        InitializeComponent();
        gameDirectory = Path.Combine(installDirectory, "Game");
        Loaded += MainWindow_Loaded;
        Closed += (_, _) =>
        {
            operationCts?.Cancel();
            operationCts?.Dispose();
            github.Dispose();
        };
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await CheckForUpdatesAsync();
    }

    private async Task CheckForUpdatesAsync()
    {
        SetBusy(true);
        ProgressBar.Value = 0;
        StatusText.Text = "Verification des mises a jour...";
        ReleaseNotesText.Text = "Connexion a GitHub...";

        operationCts?.Cancel();
        operationCts?.Dispose();
        operationCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        try
        {
            var installed = await VersionService.ReadInstalledVersionAsync(gameDirectory, operationCts.Token);
            InstalledVersionText.Text = installed.Version;

            var result = await github.GetLatestReleaseAsync(operationCts.Token);
            latestRelease = result.Release;
            latestAsset = result.Asset;

            var latest = result.Release.TagName.TrimStart('v', 'V');
            LatestVersionText.Text = latest;
            ReleaseNotesText.Text = string.IsNullOrWhiteSpace(result.Release.Body)
                ? "Aucune note de version."
                : result.Release.Body;

            var updateAvailable = VersionService.Parse(result.Release.TagName) > VersionService.Parse(installed.Version);
            UpdateButton.IsEnabled = updateAvailable;
            StatusText.Text = updateAvailable
                ? $"LostPin {latest} est disponible."
                : "LostPin est a jour.";
        }
        catch (OperationCanceledException)
        {
            StatusText.Text = "La verification a expire. Clique sur Reverifier.";
            ReleaseNotesText.Text = "Impossible de contacter GitHub pour le moment.";
        }
        catch (Exception ex)
        {
            StatusText.Text = "Impossible de verifier les mises a jour.";
            ReleaseNotesText.Text = ex.Message;
        }
        finally
        {
            SetBusy(false);
        }
    }

    private async void UpdateButton_Click(object sender, RoutedEventArgs e)
    {
        if (latestAsset is null || latestRelease is null)
            return;

        SetBusy(true);
        UpdateButton.IsEnabled = false;
        ProgressBar.Value = 0;

        operationCts?.Cancel();
        operationCts?.Dispose();
        operationCts = new CancellationTokenSource();

        try
        {
            var progress = new Progress<double>(value => ProgressBar.Value = value);
            var status = new Progress<string>(value => StatusText.Text = value);
            var updater = new UpdateService(github);

            await updater.InstallAsync(
                latestAsset,
                installDirectory,
                progress,
                status,
                operationCts.Token);

            var installed = await VersionService.ReadInstalledVersionAsync(gameDirectory, operationCts.Token);
            InstalledVersionText.Text = installed.Version;
            LatestVersionText.Text = latestRelease.TagName.TrimStart('v', 'V');
            StatusText.Text = $"LostPin {installed.Version} est installe.";
            ReleaseNotesText.Text = "Mise a jour terminee. Tu peux lancer LostPin.";
        }
        catch (OperationCanceledException)
        {
            StatusText.Text = "Mise a jour annulee.";
        }
        catch (Exception ex)
        {
            StatusText.Text = "La mise a jour a echoue. La version precedente a ete restauree.";
            MessageBox.Show(
                ex.Message,
                "LostPin Updater",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
        finally
        {
            SetBusy(false);
        }
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await CheckForUpdatesAsync();
    }

    private void PlayButton_Click(object sender, RoutedEventArgs e)
    {
        var startPath = Path.Combine(gameDirectory, "start.bat");
        if (!File.Exists(startPath))
        {
            MessageBox.Show(
                "Game\\start.bat est introuvable. Reinstalle LostPin depuis le package de release.",
                "LostPin Updater",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = startPath,
            WorkingDirectory = gameDirectory,
            UseShellExecute = true
        });
    }

    private void ConfigureApiButton_Click(object sender, RoutedEventArgs e)
    {
        var path = Path.Combine(gameDirectory, "change-api-key.bat");
        if (!File.Exists(path))
        {
            MessageBox.Show(
                "Game\\change-api-key.bat est introuvable.",
                "LostPin Updater",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = path,
            WorkingDirectory = gameDirectory,
            UseShellExecute = true
        });
    }

    private void SetBusy(bool busy)
    {
        RefreshButton.IsEnabled = !busy;
        PlayButton.IsEnabled = !busy;
        ConfigureApiButton.IsEnabled = !busy;

        if (busy)
            UpdateButton.IsEnabled = false;
        else if (latestRelease is not null)
            _ = RefreshUpdateButtonStateAsync();
    }

    private async Task RefreshUpdateButtonStateAsync()
    {
        try
        {
            var installed = await VersionService.ReadInstalledVersionAsync(gameDirectory, CancellationToken.None);
            UpdateButton.IsEnabled = VersionService.Parse(latestRelease?.TagName) > VersionService.Parse(installed.Version);
        }
        catch
        {
            UpdateButton.IsEnabled = false;
        }
    }
}
