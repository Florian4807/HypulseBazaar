using Microsoft.EntityFrameworkCore;
using SkyBazaar.Data;
using SkyBazaar.Services;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Configure DbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=skybazaar.db";
builder.Services.AddDbContext<SkyBazaarDbContext>(options =>
    options.UseSqlite(connectionString));

// Add DbContextFactory for background services
builder.Services.AddDbContextFactory<SkyBazaarDbContext>(options =>
    options.UseSqlite(connectionString));

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

// Register the background fetcher service
builder.Services.AddHostedService<BazaarFetcherService>();

// Register the flip detection service
builder.Services.AddScoped<IFlipDetectionService, FlipDetectionService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthorization();

app.MapControllers();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<SkyBazaarDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await dbContext.EnsurePriceSnapshotExternalImportColumnAsync();
}

app.Run();
