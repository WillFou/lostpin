namespace LostPin.Web;

// Liste publique volontairement fermee : ne jamais serialiser IConfiguration.
internal sealed record PublicRuntimeConfiguration(
    string GoogleMapsApiKey,
    string Hosting,
    bool ServiceAvailable,
    string ServiceMessage);

internal sealed class RuntimeConfiguration(IConfiguration configuration)
{
    public PublicRuntimeConfiguration Read()
    {
        var enabled = configuration.GetValue("LostPin:Enabled", true);
        var key = (configuration["GoogleMaps:BrowserApiKey"] ?? "").Trim();
        var configured = key.Length > 0 &&
                         !key.Contains("PASTE_", StringComparison.OrdinalIgnoreCase);
        var available = enabled && configured;
        var message = !enabled
            ? "LostPin est temporairement indisponible. Reviens un peu plus tard."
            : configured ? "" :
              "Google Maps n'est pas configure sur le serveur. Contacte l'administrateur : aucun reglage n'est necessaire sur ton navigateur.";

        // Cette cle navigateur est publique par nature. Aucune cle serveur ne doit passer ici.
        return new(available ? key : "", "aspnet-core", available, message);
    }
}
