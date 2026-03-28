using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SkyBazaar.Data;
using SkyBazaar.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure DbContext with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=skybazaar.db";
builder.Services.AddDbContext<SkyBazaarDbContext>(options =>
    options.UseSqlite(connectionString));

// Add DbContextFactory for background services
builder.Services.AddDbContextFactory<SkyBazaarDbContext>(options =>
    options.UseSqlite(connectionString));

// Register the Hypixel API service
builder.Services.AddSingleton<IHypixelApiService, HypixelApiService>();

// Register the background fetcher service
builder.Services.AddHostedService<BazaarFetcherService>();

// Register the flip detection service
builder.Services.AddScoped<IFlipDetectionService, FlipDetectionService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<SkyBazaarDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.Run();
