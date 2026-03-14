using AllTrackIn.Api.Configuration;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Text;

namespace AllTrackIn.Api
{
    public class Startup
    {
        public IConfiguration Configuration { get; }

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // ─── Configuration ───────────────────────────────────────────────
            services.Configure<MongoDbSettings>(Configuration.GetSection("MongoDB"));
            services.Configure<JwtSettings>(Configuration.GetSection("Jwt"));

            // ─── MongoDB ─────────────────────────────────────────────────────
            services.AddSingleton<MongoDbContext>();

            // ─── JWT Authentication ──────────────────────────────────────────
            var jwtSecret = Configuration["Jwt:Secret"]
                ?? throw new InvalidOperationException("JWT Secret is not configured");

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ClockSkew = TimeSpan.Zero
                    };
                });

            // ─── Controllers with JSON options ───────────────────────────────
            services.AddMvc()
                .SetCompatibilityVersion(CompatibilityVersion.Version_2_2)
                .AddJsonOptions(options =>
                {
                    options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
                    options.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
                    options.SerializerSettings.Converters.Add(new StringEnumConverter(new CamelCaseNamingStrategy()));
                });

            // ─── CORS ────────────────────────────────────────────────────────
            var allowedOrigins = Configuration["AllowedOrigins"] ?? "*";
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    if (allowedOrigins == "*")
                        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
                    else
                        policy.WithOrigins(allowedOrigins.Split(','))
                              .AllowAnyMethod()
                              .AllowAnyHeader();
                });
            });

            // ─── Swagger ─────────────────────────────────────────────────────
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "AllTrackIn API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new List<string>()
                    }
                });
            });
        }

        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            // ─── Global error handling ────────────────────────────────────────
            app.UseExceptionHandler(errApp =>
            {
                errApp.Run(async context =>
                {
                    context.Response.StatusCode = 500;
                    context.Response.ContentType = "application/json";
                    var feature = context.Features.Get<IExceptionHandlerFeature>();
                    var error = feature?.Error;
                    var json = JsonConvert.SerializeObject(new { error = error?.Message ?? "Internal Server Error" });
                    await context.Response.WriteAsync(json);
                });
            });

            // ─── Swagger UI as start page ─────────────────────────────────────
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "AllTrackIn API v1");
                c.RoutePrefix = string.Empty;
            });

            app.UseHttpsRedirection();
            app.UseCors();
            app.UseAuthentication();
            app.UseMvc();
        }
    }
}
