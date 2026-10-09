using System.Text.Json;
using LostPin.Web;

// Le dossier public est celui fabrique par MSBuild, jamais la racine du depot.
var publicRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
if (!File.Exists(Path.Combine(publicRoot, "index.html")))
{
    throw new InvalidOperationException("Frontend absent. Compiler ou publier LostPin.Web avant son lancement.");
}

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = publicRoot
});
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);
if (string.IsNullOrWhiteSpace(builder.Configuration["urls"]))
{
    // Une premiere tranche locale ne doit pas ouvrir de port sur tout le reseau.
    builder.WebHost.UseUrls("http://127.0.0.1:8080");
}
builder.Services.AddSingleton<RuntimeConfiguration>();
builder.Services.AddProblemDetails();
var app = builder.Build();
app.UseExceptionHandler();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    // Conserve l'origine necessaire aux restrictions de la cle Google navigateur.
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Content-Security-Policy"] = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";
    await next(context);
});

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
app.MapMethods("/config/config.js", ["GET", "HEAD"],
    async (HttpContext context, RuntimeConfiguration runtime) =>
{
    // Adaptateur du contrat V6 : pas de config.js reel, pas de secret dans wwwroot.
    // Le serialiseur standard echappe notamment les caracteres HTML et les sauts de ligne.
    var script = "window.PG_CONFIG = " + JsonSerializer.Serialize(runtime.Read(), jsonOptions) + ";\n";
    context.Response.ContentType = "application/javascript; charset=utf-8";
    context.Response.Headers.CacheControl = "no-store";
    if (!HttpMethods.IsHead(context.Request.Method))
        await context.Response.WriteAsync(script, context.RequestAborted);
});

app.MapGet("/version.json", (HttpContext context) =>
{
    context.Response.Headers.CacheControl = "no-store";
    return Results.Json(new
    {
        version = BuildInfo.Version,
        frontendBaseline = BuildInfo.FrontendBaseline,
        milestone = BuildInfo.Milestone
    });
});

app.MapGet("/health/live", () => Results.Json(new { status = "live", service = "LostPin.Web" }));
app.MapGet("/health/ready", (HttpContext context, RuntimeConfiguration runtime) =>
{
    context.Response.Headers.CacheControl = "no-store";
    var available = runtime.Read().ServiceAvailable;
    // Indique seulement la configuration locale, pas la validite de la cle chez Google.
    return Results.Json(new { status = available ? "ready" : "not-ready" },
        statusCode: available ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable);
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = file =>
    {
        // Pas de cache permanent tant que les fichiers JS/CSS ne sont pas versionnes par hash.
        file.Context.Response.Headers.CacheControl = "no-cache";
    }
});
// Pas de fallback vers index.html : /api/inconnu et les fichiers prives restent en 404.
app.Run();
