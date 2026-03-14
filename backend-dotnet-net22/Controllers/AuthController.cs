using AllTrackIn.Api.Configuration;
using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly BaseService<User> _users;
        private readonly JwtSettings _jwt;

        public AuthController(MongoDbContext db, IOptions<JwtSettings> jwt)
        {
            _users = new BaseService<User>(db.Users);
            _jwt = jwt.Value;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { error = "Email, name and password are required" });

            var email = req.Email.Trim().ToLowerInvariant();
            var existing = await _users.FindOneAsync(Builders<User>.Filter.Eq(u => u.Email, email));
            if (existing != null) return Conflict(new { error = "Email already registered" });

            var user = await _users.CreateAsync(new User
            {
                Email = email,
                Name = req.Name.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12)
            });

            var token = MakeToken(user);
            return StatusCode(201, new { token, user = new { id = user.Id, user.Email, user.Name } });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Email and password are required" });

            var email = req.Email.Trim().ToLowerInvariant();
            var user = await _users.FindOneAsync(Builders<User>.Filter.Eq(u => u.Email, email));
            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Unauthorized(new { error = "Invalid email or password" });

            var token = MakeToken(user);
            return Ok(new { token, user = new { id = user.Id, user.Email, user.Name } });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userId = User.GetUserId();
            var user = await _users.FindByIdAsync(userId);
            if (user == null) return NotFound(new { error = "User not found" });
            return Ok(new { id = user.Id, user.Email, user.Name });
        }

        private string MakeToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(_jwt.ExpiryDays),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class RegisterRequest
    {
        public string Email { get; set; }
        public string Name { get; set; }
        public string Password { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}
