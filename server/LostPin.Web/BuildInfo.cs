using System.Reflection;

namespace LostPin.Web;

internal static class BuildInfo
{
    // Le suffixe Git ajoute par le SDK ne fait pas partie du numero affiche.
    public static string Version { get; } =
        typeof(BuildInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0] ?? "7.0.0-alpha.1";

    public const string FrontendBaseline = "6.2.3";
    public const string Milestone = "V7-001";
}
