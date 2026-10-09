using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.Json;

// Tests de contrat HTTP sans paquet NuGet et sans appel Google.
// Le serveur teste est un vrai processus ASP.NET Core, pas une imitation.
if (args.Length != 1 || !File.Exists(args[0]))
{
    Console.Error.WriteLine("Usage : dotnet run --project tests/LostPin.Web.SmokeTests -- chemin/LostPin.Web.dll");
    return 2;
}

var serverDll = Path.GetFullPath(args[0]);
var checks = 0;
void Check(string name, bool condition)
{
    if (!condition) throw new InvalidOperationException("FAIL " + name);
    checks++;
    Console.WriteLine("PASS " + name);
}

try
{
    // Aucune cle Google reelle : les valeurs servent seulement a tester le contrat local.
    foreach (var test in new[]
    {
        (Name: "sans-cle", Key: "", Enabled: true, Ready: false),
        (Name: "configure", Key: "qa-browser-only", Enabled: true, Ready: true),
        (Name: "desactive", Key: "qa-browser-only", Enabled: false, Ready: false),
        (Name: "echappement", Key: "qa-\"</script><script>bad()</script>\n", Enabled: true, Ready: true)
    })
    {
        await using var server = await TestServer.StartAsync(serverDll, test.Key, test.Enabled);
        using var live = await server.Client.GetAsync("/health/live");
        Check(test.Name + " /health/live", live.StatusCode == HttpStatusCode.OK);
        using var ready = await server.Client.GetAsync("/health/ready");
        Check(test.Name + " /health/ready", ready.StatusCode ==
            (test.Ready ? HttpStatusCode.OK : HttpStatusCode.ServiceUnavailable));

        using var config = await server.Client.GetAsync("/config/config.js");
        Check(test.Name + " configuration HTTP", config.StatusCode == HttpStatusCode.OK);
        Check(test.Name + " type JavaScript", config.Content.Headers.ContentType?.MediaType == "application/javascript");
        Check(test.Name + " configuration non mise en cache", config.Headers.CacheControl?.NoStore == true);
        var script = await config.Content.ReadAsStringAsync();
        const string prefix = "window.PG_CONFIG = ";
        Check(test.Name + " contrat V6", script.StartsWith(prefix, StringComparison.Ordinal));
        using var json = JsonDocument.Parse(script[prefix.Length..].Trim().TrimEnd(';'));
        var data = json.RootElement;
        Check(test.Name + " champs publics limites", data.EnumerateObject().Select(x => x.Name).Order()
            .SequenceEqual(new[] { "googleMapsApiKey", "hosting", "serviceAvailable", "serviceMessage" }.Order()));
        Check(test.Name + " valeur de cle", data.GetProperty("googleMapsApiKey").GetString() == (test.Ready ? test.Key.Trim() : ""));
        Check(test.Name + " drapeau serveur", data.GetProperty("hosting").GetString() == "aspnet-core");
        Check(test.Name + " disponibilite", data.GetProperty("serviceAvailable").GetBoolean() == test.Ready);
        Check(test.Name + " pas de secret serveur", !script.Contains("qa-private-server-secret") && !script.Contains("qa-database-password"));
        Check(test.Name + " pas de balise executable brute", !script.Contains("</script>", StringComparison.OrdinalIgnoreCase));
        using var head = await server.Client.SendAsync(new HttpRequestMessage(HttpMethod.Head, "/config/config.js"));
        Check(test.Name + " HEAD sans corps", head.StatusCode == HttpStatusCode.OK && (await head.Content.ReadAsByteArrayAsync()).Length == 0);

        if (test.Name != "configure") continue;
        using var home = await server.Client.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Check("accueil V6 servi par ASP.NET", home.StatusCode == HttpStatusCode.OK && html.Contains("id=\"startButton\"") && html.Contains("config/config.js"));
        Check("en-tete nosniff", home.Headers.TryGetValues("X-Content-Type-Options", out var values) && values.Contains("nosniff"));
        Check("origine conservee pour Google", home.Headers.TryGetValues("Referrer-Policy", out var policy) && policy.Contains("strict-origin-when-cross-origin"));
        Check("pas d'en-tete Kestrel", !home.Headers.Contains("Server"));
        using var version = JsonDocument.Parse(await server.Client.GetStringAsync("/version.json"));
        Check("version hote V7", version.RootElement.GetProperty("version").GetString() == "7.0.0-alpha.1");
        Check("base frontend V6.2.3", version.RootElement.GetProperty("frontendBaseline").GetString() == "6.2.3");

        foreach (var path in new[] { "/index.html", "/src/js/core/app.js", "/src/css/gameplay-ui.css", "/assets/brand/lostpin-midnight-mark.svg", "/assets/images/v6/hero-game.jpg" })
        {
            using var resource = await server.Client.GetAsync(path);
            Check("ressource publique " + path, resource.StatusCode == HttpStatusCode.OK);
        }
        foreach (var path in new[] { "/appsettings.json", "/appsettings.Local.json", "/.git/config", "/.env", "/config/config.example.js", "/scripts/runtime/server.ps1", "/scripts/runtime/start-v7.ps1", "/server/LostPin.Web/Program.cs", "/server/LostPin.Web/appsettings.json", "/docs/SECURITY_CONFIG.md", "/dev/qa/google-maps.stub.js", "/README.txt", "/CHANGELOG.md", "/api/inconnu", "/%2e%2e/appsettings.json" })
        {
            using var blocked = await server.Client.GetAsync(path);
            Check("chemin non public " + path, blocked.StatusCode == HttpStatusCode.NotFound);
        }
        using var post = await server.Client.PostAsync("/config/config.js", new StringContent(""));
        Check("configuration en lecture seule", post.StatusCode == HttpStatusCode.MethodNotAllowed);
    }
    Console.WriteLine($"HTTP smoke tests : {checks} controles passes. Aucun appel Google.");
    return 0;
}
catch (Exception error)
{
    Console.Error.WriteLine(error.Message);
    Console.Error.WriteLine($"Arret apres {checks} controles reussis.");
    return 1;
}

internal sealed class TestServer : IAsyncDisposable
{
    private readonly Process process;
    private readonly Task<string> output;
    private readonly Task<string> errors;
    public HttpClient Client { get; }

    private TestServer(Process process, int port)
    {
        this.process = process;
        output = process.StandardOutput.ReadToEndAsync();
        errors = process.StandardError.ReadToEndAsync();
        Client = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}"), Timeout = TimeSpan.FromSeconds(3) };
    }

    public static async Task<TestServer> StartAsync(string dll, string key, bool enabled)
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        var start = new ProcessStartInfo(Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet")
        {
            WorkingDirectory = Path.GetDirectoryName(dll)!,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        start.ArgumentList.Add(dll);
        start.ArgumentList.Add("--urls");
        start.ArgumentList.Add($"http://127.0.0.1:{port}");
        start.Environment["DOTNET_ENVIRONMENT"] = "Production";
        start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
        start.Environment["GoogleMaps__BrowserApiKey"] = key;
        start.Environment["GoogleMaps__ServerApiKey"] = "qa-private-server-secret";
        start.Environment["ConnectionStrings__Main"] = "qa-database-password";
        start.Environment["LostPin__Enabled"] = enabled.ToString();
        start.Environment["AllowedHosts"] = "localhost;127.0.0.1";
        var process = Process.Start(start) ?? throw new InvalidOperationException("Impossible de lancer ASP.NET Core.");
        var server = new TestServer(process, port);
        try
        {
            var deadline = DateTime.UtcNow.AddSeconds(25);
            while (DateTime.UtcNow < deadline)
            {
                if (process.HasExited)
                    throw new InvalidOperationException("Le serveur s'est arrete : " + await server.errors + await server.output);
                try
                {
                    using var response = await server.Client.GetAsync("/health/live");
                    if (response.IsSuccessStatusCode) return server;
                }
                catch (HttpRequestException) { }
                catch (TaskCanceledException) { }
                await Task.Delay(150);
            }
            throw new TimeoutException("Le serveur ne repond pas sur son port de test.");
        }
        catch
        {
            await server.DisposeAsync();
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        if (!process.HasExited) process.Kill(entireProcessTree: true);
        await process.WaitForExitAsync();
        await Task.WhenAll(output, errors);
        process.Dispose();
    }
}
