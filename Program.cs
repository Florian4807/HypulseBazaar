using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using System.Threading.RateLimiting;
using SkyBazaar.Data;
using SkyBazaar.Services;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("ImportPolicy", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
});

// Configure DbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=skybazaar.db";
var databaseProvider = builder.Configuration["Database:Provider"]?.Trim().ToLowerInvariant() ?? "sqlite";

builder.Services.AddDbContext<SkyBazaarDbContext>(options =>
{
    if (databaseProvider == "postgres" || databaseProvider == "postgresql")
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// Add DbContextFactory for background services
builder.Services.AddDbContextFactory<SkyBazaarDbContext>(options =>
{
    if (databaseProvider == "postgres" || databaseProvider == "postgresql")
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// Register the Hypixel API service with HttpClient factory
builder.Services.AddHttpClient<IHypixelApiService, HypixelApiService>();

// Coflnet public API (bazaar history import)
builder.Services.AddHttpClient("Coflnet", (sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var baseUrl = cfg["Coflnet:ApiBaseUrl"]?.Trim().TrimEnd('/') ?? "https://sky.coflnet.com/api";
    client.BaseAddress = new Uri(baseUrl + "/");
    client.Timeout = TimeSpan.FromMinutes(5);
});

builder.Services.AddScoped<ICoflnetHistoryImportService, CoflnetHistoryImportService>();

// Register the background fetcher only when worker mode is enabled.
var workerEnabled = builder.Configuration.GetValue("Worker:Enabled", true);
if (workerEnabled)
{
    builder.Services.AddHostedService<BazaarFetcherService>();
}

// Register the flip detection service
builder.Services.AddScoped<IFlipDetectionService, FlipDetectionService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Request");
    var requestId = context.Request.Headers["X-Request-Id"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(requestId))
    {
        requestId = Guid.NewGuid().ToString("n");
    }

    context.Response.Headers["X-Request-Id"] = requestId;
    context.Items["RequestId"] = requestId;

    using var scope = logger.BeginScope(new Dictionary<string, object> { ["RequestId"] = requestId });
    var start = DateTime.UtcNow;
    try
    {
        await next();
    }
    finally
    {
        var elapsedMs = (DateTime.UtcNow - start).TotalMilliseconds;
        logger.LogInformation(
            "{Method} {Path} => {StatusCode} in {ElapsedMs}ms",
            context.Request.Method,
            context.Request.Path.Value,
            context.Response.StatusCode,
            Math.Round(elapsedMs, 1));
    }
});

app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = _ => true
});

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<SkyBazaarDbContext>();
    await dbContext.BootstrapLegacySqliteMigrationHistoryAsync(
        baselineMigrationId: "20260328000000_InitialCreate",
        productVersion: "10.0.0");
    await dbContext.EnsurePriceSnapshotExternalImportColumnAsync();
    await dbContext.Database.MigrateAsync();
}

var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
var resolvedDbPath = connectionString;
if (databaseProvider == "sqlite")
{
    var sqlitePath = new SqliteConnectionStringBuilder(connectionString).DataSource;
    if (!string.IsNullOrWhiteSpace(sqlitePath) && !Path.IsPathRooted(sqlitePath))
    {
        sqlitePath = Path.GetFullPath(sqlitePath);
    }
    resolvedDbPath = sqlitePath;
}
logger.LogInformation("SkyBazaar startup: Worker:Enabled={WorkerEnabled}", workerEnabled);
logger.LogInformation("SkyBazaar startup: Database:Provider={Provider}", databaseProvider);
logger.LogInformation("SkyBazaar startup: Database connection target={DatabaseTarget}", resolvedDbPath);
logger.LogInformation(
    "SkyBazaar startup: ASPNETCORE_URLS={Urls}",
    builder.Configuration["ASPNETCORE_URLS"] ?? "(not set; defaults in effect)");

app.Run();
