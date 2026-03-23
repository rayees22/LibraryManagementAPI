using System.Text;
using LibraryManagementAPI.Data;
using LibraryManagementAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure Swagger
builder.Services.AddSwaggerGen();

// Configure SQLite Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

// Configure JwtService
builder.Services.AddScoped<JwtService>();

// Configure EmailService
builder.Services.AddScoped<EmailService>();

// Configure Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    context.Database.EnsureCreated(); // This will trigger OnModelCreating and seed Admin
}

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Library API V1");
    c.RoutePrefix = "swagger";
});

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Add("http://*:" + port);

app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapGet("/health", () => new { status = "OK", message = "API is healthy" });

app.Run();
